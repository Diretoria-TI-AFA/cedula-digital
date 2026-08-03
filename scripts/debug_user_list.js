import PocketBase from 'pocketbase';
const PB_URL = 'https://cedula.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';
const pb = new PocketBase(PB_URL);

async function main() {
  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
  const res = await pb.collection('users').getFullList();
  console.log('Total de registros no PB:', res.length);
  
  const roleCounts = {};
  const noNum = [];

  res.forEach(u => {
    roleCounts[u.role || 'sem_role'] = (roleCounts[u.role || 'sem_role'] || 0) + 1;
    if (!u.cadetNumber) noNum.push(u);
  });

  console.log('Contagem por Role:', roleCounts);
  console.log('Cadastros sem cadetNumber:', noNum.length);

  // Amostra de usuários sem cadetNumber ou duplicados por warName
  if (noNum.length > 0) {
    console.log('Amostra de registros sem número de ordem:');
    noNum.slice(0, 10).forEach(u => console.log(` - ID: ${u.id}, Email: ${u.email}, Name: ${u.name}, WarName: ${u.warName}, Role: ${u.role}`));
  }

  // Agrupar por warName
  const warNameMap = new Map();
  res.forEach(u => {
    const w = (u.warName || u.name || '').trim().toUpperCase();
    if (w) {
      if (!warNameMap.has(w)) warNameMap.set(w, []);
      warNameMap.get(w).push(u);
    }
  });

  let warDuplicates = 0;
  warNameMap.forEach((list, w) => {
    if (list.length > 1) {
      warDuplicates += list.length - 1;
      console.log(`Duplicata por Nome de Guerra [${w}]: ${list.length} registros`);
      list.forEach(item => console.log(`   ➔ ID: ${item.id}, Num: ${item.cadetNumber}, Email: ${item.email}`));
    }
  });

  console.log('Total de duplicatas por Nome de Guerra:', warDuplicates);
}

main().catch(err => console.error(err));
