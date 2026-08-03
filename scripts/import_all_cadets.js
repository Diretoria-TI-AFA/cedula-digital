import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const PB_URL = 'https://cedula.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function generateInstitutionalEmail(warName, fullName, cadetNumber, existingEmailsSet) {
  const cleanWarName = String(warName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const prepositions = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'del']);
  const words = String(fullName || warName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0 && !prepositions.has(w.toLowerCase()));

  const initials = words.map(w => w[0].toLowerCase()).join('');

  let baseEmail = `tp.${cleanWarName}${initials}@fab.mil.br`;
  
  if (!existingEmailsSet.has(baseEmail)) {
    existingEmailsSet.add(baseEmail);
    return baseEmail;
  }

  const cleanNum = String(cadetNumber || '').replace(/[^0-9]/g, '');
  let disEmail = `tp.${cleanWarName}${initials}${cleanNum}@fab.mil.br`;
  
  let counter = 2;
  while (existingEmailsSet.has(disEmail)) {
    disEmail = `tp.${cleanWarName}${initials}${counter}@fab.mil.br`;
    counter++;
  }

  existingEmailsSet.add(disEmail);
  return disEmail;
}

async function main() {
  console.log('🔑 Tentando autenticar com PocketBase (com intervalo seguro de 45s)...');
  
  let authenticated = false;
  let attempt = 1;

  while (!authenticated) {
    try {
      await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
      authenticated = true;
    } catch (e) {
      console.warn(`  ⚠️ Tentativa ${attempt} bloqueada por rate-limit. Aguardando 45 segundos para liberar o PocketHost...`);
      attempt++;
      await delay(45000);
    }
  }

  console.log('✅ Admin Autenticado com Sucesso!');

  const excelPath = path.join(process.cwd(), 'CédulAthos 2k26.xlsx');
  const fileBuffer = fs.readFileSync(excelPath);
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });
  const bdJson = XLSX.utils.sheet_to_json(wb.Sheets['BANCO DE DADOS']);

  console.log(`📊 Total no BANCO DE DADOS: ${bdJson.length} cadetes.`);

  // Obter lista atual de usuários
  let existingUsers = [];
  try {
    let page = 1;
    let res = await pb.collection('users').getList(page, 200);
    existingUsers = existingUsers.concat(res.items);

    while (res.page < res.totalPages) {
      page++;
      await delay(150);
      res = await pb.collection('users').getList(page, 200);
      existingUsers = existingUsers.concat(res.items);
    }
  } catch (e) {
    console.warn('Aviso ao consultar usuários:', e.message);
  }

  console.log(`🔎 Total cadastrado atualmente no PocketBase: ${existingUsers.length}`);

  const existingNumMap = new Map();
  const existingEmailsSet = new Set();

  existingUsers.forEach(u => {
    if (u.cadetNumber) existingNumMap.set(u.cadetNumber, u);
    if (u.email) existingEmailsSet.add(u.email.toLowerCase());
  });

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  // Lotes de 10 cadetes com pausa de 200ms
  const batchSize = 10;
  for (let i = 0; i < bdJson.length; i += batchSize) {
    const chunk = bdJson.slice(i, i + batchSize);

    await Promise.all(chunk.map(async (row) => {
      const num = row['NÚMERO'] || row['NUMERO'] || row['Numero'];
      const warName = row['NOME DE GUERRA'] || row['NOME'] || row['Nome de Guerra'];
      const fullName = row['Nome completo'] || row['NOME COMPLETO'] || warName;
      const squad = row['Esquadrão'] || row['ESQUADRÃO'] || 'Athos';
      const cpf = row['CPF'] ? String(row['CPF']) : '';
      const phone = row['TELEFONE'] ? String(row['TELEFONE']) : '';

      if (!num || !warName) return;

      const cadetNumber = String(num).trim();
      const cleanWarName = String(warName).trim().toUpperCase();
      const cleanNum = cadetNumber.replace(/[^a-zA-Z0-9]/g, '');

      const existingUser = existingNumMap.get(cadetNumber);

      if (existingUser) {
        const instEmail = existingUser.email.includes('@fab.mil.br')
          ? existingUser.email
          : generateInstitutionalEmail(warName, fullName, cadetNumber, existingEmailsSet);

        try {
          await pb.collection('users').update(existingUser.id, {
            email: instEmail,
            name: String(fullName),
            warName: cleanWarName,
            cadetNumber,
            squadron: String(squad),
            cpf,
            phone,
          });
          updatedCount++;
        } catch {
          errorCount++;
        }
      } else {
        const instEmail = generateInstitutionalEmail(warName, fullName, cadetNumber, existingEmailsSet);
        const username = `c_${cleanNum}_${Math.random().toString(36).substring(2, 6)}`;

        try {
          const created = await pb.collection('users').create({
            username,
            email: instEmail,
            name: String(fullName),
            warName: cleanWarName,
            cadetNumber,
            squadron: String(squad),
            role: 'cadete',
            cpf,
            phone,
            password: 'Password123!',
            passwordConfirm: 'Password123!',
          });
          existingNumMap.set(cadetNumber, created);
          createdCount++;
        } catch {
          errorCount++;
        }
      }
    }));

    if ((i + batchSize) % 50 === 0 || i + batchSize >= bdJson.length) {
      console.log(`  ⏱️ Processados ${Math.min(i + batchSize, bdJson.length)} de ${bdJson.length} cadetes...`);
    }
    await delay(200);
  }

  let totalFinal = 0;
  try {
    const resFinal = await pb.collection('users').getList(1, 1);
    totalFinal = resFinal.totalItems;
  } catch {}

  console.log(`\n🎉 Processamento Concluído com Sucesso!`);
  console.log(`  - Novos Cadetes Criados: ${createdCount}`);
  console.log(`  - Cadetes Atualizados: ${updatedCount}`);
  console.log(`  - Erros: ${errorCount}`);
  console.log(`  - Total Final de Usuários no PocketBase: ${totalFinal}`);
}

main().catch(err => {
  console.error('❌ Erro no script:', err);
  process.exit(1);
});
