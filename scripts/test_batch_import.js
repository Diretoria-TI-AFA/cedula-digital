import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';

const PB_URL = 'https://cedula-scaer.pockethost.io';
const ADMIN_EMAIL = 'diretoriati.afa@gmail.com';
const ADMIN_PASS = 'Athos23!';

const pb = new PocketBase(PB_URL);

async function main() {
  console.log('⚡ Testando importação em massa com Superuser no PocketBase:', PB_URL);
  
  const authData = await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
  console.log('✅ Admin Autenticado via _superusers! Token:', authData.token.substring(0, 15) + '...');

  const csvPath = path.join(process.cwd(), 'CédulAthos 2k26 - Lançamentos.csv');
  const text = fs.readFileSync(csvPath, 'utf-8');
  const lines = text.trim().split(/\r?\n/);
  console.log(`📊 Total de linhas em Lançamentos.csv: ${lines.length}`);
}

main().catch(err => console.error('Erro:', err));
