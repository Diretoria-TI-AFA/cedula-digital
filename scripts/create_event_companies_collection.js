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

  console.log('\n📦 Verificando/criando coleção event_companies...');
  
  try {
    // Tenta buscar a coleção
    await pb.collections.getOne('event_companies');
    console.log('✅ A coleção event_companies já existe. Deletando para recriar com as regras corretas...');
    await pb.collections.delete('event_companies');
  } catch (err) {
    console.log('Coleção não existe, procedendo com a criação...');
  }

  try {
    // Regra que permite leitura/criação/edição/deleção APENAS se o usuário estiver autenticado
    const authRule = '@request.auth.id != ""';

    await pb.collections.create({
      name: 'event_companies',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'products', type: 'json', required: true },
      ],
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
    });
    console.log('✅ Coleção event_companies criada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar coleção:', error.message);
    if (error.response) {
      console.error(JSON.stringify(error.response, null, 2));
    }
  }
}

main();
