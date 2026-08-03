import fs from 'fs';
import path from 'path';

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

function main() {
  console.log('🔄 Gerando dados estáticos de Contador e Repasse...');

  // 1. Processar CONTADOR.csv
  const contadorPath = path.join(process.cwd(), 'CédulAthos 2k26 - CONTADOR.csv');
  const contadorContent = fs.readFileSync(contadorPath, 'utf-8');
  const contadorLines = contadorContent.trim().split(/\r?\n/);

  const contadorData = [];
  for (let i = 1; i < contadorLines.length; i++) {
    const row = parseCSVLine(contadorLines[i]);
    if (row.length < 4) continue;

    const rawNum = row[0] || '';
    const warName = row[1] || '';
    const fullName = row[2] || warName;
    const cpf = row[3] || '';
    const totalAmount = parseCurrency(row[4] || '0');

    if (!warName && !rawNum) continue;

    const cleanNum = rawNum.replace(/[^0-9]/g, '');
    const cadetNumber = cleanNum.length === 5 ? `${cleanNum.slice(0, 2)}/${cleanNum.slice(2)}` : rawNum;

    contadorData.push({
      id: `cnt_${i}`,
      number: cadetNumber,
      warName: warName.toUpperCase(),
      fullName: fullName,
      cpf: cpf,
      totalAmount: totalAmount,
      billingPeriod: '2026-08',
    });
  }

  // 2. Processar REPASSE.csv
  const repassePath = path.join(process.cwd(), 'CédulAthos 2k26 - REPASSE.csv');
  const repasseContent = fs.readFileSync(repassePath, 'utf-8');
  const repasseLines = repasseContent.trim().split(/\r?\n/);

  const repasseData = [];
  for (let i = 1; i < repasseLines.length; i++) {
    const row = parseCSVLine(repasseLines[i]);
    if (row.length < 2) continue;

    const valStr = row[0] || '';
    const clubName = row[1] || '';

    if (!clubName || clubName.toLowerCase().startsWith('sum')) continue;

    const amount = parseCurrency(valStr);
    if (amount <= 0) continue;

    repasseData.push({
      id: `rep_${i}`,
      clubName: clubName.toUpperCase(),
      amount: amount,
      billingPeriod: '2026-08',
      category: clubName.includes('COMAFA') ? 'Diretoria / Esquadrão' : 'Clube / Serviço',
    });
  }

  // Garantir diretório src/data/
  const dataDir = path.join(process.cwd(), 'src', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(path.join(dataDir, 'contador_data.json'), JSON.stringify(contadorData, null, 2));
  fs.writeFileSync(path.join(dataDir, 'repasse_data.json'), JSON.stringify(repasseData, null, 2));

  console.log(`✅ ${contadorData.length} registros salvos em src/data/contador_data.json`);
  console.log(`✅ ${repasseData.length} itens de repasse salvos em src/data/repasse_data.json`);
}

main();
