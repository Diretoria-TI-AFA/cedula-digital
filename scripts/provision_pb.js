import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const PB_URL = 'https://cedula.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);

// Função para gerar o e-mail institucional oficial: tp.NOMEDEGUERRA+INICIAIS@fab.mil.br
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
  console.log('🚀 Iniciando atualização de e-mails institucionais no PocketBase:', PB_URL);

  // 1. Autenticar como Admin / Superuser
  try {
    await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
  } catch (e1) {
    try {
      await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
    } catch (e2) {
      console.error('❌ Falha na autenticação Admin:', e2);
      process.exit(1);
    }
  }

  console.log('✅ Autenticado com sucesso como Admin!');

  // 2. Ler CédulAthos 2k26.xlsx e atualizar e-mails de todos os cadetes
  const excelPath = path.join(process.cwd(), 'CédulAthos 2k26.xlsx');
  if (!fs.existsSync(excelPath)) {
    console.error('❌ Arquivo CédulAthos 2k26.xlsx não encontrado.');
    process.exit(1);
  }

  console.log('📊 Lendo CédulAthos 2k26.xlsx...');
  const fileBuffer = fs.readFileSync(excelPath);
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });

  if (wb.Sheets['BANCO DE DADOS']) {
    const bdJson = XLSX.utils.sheet_to_json(wb.Sheets['BANCO DE DADOS']);
    console.log(`  Processando ${bdJson.length} cadetes do Efetivo...`);

    let updatedCount = 0;
    let createdCount = 0;

    for (const row of bdJson) {
      const num = row['NÚMERO'] || row['NUMERO'] || row['Numero'];
      const warName = row['NOME DE GUERRA'] || row['NOME'] || row['Nome de Guerra'];
      const fullName = row['Nome completo'] || row['NOME COMPLETO'] || warName;
      const squad = row['Esquadrão'] || row['ESQUADRÃO'] || 'Athos';
      const cpf = row['CPF'] ? String(row['CPF']) : '';
      const phone = row['TELEFONE'] ? String(row['TELEFONE']) : '';

      if (num && warName) {
        const formattedNum = String(num).padStart(5, '0');
        const cleanWarName = String(warName).toUpperCase();
        const instEmail = generateInstitutionalEmail(warName, fullName);

        try {
          // Buscar usuário pelo cadetNumber ou pelo nome de guerra
          const existing = await pb.collection('users').getFirstListItem(`cadetNumber="${formattedNum}" || warName="${cleanWarName}"`);
          if (existing) {
            await pb.collection('users').update(existing.id, {
              email: instEmail,
              name: String(fullName),
              warName: cleanWarName,
              cadetNumber: formattedNum,
              squadron: String(squad),
              cpf,
              phone,
            });
            updatedCount++;
          }
        } catch {
          // Se não existir, criar novo
          try {
            await pb.collection('users').create({
              username: `cadete.${formattedNum.replace('/', '')}`,
              email: instEmail,
              name: String(fullName),
              warName: cleanWarName,
              cadetNumber: formattedNum,
              squadron: String(squad),
              role: 'cadete',
              cpf,
              phone,
              password: 'Password123!',
              passwordConfirm: 'Password123!',
            });
            createdCount++;
          } catch (cErr) {
            // Ignorar se já existir erro de duplicata de username
          }
        }
      }
    }

    console.log(`✅ Concluído! ${updatedCount} cadetes tiveram seus e-mails atualizados para o padrão tp.NOMEDEGUERRA+INICIAIS@fab.mil.br.`);
    if (createdCount > 0) {
      console.log(`✅ ${createdCount} novos cadetes foram criados.`);
    }
  }

  // 3. Exemplo de E-mails Gerados para Confirmação
  console.log('\nExemplos de E-mails Institucionais Importados:');
  console.log(' - Tiago Barroso Da Silva ➔', generateInstitutionalEmail('Tiago Barroso', 'Tiago Barroso Da Silva'));
  console.log(' - Lucas Moro Bof ➔', generateInstitutionalEmail('MORO', 'Lucas Moro Bof'));
  console.log(' - Fernando Santos ➔', generateInstitutionalEmail('FERNANDO', 'Fernando Santos'));

  console.log('\n🎉 Sincronização de e-mails concluída no PocketBase real!');
}

main().catch(err => {
  console.error('❌ Erro no provisionamento:', err);
  process.exit(1);
});
