import PocketBase from 'pocketbase';

const PB_URL = 'https://cedula-scaer.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);

async function main() {
  console.log('🔄 Autenticando como Admin...');
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
    console.log('✅ Autenticado com sucesso!');
  } catch (error) {
    console.error('❌ Falha na autenticação do admin:', error.message);
    process.exit(1);
  }

  console.log('\n📦 Atualizando coleção event_companies para ser pública como o restante do sistema...');

  try {
    // String vazia "" significa público no PocketBase v0.22+
    const authRule = "";

    await pb.collections.update('event_companies', {
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
    });
    console.log('✅ Coleção event_companies atualizada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao atualizar coleção:', error.message);
    if (error.response) {
      console.error(JSON.stringify(error.response, null, 2));
    }
  }
}

main();
