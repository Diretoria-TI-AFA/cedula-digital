import PocketBase from 'pocketbase';

const PB_URL = 'https://cedula-scaer.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);

async function main() {
  console.log('🔗 Vinculando Presidentes de Clubes aos IDs Reais no PocketBase:', PB_URL);

  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
  console.log('✅ Admin Autenticado!');

  const clubs = await pb.collection('clubs').getFullList();
  const users = await pb.collection('users').getFullList();

  console.log(`Clubes encontrados no banco (${clubs.length}):`);
  clubs.forEach(c => console.log(`  - [${c.id}] ${c.name}`));

  let updatedCount = 0;

  for (const user of users) {
    if (user.role === 'presidente' || user.email.startsWith('scaer')) {
      // Tentar encontrar o clube correspondente
      const userText = (user.warName || user.name || user.email).toUpperCase();

      const matchingClub = clubs.find(c => {
        const clubNameUpper = c.name.toUpperCase();
        return (
          userText.includes(clubNameUpper) ||
          user.email.toUpperCase().includes(clubNameUpper.replace(/\s+/g, ''))
        );
      });

      if (matchingClub) {
        try {
          await pb.collection('users').update(user.id, {
            clubId: matchingClub.id,
            warName: matchingClub.name.toUpperCase(),
            role: 'presidente',
          });
          console.log(`  ✅ Usuário [${user.email}] (${user.warName}) vinculado ao clube [${matchingClub.name}] (ID: ${matchingClub.id})`);
          updatedCount++;
        } catch (e) {
          console.warn(`  ⚠️ Erro ao atualizar [${user.email}]:`, e.message);
        }
      } else {
        console.log(`  ℹ️ Nenhum clube correspondente para [${user.email}] (${user.warName})`);
      }
    }
  }

  console.log(`\n🎉 Vinculação concluída! Total de presidentes atualizados: ${updatedCount}`);
}

main().catch(err => console.error('❌ Erro:', err));
