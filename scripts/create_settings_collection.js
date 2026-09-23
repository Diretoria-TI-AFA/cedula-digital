import PocketBase from 'pocketbase';

const PB_URL = 'https://cedula-scaer.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);

async function main() {
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
  
  try {
    await pb.collections.create({
      name: 'system_settings',
      type: 'base',
      fields: [
        {
          name: 'key',
          type: 'text',
          required: true,
        },
        {
          name: 'value',
          type: 'text',
          required: true,
        }
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    });
    console.log('✅ Coleção system_settings criada corretamente!');

    // Inserir registro inicial
    await pb.collection('system_settings').create({
      key: 'current_event_name',
      value: 'Evento Atual'
    });
    console.log('✅ Registro current_event_name criado!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) console.error(JSON.stringify(error.response, null, 2));
  }
}

main();
