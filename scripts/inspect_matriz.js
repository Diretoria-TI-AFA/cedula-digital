import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'CÉDULA MATRIZ- CLUBES - BD.csv');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split(/\r?\n/);
  console.log(`📊 Total de linhas em CÉDULA MATRIZ- CLUBES - BD.csv: ${lines.length}`);
  console.log('Cabeçalhos:', lines[0]);
  console.log('Linha 1:', lines[1]);
  console.log('Linha 2:', lines[2]);
} else {
  console.log('❌ Arquivo CÉDULA MATRIZ- CLUBES - BD.csv não encontrado');
}
