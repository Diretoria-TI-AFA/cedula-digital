import PocketBase from 'pocketbase';

const PB_URL = 'https://cedula-scaer.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);

async function main() {
  console.log('Testing connection to new PocketBase server:', PB_URL);
  
  try {
    await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
    console.log('✅ Admin Auth successful via _superusers!');
  } catch (e1) {
    try {
      await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
      console.log('✅ Admin Auth successful via pb.admins!');
    } catch (e2) {
      console.log('⚠️ Superuser auth failed. Creating initial superuser or testing registration...');
      console.log('Error 1:', e1?.message);
      console.log('Error 2:', e2?.message);
    }
  }
}

main();
