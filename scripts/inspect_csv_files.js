import fs from 'fs';
import path from 'path';

function inspectCSV(fileName, maxRows = 5) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Arquivo não encontrado: ${fileName}`);
    return;
  }

  const text = fs.readFileSync(filePath, 'utf-8');
  const lines = text.trim().split(/\r?\n/);
  console.log(`\n========================================`);
  console.log(`📄 Arquivo: ${fileName} (${lines.length} linhas)`);
  console.log(`========================================`);
  console.log(`Cabeçalhos:`, lines[0]);
  for (let i = 1; i <= Math.min(maxRows, lines.length - 1); i++) {
    console.log(`Linha ${i}:`, lines[i]);
  }
}

inspectCSV('CédulAthos 2k26 - REPASSE.csv', 10);
inspectCSV('CédulAthos 2k26 - CONTADOR.csv', 10);
inspectCSV('CédulAthos 2k26 - Lançamentos.csv', 5);
