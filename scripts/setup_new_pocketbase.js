import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';

const PB_URL = 'https://cedula-scaer.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para gerar o e-mail Zimbra Institucional do Cadete
function generateInstitutionalEmail(warName, fullName) {
  const cleanWarName = String(warName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const prepositions = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'del']);
  const words = String(fullName || warName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0 && !prepositions.has(w.toLowerCase()));

  const initials = words.map(w => w[0].toLowerCase()).join('');

  return `tp.${cleanWarName}${initials}@fab.mil.br`;
}

// Parser simples para CSV
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, index) => {
      row[h] = values[index] || '';
    });
    results.push(row);
  }

  return results;
}

// Clubes oficiais e suas mensalidades
const OFFICIAL_CLUBS = [
  { name: 'GERAES', monthlyFee: 20.0, category: 'Investimentos', email: 'scaergeraes@gmail.com' },
  { name: 'INVESTIMENTO', monthlyFee: 5.0, category: 'Finanças', email: 'scaerinvestimento@gmail.com' },
  { name: 'LITERATURA', monthlyFee: 10.0, category: 'Cultura', email: 'scaerliteratura@gmail.com' },
  { name: 'MUSCULAÇÃO', monthlyFee: 20.0, category: 'Esportes', email: 'scaermusculação@gmail.com' },
  { name: 'CTNN', monthlyFee: 15.0, category: 'Tradições', email: 'scaerctnn@gmail.com' },
  { name: 'ESCALADA', monthlyFee: 15.0, category: 'Aventura', email: 'scaerescalada@gmail.com' },
  { name: 'CSAV', monthlyFee: 20.0, category: 'Aviação', email: 'scaercsav@gmail.com' },
  { name: 'JIU JITSU', monthlyFee: 10.0, category: 'Lutas', email: 'scaerjiujitsu@gmail.com' },
  { name: 'MÚSICA', monthlyFee: 10.0, category: 'Arte', email: 'scaermúsica@gmail.com' },
  { name: 'CTG', monthlyFee: 15.0, category: 'Tradições', email: 'scaerctg@gmail.com' },
  { name: 'COCAFA', monthlyFee: 10.0, category: 'Fotografia', email: 'scaercocafa@gmail.com' },
  { name: 'NEAG', monthlyFee: 10.0, category: 'Estudos', email: 'scaerneag@gmail.com' },
  { name: 'NEGEC', monthlyFee: 7.0, category: 'Estratégia', email: 'scaernegec@gmail.com' },
  { name: 'AIRSOFT', monthlyFee: 10.0, category: 'Tático', email: 'scaerairsoft@gmail.com' },
];

async function main() {
  console.log('🚀 Configurando novo servidor PocketBase:', PB_URL);

  // 1. Autenticação Admin
  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
  console.log('✅ Admin Autenticado no novo servidor!');

  // 2. Configurar Schemas das Coleções no PocketBase
  console.log('⚙️ Atualizando schemas de coleções no PocketBase...');
  
  // Garantir campos na coleção `users`
  try {
    const usersCollection = await pb.collections.getOne('users');
    const existingFieldNames = new Set((usersCollection.fields || []).map(f => f.name));

    const fieldsToAdd = [
      { name: 'warName', type: 'text', required: false },
      { name: 'cadetNumber', type: 'text', required: false },
      { name: 'squadron', type: 'text', required: false },
      { name: 'role', type: 'text', required: false },
      { name: 'cpf', type: 'text', required: false },
      { name: 'phone', type: 'text', required: false },
      { name: 'email1', type: 'text', required: false },
      { name: 'email2', type: 'text', required: false },
      { name: 'clubId', type: 'text', required: false },
    ];

    let fieldsUpdated = false;
    fieldsToAdd.forEach(f => {
      if (!existingFieldNames.has(f.name)) {
        usersCollection.fields.push(f);
        fieldsUpdated = true;
      }
    });

    usersCollection.listRule = '';
    usersCollection.viewRule = '';
    usersCollection.createRule = '';
    usersCollection.updateRule = '';
    await pb.collections.update('users', usersCollection);
    console.log('  ✅ Schema de `users` atualizado com todos os campos do CSV!');
  } catch (e) {
    console.warn('Aviso ao atualizar schema de users:', e.message);
  }

  // Coleção `clubs`
  try {
    await pb.collections.getOne('clubs');
  } catch {
    await pb.collections.create({
      name: 'clubs',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'monthlyFee', type: 'number', required: true },
        { name: 'presidentId', type: 'text', required: false },
        { name: 'category', type: 'text', required: false },
        { name: 'description', type: 'text', required: false },
      ],
    });
    console.log('  ✅ Coleção `clubs` criada!');
  }

  // Coleção `club_memberships`
  try {
    await pb.collections.getOne('club_memberships');
  } catch {
    await pb.collections.create({
      name: 'club_memberships',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      fields: [
        { name: 'userId', type: 'text', required: true },
        { name: 'clubId', type: 'text', required: true },
        { name: 'userName', type: 'text', required: false },
        { name: 'cadetNumber', type: 'text', required: false },
        { name: 'squadron', type: 'text', required: false },
        { name: 'status', type: 'text', required: true },
        { name: 'requestedAt', type: 'text', required: false },
        { name: 'approvedAt', type: 'text', required: false },
      ],
    });
    console.log('  ✅ Coleção `club_memberships` criada!');
  }

  // Coleção `expenses`
  try {
    await pb.collections.getOne('expenses');
  } catch {
    await pb.collections.create({
      name: 'expenses',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      fields: [
        { name: 'userId', type: 'text', required: true },
        { name: 'userName', type: 'text', required: false },
        { name: 'cadetNumber', type: 'text', required: false },
        { name: 'clubId', type: 'text', required: true },
        { name: 'clubName', type: 'text', required: false },
        { name: 'description', type: 'text', required: true },
        { name: 'amount', type: 'number', required: true },
        { name: 'category', type: 'text', required: false },
        { name: 'billingPeriod', type: 'text', required: true },
        { name: 'launchType', type: 'text', required: false },
        { name: 'createdBy', type: 'text', required: false },
        { name: 'createdByName', type: 'text', required: false },
        { name: 'isNonMemberEvent', type: 'bool', required: false },
      ],
    });
    console.log('  ✅ Coleção `expenses` criada!');
  }

  // Seed dos 14 Clubes Oficiais
  console.log('🌱 Cadastrando os 14 Clubes da SCAER...');
  const clubMap = new Map();

  for (const club of OFFICIAL_CLUBS) {
    try {
      const existing = await pb.collection('clubs').getFirstListItem(`name="${club.name}"`);
      clubMap.set(club.name.toUpperCase(), existing.id);
    } catch {
      const created = await pb.collection('clubs').create({
        name: club.name,
        monthlyFee: club.monthlyFee,
        category: club.category,
        description: `Clube Acadêmico ${club.name} da SCAER`,
      });
      clubMap.set(club.name.toUpperCase(), created.id);
    }
  }

  // 3. Ler e Importar Dados do CSV `Dados_login_cedula - Página1.csv`
  const csvPath = path.join(process.cwd(), 'Dados_login_cedula - Página1.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Arquivo CSV não encontrado:', csvPath);
    process.exit(1);
  }

  console.log('📊 Lendo dados do arquivo CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const csvData = parseCSV(csvContent);

  console.log(`  Total de registros encontrados no CSV: ${csvData.length}`);

  const existingUsers = await pb.collection('users').getFullList();
  const existingEmailMap = new Map(existingUsers.map(u => [u.email.toLowerCase(), u]));

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];

    const rawNum = row['numero'] || '';
    const warName = row['nome de guerra'] || row['nome'] || '';
    const squadron = row['esquadrao'] || '';
    const fullName = row['nome completo'] || warName;
    const cpf = row['cpf'] || '';
    const phone = row['telefone'] || '';
    const email1 = row['email1'] || '';
    const email2 = row['email2'] || '';
    const rawRole = (row['role'] || 'cadete').toLowerCase();
    const csvPass = row['senha'] || 'Password123!';

    if (!warName) continue;

    let targetEmail = '';
    let formattedCadetNumber = '';
    let clubId = '';

    if (rawRole === 'presidente' || !rawNum) {
      // Exceção solicitada pelo usuário: perfis presidentes usam email1 do CSV (ex: scaergeraes@gmail.com)
      targetEmail = email1 ? email1.trim().toLowerCase() : `${warName.toLowerCase().replace(/\s+/g, '')}@scaer.com`;
      const foundClubId = clubMap.get(warName.trim().toUpperCase());
      if (foundClubId) clubId = foundClubId;
    } else {
      // Cadete ou Diretor: utilizar o e-mail Zimbra institucional tp.nomedeguerra+iniciais@fab.mil.br
      targetEmail = generateInstitutionalEmail(warName, fullName);

      // Formatar número de ordem XX/XXX
      const cleanDigits = rawNum.replace(/[^0-9]/g, '');
      if (cleanDigits.length === 5) {
        formattedCadetNumber = `${cleanDigits.slice(0, 2)}/${cleanDigits.slice(2)}`;
      } else {
        formattedCadetNumber = rawNum;
      }
    }

    const cleanNumId = rawNum.replace(/[^a-zA-Z0-9]/g, '') || Math.random().toString(36).substring(2, 6);
    const username = `u_${cleanNumId}_${i + 1}`;

    const existingUser = existingEmailMap.get(targetEmail.toLowerCase());

    const userPayload = {
      username,
      email: targetEmail,
      emailVisibility: true,
      name: fullName,
      warName: warName.toUpperCase(),
      cadetNumber: formattedCadetNumber,
      squadron,
      role: rawRole,
      cpf,
      phone,
      email1,
      email2,
      clubId,
      password: csvPass,
      passwordConfirm: csvPass,
    };

    await delay(35);

    if (existingUser) {
      try {
        await pb.collection('users').update(existingUser.id, {
          name: fullName,
          warName: warName.toUpperCase(),
          cadetNumber: formattedCadetNumber,
          squadron,
          role: rawRole,
          cpf,
          phone,
          email1,
          email2,
          clubId,
        });
        updatedCount++;
      } catch (uErr) {
        errorCount++;
      }
    } else {
      try {
        const created = await pb.collection('users').create(userPayload);
        existingEmailMap.set(targetEmail.toLowerCase(), created);
        createdCount++;
      } catch (cErr) {
        try {
          userPayload.username = `u_${cleanNumId}_${Date.now()}`;
          const created2 = await pb.collection('users').create(userPayload);
          existingEmailMap.set(targetEmail.toLowerCase(), created2);
          createdCount++;
        } catch {
          errorCount++;
        }
      }
    }

    if ((i + 1) % 50 === 0 || i === csvData.length - 1) {
      console.log(`  ⏱️ Processados ${i + 1} de ${csvData.length} registros... (Criados: ${createdCount}, Atualizados: ${updatedCount})`);
    }
  }

  const finalUsers = await pb.collection('users').getFullList();

  console.log(`\n🎉 Configuração e Importação Concluídas com Sucesso Total no Novo Servidor!`);
  console.log(`  - Novos Usuários Criados: ${createdCount}`);
  console.log(`  - Usuários Atualizados: ${updatedCount}`);
  console.log(`  - Erros: ${errorCount}`);
  console.log(`  - TOTAL FINAL DE USUÁRIOS EM https://cedula-scaer.pockethost.io: ${finalUsers.length}`);
}

main().catch(err => {
  console.error('❌ Erro durante o provisionamento:', err);
  process.exit(1);
});
