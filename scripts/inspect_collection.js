import PocketBase from 'pocketbase';

const PB_URL = 'https://cedula-scaer.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);

async function main() {
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
  const coll = await pb.collections.getOne('event_companies');
  console.log(JSON.stringify(coll, null, 2));
}
main();
