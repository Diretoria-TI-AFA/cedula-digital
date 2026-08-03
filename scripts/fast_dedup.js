import PocketBase from 'pocketbase';

const PB_URL = 'https://cedula.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Iniciando desduplicação rápida de usuários...');

  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
  console.log('✅ Admin Autenticado!');

  let page = 1;
  let allUsers = [];
  let res = await pb.collection('users').getList(page, 200);
  allUsers = allUsers.concat(res.items);

  while (res.page < res.totalPages) {
    page++;
    res = await pb.collection('users').getList(page, 200);
    allUsers = allUsers.concat(res.items);
  }

  console.log(`🔎 Total obtido do PocketBase: ${allUsers.length} usuários.`);

  // Agrupar por Nome de Guerra / Nome Completo
  const nameMap = new Map();
  allUsers.forEach(u => {
    if (u.email === ADMIN_EMAIL || u.role === 'admin') return;
    const nameKey = String(u.name || u.warName || '').trim().toUpperCase();
    if (!nameKey) return;

    if (!nameMap.has(nameKey)) nameMap.set(nameKey, []);
    nameMap.get(nameKey).push(u);
  });

  const idsToDelete = [];
  nameMap.forEach((userList, nameKey) => {
    if (userList.length > 1) {
      // Ordenar: manter o que tem cadetNumber ou email sem números extras
      userList.sort((a, b) => {
        const aHasNum = a.cadetNumber ? 1 : 0;
        const bHasNum = b.cadetNumber ? 1 : 0;
        if (aHasNum !== bHasNum) return bHasNum - aHasNum;

        const aClean = a.email && !/\d{4,}/.test(a.email) ? 1 : 0;
        const bClean = b.email && !/\d{4,}/.test(b.email) ? 1 : 0;
        if (aClean !== bClean) return bClean - aClean;

        return new Date(b.updated).getTime() - new Date(a.updated).getTime();
      });

      const master = userList[0];
      const duplicates = userList.slice(1);

      duplicates.forEach(d => idsToDelete.push(d.id));
    }
  });

  console.log(`🧹 Grupos com duplicatas encontrados. Total a deletar: ${idsToDelete.length}`);

  let deleted = 0;
  for (const id of idsToDelete) {
    try {
      await pb.collection('users').delete(id);
      deleted++;
      if (deleted % 20 === 0 || deleted === idsToDelete.length) {
        console.log(`  ⏱️ Deletados ${deleted} de ${idsToDelete.length} duplicados...`);
      }
      await delay(25);
    } catch (e) {
      console.warn(`Erro ao deletar ID ${id}:`, e.message);
    }
  }

  const finalCheck = await pb.collection('users').getList(1, 1);
  console.log(`\n🎉 Desduplicação concluída com sucesso!`);
  console.log(`  - Duplicados removidos: ${deleted}`);
  console.log(`  - TOTAL FINAL DE USUÁRIOS NO POCKETBASE: ${finalCheck.totalItems}`);
}

main().catch(err => console.error('❌ Erro:', err));
