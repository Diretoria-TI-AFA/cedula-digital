const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\felip\\Desktop\\cedula-digital\\CédulAthos 2k26.xlsx';
const workbook = XLSX.readFile(excelPath);

console.log('=== BANCO DE DADOS (Sample 5 rows) ===');
const bdSheet = workbook.Sheets['BANCO DE DADOS'];
const bdJson = XLSX.utils.sheet_to_json(bdSheet);
console.log(bdJson.slice(0, 5));

console.log('\n=== ExtratoMensal (Sample 5 rows) ===');
const emSheet = workbook.Sheets['ExtratoMensal'];
const emJson = XLSX.utils.sheet_to_json(emSheet);
console.log(emJson.slice(0, 5));

console.log('\n=== REPASSE (Sample 5 rows) ===');
const repSheet = workbook.Sheets['REPASSE'];
const repJson = XLSX.utils.sheet_to_json(repSheet);
console.log(repJson.slice(0, 5));

console.log('\n=== PENDÊNCIAS (Sample 5 rows) ===');
const penSheet = workbook.Sheets['PENDÊNCIAS'];
const penJson = XLSX.utils.sheet_to_json(penSheet);
console.log(penJson.slice(0, 5));
