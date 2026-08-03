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
  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

  const excelPath = path.join(process.cwd(), 'CédulAthos 2k26.xlsx');
  const fileBuffer = fs.readFileSync(excelPath);
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });
  const bdJson = XLSX.utils.sheet_to_json(wb.Sheets['BANCO DE DADOS']);

  let allUsers = [];
  let page = 1;
  let res = await pb.collection('users').getList(page, 200);
  allUsers = allUsers.concat(res.items);

  while (res.page < res.totalPages) {
    page++;
    await delay(50);
    res = await pb.collection('users').getList(page, 200);
    allUsers = allUsers.concat(res.items);
  }

  console.log(`🔎 Total no PocketBase: ${allUsers.length}`);

  // Normalizar número de ordem (apenas números)
  const normMap = new Map(); // normNum -> User[]
  const rawNumMap = new Map();

  allUsers.forEach(u => {
    const raw = u.cadetNumber || '';
    const norm = raw.replace(/[^0-9]/g, '');

    if (norm) {
      if (!normMap.has(norm)) normMap.set(norm, []);
      normMap.get(norm).push(u);
    }
  });

  const idsToDelete = new Set();
  let duplicateGroups = 0;

  normMap.forEach((userList, norm) => {
    if (userList.length > 1) {
      duplicateGroups++;
      // Manter o mais recentemente atualizado ou com e-mail institucional
      userList.sort((a, b) => {
        const aHasInst = a.email.includes('@fab.mil.br') ? 1 : 0;
        const bHasInst = b.email.includes('@fab.mil.br') ? 1 : 0;
        if (aHasInst !== bHasInst) return bHasInst - aHasInst;
        return new Date(b.updated).getTime() - new Date(a.updated).getTime();
      });

      const keeper = userList[0];
      for (let i = 1; i < userList.length; i++) {
        idsToDelete.add(userList[i].id);
      }
    }
  });

  console.log(`📊 Grupos de cadetes duplicados encontrados (normalizados): ${duplicateGroups}`);
  console.log(`🧹 Total de IDs duplicados marcados para deletar: ${idsToDelete.size}`);

  // Excluir duplicados
  let deleted = 0;
  for (const id of idsToDelete) {
    try {
      await pb.collection('users').delete(id);
      deleted++;
      await delay(40);
    } catch (err) {
      console.error(`Erro ao deletar ${id}:`, err.message);
    }
  }

  const finalRes = await pb.collection('users').getList(1, 1);
  console.log(`\n🎉 Exclusão concluída! Total final exato no PocketBase: ${finalRes.totalItems}`);
}

main().catch(err => console.error(err));
