import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const PB_URL = 'https://cedula.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Iniciando análise de desduplicação dos usuários no PocketBase...');

  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
  console.log('✅ Admin Autenticado com Sucesso!');

  // 1. Ler os 623 cadetes válidos da planilha original CédulAthos 2k26.xlsx
  const excelPath = path.join(process.cwd(), 'CédulAthos 2k26.xlsx');
  const fileBuffer = fs.readFileSync(excelPath);
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });
  const bdJson = XLSX.utils.sheet_to_json(wb.Sheets['BANCO DE DADOS']);

  console.log(`📊 Total de cadetes oficiais na planilha BANCO DE DADOS: ${bdJson.length}`);

  const officialCadetNumbers = new Set();
  bdJson.forEach(row => {
    const num = row['NÚMERO'] || row['NUMERO'] || row['Numero'];
    if (num) {
      officialCadetNumbers.add(String(num).trim());
    }
  });

  // 2. Buscar TODOS os usuários cadastrados no PocketBase
  let allUsers = [];
  let page = 1;
  let res = await pb.collection('users').getList(page, 200);
  allUsers = allUsers.concat(res.items);

  while (res.page < res.totalPages) {
    page++;
    await delay(100);
    res = await pb.collection('users').getList(page, 200);
    allUsers = allUsers.concat(res.items);
  }

  console.log(`🔎 Total cadastrado atualmente no PocketBase: ${allUsers.length} usuários.`);

  // 3. Mapear duplicatas por cadetNumber ou por email
  const cadetNumberMap = new Map(); // cadetNumber -> User[]
  const emailMap = new Map();       // email -> User[]
  const orphanUsers = [];           // Usuários que não pertencem ao efetivo oficial (exceto admin/diretor)

  allUsers.forEach(user => {
    // Ignorar superuser/admin principal se existir
    if (user.email === ADMIN_EMAIL || user.role === 'admin') return;

    if (user.cadetNumber) {
      const cNum = String(user.cadetNumber).trim();
      if (!cadetNumberMap.has(cNum)) cadetNumberMap.set(cNum, []);
      cadetNumberMap.get(cNum).push(user);
    }

    if (user.email) {
      const email = String(user.email).trim().toLowerCase();
      if (!emailMap.has(email)) emailMap.set(email, []);
      emailMap.get(email).push(user);
    }
  });

  const idsToDelete = new Set();

  // Deduplicar por Número de Ordem (cadetNumber)
  cadetNumberMap.forEach((userList, cNum) => {
    if (userList.length > 1) {
      console.log(`  ⚠️ Encontradas ${userList.length} duplicatas para o Cadete Número ${cNum}:`);
      // Ordenar por data de atualização ou ID para manter o mais completo/recente
      userList.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
      
      const keeper = userList[0];
      console.log(`     ✅ Mantendo: ID ${keeper.id} - ${keeper.cadetNumber} ${keeper.warName} (${keeper.email})`);

      for (let i = 1; i < userList.length; i++) {
        const dup = userList[i];
        console.log(`     ❌ Marcando para exclusão: ID ${dup.id} - ${dup.cadetNumber} ${dup.warName} (${dup.email})`);
        idsToDelete.add(dup.id);
      }
    }
  });

  // Deduplicar por E-mail Institucional
  emailMap.forEach((userList, email) => {
    if (userList.length > 1) {
      userList.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
      const keeper = userList[0];
      for (let i = 1; i < userList.length; i++) {
        const dup = userList[i];
        if (dup.id !== keeper.id) {
          idsToDelete.add(dup.id);
        }
      }
    }
  });

  // Identificar usuários órfãos (cadetNumber não existe no BANCO DE DADOS oficial)
  allUsers.forEach(user => {
    if (user.email === ADMIN_EMAIL || user.role === 'admin') return;
    if (user.cadetNumber && !officialCadetNumbers.has(String(user.cadetNumber).trim())) {
      // Se não for o Diretor Fernando (23/001)
      if (!user.cadetNumber.includes('23/001') && !user.warName.includes('FERNANDO')) {
        orphanUsers.push(user);
      }
    }
  });

  if (orphanUsers.length > 0) {
    console.log(`\n  ⚠️ Encontrados ${orphanUsers.length} usuários testes/órfãos que não estão na planilha oficial:`);
    orphanUsers.forEach(u => {
      console.log(`     ❌ Marcando para exclusão: ID ${u.id} - ${u.cadetNumber || 'Sem N°'} ${u.warName || u.name} (${u.email})`);
      idsToDelete.add(u.id);
    });
  }

  console.log(`\n🧹 Total de registros duplicados/órfãos a serem removidos: ${idsToDelete.size}`);

  // Executar exclusão dos duplicados
  let deletedCount = 0;
  let errorCount = 0;

  for (const id of idsToDelete) {
    try {
      await pb.collection('users').delete(id);
      deletedCount++;
      await delay(50);
    } catch (err) {
      console.error(`Erro ao deletar ID ${id}:`, err?.message || err);
      errorCount++;
    }
  }

  // Contagem final no PocketBase
  const finalRes = await pb.collection('users').getList(1, 1);

  console.log(`\n🎉 Limpeza e Desduplicação Concluídas!`);
  console.log(`  - Registros Duplicados Removidos: ${deletedCount}`);
  console.log(`  - Erros ao Deletar: ${errorCount}`);
  console.log(`  - TOTAL FINAL EXATO DE USUÁRIOS NO POCKETBASE: ${finalRes.totalItems}`);
}

main().catch(err => {
  console.error('❌ Erro no script de desduplicação:', err);
  process.exit(1);
});
