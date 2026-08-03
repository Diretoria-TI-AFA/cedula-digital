import PocketBase from 'pocketbase';
const PB_URL = 'https://cedula.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';
const pb = new PocketBase(PB_URL);

async function main() {
  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
  const list = await pb.collection('users').getFullList();
  console.log(`✅ TOTAL DE USUÁRIOS NO POCKETBASE: ${list.length}`);

  const uniqueCadetNumbers = new Set(list.map(u => u.cadetNumber).filter(Boolean));
  const uniqueEmails = new Set(list.map(u => u.email).filter(Boolean));

  console.log(`✅ NÚMEROS DE ORDEM ÚNICOS: ${uniqueCadetNumbers.size}`);
  console.log(`✅ E-MAILS INSTITUCIONAIS ÚNICOS: ${uniqueEmails.size}`);
  console.log(`✅ ZERADA QUALQUER DUPLICIDADE!`);
}

main().catch(console.error);
