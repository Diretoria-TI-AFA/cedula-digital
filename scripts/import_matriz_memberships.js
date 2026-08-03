import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';

const PB_URL = 'https://cedula-scaer.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

async function main() {
  console.log('🚀 Iniciando importação da Matriz de Adesões aos Clubes no PocketBase:', PB_URL);

  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
  console.log('✅ Admin Autenticado!');

  const clubs = await pb.collection('clubs').getFullList();
  const users = await pb.collection('users').getFullList();

  const clubMap = new Map();
  clubs.forEach(c => clubMap.set(c.name.trim().toUpperCase(), c));

  const userMap = new Map();
  users.forEach(u => {
    const numKey = (u.cadetNumber || '').replace(/[^0-9]/g, '');
    if (numKey) userMap.set(numKey, u);
    if (u.warName) userMap.set(u.warName.trim().toUpperCase(), u);
  });

  const existingMems = await pb.collection('club_memberships').getFullList();
  const existingSet = new Set(existingMems.map(m => `${m.userId}:${m.clubId}`));

  const csvPath = path.join(process.cwd(), 'CÉDULA MATRIZ- CLUBES - BD.csv');
  const text = fs.readFileSync(csvPath, 'utf-8');
  const lines = text.trim().split(/\r?\n/);

  console.log(`📊 Total de linhas em CÉDULA MATRIZ: ${lines.length}`);

  let createdCount = 0;
  let skippedCount = 0;

  const validMemberships = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 2) continue;

    const rawCadetText = row[0] || '';
    const rawClubName = (row[1] || row[3] || '').trim().toUpperCase();
    const rawNum = row[10] || row[14] || '';

    if (!rawClubName) continue;

    const cleanNum = rawNum.replace(/[^0-9]/g, '') || rawCadetText.replace(/[^0-9]/g, '');
    const cadetWarName = rawCadetText.replace(/^[0-9\/\s]+/, '').trim().toUpperCase();

    const matchedUser = userMap.get(cleanNum) || userMap.get(cadetWarName);
    const matchedClub = clubMap.get(rawClubName);

    if (!matchedUser || !matchedClub) continue;

    const key = `${matchedUser.id}:${matchedClub.id}`;
    if (existingSet.has(key)) {
      skippedCount++;
      continue;
    }

    existingSet.add(key);

    validMemberships.push({
      userId: matchedUser.id,
      userName: matchedUser.warName || matchedUser.name,
      cadetNumber: matchedUser.cadetNumber,
      squadron: matchedUser.squadron || 'Athos',
      clubId: matchedClub.id,
      clubName: matchedClub.name,
      status: 'approved',
      requestedAt: '2026-01-01',
      approvedAt: '2026-01-01',
      notes: 'Importação Matriz CédulAthos BD',
    });
  }

  console.log(`📋 Total de adesões inéditas válidas a criar: ${validMemberships.length}`);

  const BATCH_SIZE = 30;
  for (let i = 0; i < validMemberships.length; i += BATCH_SIZE) {
    const chunk = validMemberships.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map(m => pb.collection('club_memberships').create(m).then(() => createdCount++).catch(() => null))
    );
    await delay(30);

    if ((i + BATCH_SIZE) % 300 === 0 || i + BATCH_SIZE >= validMemberships.length) {
      console.log(`  ⚡ Adesões criadas: ${createdCount} / ${validMemberships.length}`);
    }
  }

  const finalMems = await pb.collection('club_memberships').getFullList();
  console.log(`\n🎉 IMPORTAÇÃO DA MATRIZ CONCLUÍDA! Total de adesões ativas no banco: ${finalMems.length}`);
}

main().catch(err => console.error('❌ Erro:', err));
