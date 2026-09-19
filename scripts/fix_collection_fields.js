import PocketBase from 'pocketbase';

const PB_URL = 'https://cedula-scaer.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);

async function main() {
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
  
  try {
    // Delete the old one so we can recreate it properly with fields
    await pb.collections.delete('event_companies');
    console.log('Coleção antiga deletada.');
  } catch(e) {}

  try {
    await pb.collections.create({
      name: 'event_companies',
      type: 'base',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          presentable: true
        },
        {
          name: 'products',
          type: 'json',
          required: true
        }
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    });
    console.log('✅ Coleção event_companies criada corretamente com os campos (fields)!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) console.error(JSON.stringify(error.response, null, 2));
  }
}

main();
