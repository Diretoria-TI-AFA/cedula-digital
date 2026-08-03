import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const PB_URL = 'https://cedula.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function generateInstitutionalEmail(warName, fullName) {
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

  return `tp.${cleanWarName}${initials}@fab.mil.br`;
}

async function main() {
  console.log('🚀 Iniciando mesclagem inteligente e limpeza das 194 duplicatas no PocketBase...');

  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
  console.log('✅ Admin Autenticado com Sucesso!');

  // 1. Ler planilhas oficiais (BANCO DE DADOS com 623 cadetes)
  const excelPath = path.join(process.cwd(), 'CédulAthos 2k26.xlsx');
  const fileBuffer = fs.readFileSync(excelPath);
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });
  const bdJson = XLSX.utils.sheet_to_json(wb.Sheets['BANCO DE DADOS']);

  console.log(`📊 Total oficial na planilha BANCO DE DADOS: ${bdJson.length} cadetes.`);

  // Mapa oficial da planilha por número de ordem e nome completo
  const officialCadetsMap = new Map();
  bdJson.forEach(row => {
    const num = row['NÚMERO'] || row['NUMERO'] || row['Numero'];
    const warName = row['NOME DE GUERRA'] || row['NOME'] || row['Nome de Guerra'];
    const fullName = row['Nome completo'] || row['NOME COMPLETO'] || warName;
    const squad = row['Esquadrão'] || row['ESQUADRÃO'] || 'Athos';

    if (num && warName) {
      const cleanNum = String(num).trim();
      officialCadetsMap.set(cleanNum, {
        cadetNumber: cleanNum,
        warName: String(warName).toUpperCase(),
        fullName: String(fullName),
        squadron: String(squad),
        officialEmail: generateInstitutionalEmail(warName, fullName),
      });
    }
  });

  // 2. Obter TODOS os usuários atuais no PocketBase
  const allUsers = await pb.collection('users').getFullList();
  console.log(`🔎 Total cadastrado atualmente no PocketBase: ${allUsers.length} registros.`);

  // Agrupar usuários por Nome Completo ou Nome de Guerra
  const groupedByName = new Map();

  allUsers.forEach(u => {
    // Ignorar conta do Superuser Admin se estiver na lista
    if (u.email === ADMIN_EMAIL || u.role === 'admin') return;

    const key = String(u.name || u.warName || '').trim().toUpperCase();
    if (!key) return;

    if (!groupedByName.has(key)) groupedByName.set(key, []);
    groupedByName.get(key).push(u);
  });

  let deletedCount = 0;
  let updatedCount = 0;

  for (const [nameKey, records] of groupedByName.entries()) {
    if (records.length > 1) {
      // Ordenar: o registro com cadetNumber definido ou e-mail sem números aleatórios no final é o principal
      records.sort((a, b) => {
        const aHasNum = a.cadetNumber ? 1 : 0;
        const bHasNum = b.cadetNumber ? 1 : 0;
        if (aHasNum !== bHasNum) return bHasNum - aHasNum;

        const aCleanEmail = a.email && !/\d{4,}/.test(a.email) ? 1 : 0;
        const bCleanEmail = b.email && !/\d{4,}/.test(b.email) ? 1 : 0;
        if (aCleanEmail !== bCleanEmail) return bCleanEmail - aCleanEmail;

        return new Date(b.updated).getTime() - new Date(a.updated).getTime();
      });

      const master = records[0];
      const duplicates = records.slice(1);

      // Encontrar dados da planilha para preencher qualquer campo ausente no master
      const foundInOfficial = Array.from(officialCadetsMap.values()).find(
        c => c.fullName.toUpperCase() === nameKey || c.warName.toUpperCase() === nameKey
      );

      const targetNumber = master.cadetNumber || duplicates.find(d => d.cadetNumber)?.cadetNumber || foundInOfficial?.cadetNumber;
      const targetSquadron = master.squadron || duplicates.find(d => d.squadron)?.squadron || foundInOfficial?.squadron || 'Athos';
      const targetEmail = foundInOfficial ? foundInOfficial.officialEmail : master.email.replace(/\d{4,}/, '');

      // Atualizar o registro Master com dados completos e e-mail institucional limpo
      try {
        await pb.collection('users').update(master.id, {
          email: targetEmail,
          name: master.name || foundInOfficial?.fullName,
          warName: master.warName || foundInOfficial?.warName,
          cadetNumber: targetNumber,
          squadron: targetSquadron,
          role: 'cadete',
        });
        updatedCount++;
      } catch (uErr) {
        console.warn(`Aviso ao atualizar master ${master.id}:`, uErr.message);
      }

      // Deletar os duplicados
      for (const dup of duplicates) {
        try {
          await pb.collection('users').delete(dup.id);
          deletedCount++;
          await delay(30);
        } catch (dErr) {
          console.error(`Erro ao deletar duplicado ${dup.id}:`, dErr.message);
        }
      }
    } else {
      // Registro único: garantir que cadetNumber e email oficial estejam corretos
      const single = records[0];
      const foundInOfficial = Array.from(officialCadetsMap.values()).find(
        c => c.fullName.toUpperCase() === nameKey || c.warName.toUpperCase() === nameKey || (c.cadetNumber && c.cadetNumber === single.cadetNumber)
      );

      if (foundInOfficial && (!single.cadetNumber || !single.email.includes('@fab.mil.br'))) {
        try {
          await pb.collection('users').update(single.id, {
            email: foundInOfficial.officialEmail,
            cadetNumber: foundInOfficial.cadetNumber,
            warName: foundInOfficial.warName,
            name: foundInOfficial.fullName,
            squadron: foundInOfficial.squadron,
          });
          updatedCount++;
        } catch {}
      }
    }
  }

  // 3. Garantir que QUALQUER cadete da planilha oficial que ainda não esteja no PB seja criado
  const currentPBUsers = await pb.collection('users').getFullList();
  const currentNumsSet = new Set(currentPBUsers.map(u => String(u.cadetNumber).trim()));

  let missingCreated = 0;
  for (const [cNum, cData] of officialCadetsMap.entries()) {
    if (!currentNumsSet.has(cNum)) {
      const cleanNum = cNum.replace(/[^a-zA-Z0-9]/g, '');
      const username = `c_${cleanNum}_${Math.random().toString(36).substring(2, 6)}`;

      try {
        await pb.collection('users').create({
          username,
          email: cData.officialEmail,
          name: cData.fullName,
          warName: cData.warName,
          cadetNumber: cData.cadetNumber,
          squadron: cData.squadron,
          role: 'cadete',
          password: 'Password123!',
          passwordConfirm: 'Password123!',
        });
        missingCreated++;
        await delay(50);
      } catch (cErr) {
        console.error(`Erro ao criar cadete faltante ${cNum}:`, cErr.message);
      }
    }
  }

  const finalUsers = await pb.collection('users').getFullList();

  console.log(`\n🎉 Processo de Desduplicação e Ajuste Concluído!`);
  console.log(`  - Registros Duplicados Removidos: ${deletedCount}`);
  console.log(`  - Registros Atualizados/Formatados: ${updatedCount}`);
  console.log(`  - Cadetes Faltantes Criados: ${missingCreated}`);
  console.log(`  - TOTAL FINAL DE USUÁRIOS NO POCKETBASE: ${finalUsers.length}`);
}

main().catch(err => {
  console.error('❌ Erro no script:', err);
  process.exit(1);
});
