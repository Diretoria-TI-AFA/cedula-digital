const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\felip\\Desktop\\cedula-digital\\CédulAthos 2k26.xlsx';
const workbook = XLSX.readFile(excelPath);

console.log('--- SHEET NAMES ---');
console.log(workbook.SheetNames);

console.log('\n--- SHEET HEADERS & SAMPLE ROWS ---');
workbook.SheetNames.forEach((name) => {
  const sheet = workbook.Sheets[name];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\nSheet: "${name}" (Total Rows: ${json.length})`);
  if (json.length > 0) {
    console.log('  Row 0:', json[0]?.slice(0, 12));
    if (json.length > 1) console.log('  Row 1:', json[1]?.slice(0, 12));
    if (json.length > 2) console.log('  Row 2:', json[2]?.slice(0, 12));
    if (json.length > 3) console.log('  Row 3:', json[3]?.slice(0, 12));
  }
});
