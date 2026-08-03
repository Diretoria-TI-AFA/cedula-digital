import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';

const PB_URL = 'https://cedula-scaer.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const MONTH_MAP = {
  'JANEIRO': '2026-01',
  'FEVEREIRO': '2026-02',
  'MARCO': '2026-03',
  'MARÇO': '2026-03',
  'ABRIL': '2026-04',
  'MAIO': '2026-05',
  'JUNHO': '2026-06',
  'JULHO': '2026-07',
  'AGOSTO': '2026-08',
  'SETEMBRO': '2026-09',
  'OUTUBRO': '2026-10',
  'NOVEMBRO': '2026-11',
  'DEZEMBRO': '2026-12',
};

function parseCurrency(valStr) {
  if (!valStr) return 0;
  const clean = valStr
    .replace('R$', '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function parseCSVLine(line) {
  // Regex para tratar campos entre aspas com vírgulas
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
  console.log('🚀 Iniciando importação dos 50.437 lançamentos no PocketBase:', PB_URL);

  // Autenticação Admin Superuser para ignorar limites de requisição de cliente
  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
  console.log('✅ Admin Autenticado via _superusers com sucesso!');

  const csvPath = path.join(process.cwd(), 'CédulAthos 2k26 - Lançamentos.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Arquivo CSV de lançamentos não encontrado:', csvPath);
    process.exit(1);
  }

  console.log('📊 Lendo e processando arquivo CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split(/\r?\n/);

  console.log(`  Total de linhas lidas no arquivo: ${lines.length}`);

  // Mapear usuários cadastrados no banco para obter IDs e Nomes completos
  const users = await pb.collection('users').getFullList();
  const userMap = new Map();
  users.forEach((u) => {
    const numKey = (u.cadetNumber || '').replace(/[^0-9]/g, '');
    if (numKey) userMap.set(numKey, u);
    if (u.warName) userMap.set(u.warName.toUpperCase(), u);
  });

  // Mapear lançamentos existentes para prevenir duplicatas
  console.log('🔍 Mapeando lançamentos existentes no PocketBase...');
  const existingExpenses = await pb.collection('expenses').getFullList();
  const existingKeys = new Set(
    existingExpenses.map(e => `${e.billingPeriod}:${e.cadetNumber}:${e.description}:${e.amount}`)
  );
  console.log(`  Lançamentos já existentes no servidor: ${existingExpenses.length}`);

  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Processamento em lotes com concorrência otimizada
  const BATCH_SIZE = 25; // Requisições paralelas seguras
  const validPayloads = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 5) continue;

    const rawMonth = (row[0] || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const rawNum = row[1] || '';
    const rawName = row[2] || '';
    const rawAmountStr = row[3] || '0';
    const rawClub = row[4] || 'SCAER';
    const rawObs = row[5] || '';

    if (!rawName && !rawNum) continue;

    const period = MONTH_MAP[rawMonth] || '2026-07';
    const amount = parseCurrency(rawAmountStr);
    if (amount <= 0) continue;

    const cleanNumDigits = rawNum.replace(/[^0-9]/g, '');
    const matchedUser = userMap.get(cleanNumDigits) || userMap.get(rawName.toUpperCase());

    const cadetNumber = matchedUser?.cadetNumber || (cleanNumDigits ? `${cleanNumDigits.slice(0, 2)}/${cleanNumDigits.slice(2)}` : rawNum);
    const userName = matchedUser?.warName || rawName;
    const userId = matchedUser?.id || 'usr_cadet_import';

    const description = rawObs ? `${rawClub} - ${rawObs}` : rawClub;
    const category = rawObs.toUpperCase().includes('MENSALIDADE') ? 'Mensalidade' : 'Consumo';

    const uniqueKey = `${period}:${cadetNumber}:${description}:${amount}`;
    if (existingKeys.has(uniqueKey)) {
      skippedCount++;
      continue;
    }

    existingKeys.add(uniqueKey);

    validPayloads.push({
      userId,
      userName: userName.toUpperCase(),
      cadetNumber,
      clubId: 'clb_' + rawClub.toLowerCase().replace(/[^a-z0-9]/g, ''),
      clubName: rawClub.toUpperCase(),
      description,
      amount,
      category,
      billingPeriod: period,
      launchType: 'csv',
      createdBy: 'adm_import',
      createdByName: 'SISTEMA CÉDULATHOS 2026',
    });
  }

  console.log(`📋 Total de lançamentos inéditos prontos para envio: ${validPayloads.length}`);

  // Envio concorrente veloz em blocos de BATCH_SIZE
  for (let i = 0; i < validPayloads.length; i += BATCH_SIZE) {
    const chunk = validPayloads.slice(i, i + BATCH_SIZE);

    try {
      await Promise.all(
        chunk.map(payload =>
          pb.collection('expenses').create(payload).then(() => {
            createdCount++;
          }).catch(() => {
            errorCount++;
          })
        )
      );
    } catch {
      errorCount += chunk.length;
    }

    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= validPayloads.length) {
      const pct = Math.min(100, Math.floor(((i + chunk.length) / validPayloads.length) * 100));
      console.log(`  ⚡ Progresso de envio: ${pct}% (${createdCount} criados, ${skippedCount} duplicados ignorados)`);
    }

    await delay(30); // Pequena pausa para estabilidade do servidor
  }

  console.log(`\n🎉 IMPORTAÇÃO DAS 50 MIL LINHAS CONCLUÍDA COM SUCESSO!`);
  console.log(`  - Novos Lançamentos Criados: ${createdCount}`);
  console.log(`  - Duplicados Ignorados: ${skippedCount}`);
  console.log(`  - Erros: ${errorCount}`);
}

main().catch(err => {
  console.error('❌ Erro na importação:', err);
  process.exit(1);
});
