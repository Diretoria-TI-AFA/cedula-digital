import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const PB_URL = 'https://cedula.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

  const excelPath = path.join(process.cwd(), 'CédulAthos 2k26.xlsx');
  const fileBuffer = fs.readFileSync(excelPath);
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });
  const bdJson = XLSX.utils.sheet_to_json(wb.Sheets['BANCO DE DADOS']);

  const allUsers = await pb.collection('users').getFullList();
  console.log(`📊 Atualizando números de ordem nos ${allUsers.length} cadetes no PocketBase...`);

  let updated = 0;
  for (const user of allUsers) {
    if (user.email === ADMIN_EMAIL || user.role === 'admin') continue;

    // Buscar na planilha oficial pelo nome completo ou nome de guerra
    const match = bdJson.find(row => {
      const wName = String(row['NOME DE GUERRA'] || row['NOME'] || '').trim().toUpperCase();
      const fName = String(row['Nome completo'] || row['NOME COMPLETO'] || '').trim().toUpperCase();
      const uWName = String(user.warName || '').trim().toUpperCase();
      const uFName = String(user.name || '').trim().toUpperCase();

      return (wName && wName === uWName) || (fName && fName === uFName);
    });

    if (match) {
      const num = match['NÚMERO'] || match['NUMERO'] || match['Numero'];
      const squad = match['Esquadrão'] || match['ESQUADRÃO'] || 'Athos';

      if (num && (!user.cadetNumber || user.cadetNumber !== String(num).trim())) {
        try {
          await pb.collection('users').update(user.id, {
            cadetNumber: String(num).trim(),
            squadron: String(squad).trim(),
          });
          updated++;
          await delay(20);
        } catch (e) {
          console.warn(`Aviso ao atualizar ${user.id}:`, e.message);
        }
      }
    }
  }

  const finalCheck = await pb.collection('users').getFullList();
  const validNumbers = finalCheck.filter(u => u.cadetNumber).length;

  console.log(`\n🎉 Atualização de Números Concluída!`);
  console.log(`  - Cadetes com Números de Ordem Atualizados: ${updated}`);
  console.log(`  - Total de Cadetes com Número de Ordem Definido: ${validNumbers} de ${finalCheck.length}`);
}

main().catch(console.error);
