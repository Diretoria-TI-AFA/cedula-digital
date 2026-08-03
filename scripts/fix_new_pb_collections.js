import PocketBase from 'pocketbase';

const PB_URL = 'https://cedula-scaer.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);

async function main() {
  console.log('🔧 Garantindo coleções e vinculação de clubes no PocketBase:', PB_URL);

  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
  console.log('✅ Admin Autenticado!');

  // 1. Criar `director_reports`
  try {
    await pb.collections.getOne('director_reports');
    console.log('  ✅ Coleção `director_reports` já existe.');
  } catch {
    await pb.collections.create({
      name: 'director_reports',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'period', type: 'text', required: true },
        { name: 'reportType', type: 'text', required: false },
        { name: 'totalAmount', type: 'number', required: false },
        { name: 'totalLaunches', type: 'number', required: false },
        { name: 'totalCadets', type: 'number', required: false },
        { name: 'verificationHash', type: 'text', required: false },
        { name: 'issuedAt', type: 'text', required: false },
        { name: 'issuedBy', type: 'text', required: false },
        { name: 'directorName', type: 'text', required: false },
        { name: 'pdfUrl', type: 'text', required: false },
      ],
    });
    console.log('  ✅ Coleção `director_reports` criada com sucesso!');
  }

  // 2. Criar `exemptions`
  try {
    await pb.collections.getOne('exemptions');
  } catch {
    await pb.collections.create({
      name: 'exemptions',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      fields: [
        { name: 'cadetName', type: 'text', required: true },
        { name: 'cadetNumber', type: 'text', required: false },
        { name: 'description', type: 'text', required: false },
        { name: 'period', type: 'text', required: false },
        { name: 'status', type: 'text', required: false },
      ],
    });
    console.log('  ✅ Coleção `exemptions` criada!');
  }

  // 3. Criar `desligados`
  try {
    await pb.collections.getOne('desligados');
  } catch {
    await pb.collections.create({
      name: 'desligados',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      fields: [
        { name: 'period', type: 'text', required: false },
        { name: 'cadetNumber', type: 'text', required: false },
        { name: 'warName', type: 'text', required: false },
        { name: 'amount', type: 'number', required: false },
        { name: 'clubName', type: 'text', required: false },
        { name: 'description', type: 'text', required: false },
      ],
    });
    console.log('  ✅ Coleção `desligados` criada!');
  }

  // 4. Vincular `clubId` nos usuários com perfil `presidente`
  const clubs = await pb.collection('clubs').getFullList();
  const users = await pb.collection('users').getFullList();

  console.log(`🔗 Verificando vinculação de clubes para os ${users.length} usuários...`);

  let linkedCount = 0;
  for (const user of users) {
    if (user.role === 'presidente' || !user.clubId) {
      const matchClub = clubs.find(c => c.name.toUpperCase() === (user.warName || user.name || '').trim().toUpperCase());
      if (matchClub && user.clubId !== matchClub.id) {
        try {
          await pb.collection('users').update(user.id, {
            clubId: matchClub.id,
            role: 'presidente',
          });
          linkedCount++;
        } catch (e) {
          console.warn(`Aviso ao vincular clube para ${user.id}:`, e.message);
        }
      }
    }
  }

  console.log(`✅ ${linkedCount} perfis de presidentes foram vinculados aos seus respectivos clubes!`);
}

main().catch(err => console.error('❌ Erro:', err));
