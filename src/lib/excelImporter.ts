import * as XLSX from 'xlsx';
import type { CadetRosterItem, PendingExemption, DesligadoItem, Expense } from '../types';

export interface ParsedExcelData {
  roster: CadetRosterItem[];
  expenses: Omit<Expense, 'id' | 'createdAt' | 'status'>[];
  exemptions: PendingExemption[];
  desligados: DesligadoItem[];
}

export function generateInstitutionalEmail(warName: string, fullName: string): string {
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

export async function parseCedulaExcelFile(fileOrBuffer: File | ArrayBuffer, currentManagerId: string, currentManagerName: string): Promise<ParsedExcelData> {
  let arrayBuffer: ArrayBuffer;

  if (fileOrBuffer instanceof File) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    arrayBuffer = fileOrBuffer;
  }

  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const roster: CadetRosterItem[] = [];
  const expenses: Omit<Expense, 'id' | 'createdAt' | 'status'>[] = [];
  const exemptions: PendingExemption[] = [];
  const desligados: DesligadoItem[] = [];

  // 1. Processar BANCO DE DADOS (Efetivo Total)
  if (workbook.Sheets['BANCO DE DADOS']) {
    const bdSheet = workbook.Sheets['BANCO DE DADOS'];
    const bdJson: any[] = XLSX.utils.sheet_to_json(bdSheet);

    bdJson.forEach((row, idx) => {
      const num = row['NÚMERO'] || row['NUMERO'] || row['Numero'];
      const warName = row['NOME DE GUERRA'] || row['NOME'] || row['Nome de Guerra'];
      const fullName = row['Nome completo'] || row['NOME COMPLETO'] || warName;
      const squad = row['Esquadrão'] || row['ESQUADRÃO'] || 'Athos';
      const cpf = row['CPF'] ? String(row['CPF']) : '';
      const phone = row['TELEFONE'] ? String(row['TELEFONE']) : '';

      if (num && warName) {
        const instEmail = generateInstitutionalEmail(warName, fullName);

        roster.push({
          id: `r_imp_${idx}_${num}`,
          number: String(num),
          warName: String(warName).toUpperCase(),
          fullName: String(fullName),
          squadron: String(squad),
          cpf,
          phone,
          email: instEmail,
        });
      }
    });
  }

  // 2. Processar ExtratoMensal ou Lançamentos
  const launchesSheet = workbook.Sheets['Lançamentos'] || workbook.Sheets['ExtratoMensal'];
  if (launchesSheet) {
    const json: any[] = XLSX.utils.sheet_to_json(launchesSheet);

    json.forEach((row) => {
      const month = row['Mês'] || row['Mes'] || row['Nome do Mês'] || '2026-07';
      const num = row['Número'] || row['numero'] || row['Numero'];
      const name = row['Nome'] || row['NOME'] || row['Nome de Guerra'] || 'CADETE';
      const amountVal = row['Valor'] || row[' Valor '] || row['VALOR'];
      const clubName = row['Clube'] || row['CLUBE'] || 'SCAER';
      const desc = row['Observação'] || row['Descrição'] || row['OBSERVAÇÃO'] || 'Mensalidade/Consumo';

      const amount = parseFloat(String(amountVal).replace(',', '.'));

      if (num && !isNaN(amount) && amount > 0) {
        let billingPeriod = '2026-07';
        const mStr = String(month).toLowerCase();
        if (mStr.includes('jan')) billingPeriod = '2026-01';
        else if (mStr.includes('fev')) billingPeriod = '2026-02';
        else if (mStr.includes('mar')) billingPeriod = '2026-03';
        else if (mStr.includes('abr')) billingPeriod = '2026-04';
        else if (mStr.includes('mai')) billingPeriod = '2026-05';
        else if (mStr.includes('jun')) billingPeriod = '2026-06';
        else if (mStr.includes('jul')) billingPeriod = '2026-07';
        else if (mStr.includes('ago')) billingPeriod = '2026-08';
        else if (mStr.includes('set')) billingPeriod = '2026-09';
        else if (mStr.includes('out')) billingPeriod = '2026-10';
        else if (mStr.includes('nov')) billingPeriod = '2026-11';
        else if (mStr.includes('dez')) billingPeriod = '2026-12';

        expenses.push({
          userId: `usr_${num}`,
          userName: String(name).toUpperCase(),
          cadetNumber: String(num),
          clubId: `clb_${String(clubName).toLowerCase().replace(/\s+/g, '_')}`,
          clubName: String(clubName),
          description: String(desc),
          amount,
          category: String(desc).toLowerCase().includes('mensalidade') ? 'Mensalidade' : 'Consumo',
          billingPeriod,
          launchType: 'csv',
          createdBy: currentManagerId,
          createdByName: currentManagerName,
        });
      }
    });
  }

  // 3. Processar PENDÊNCIAS
  if (workbook.Sheets['PENDÊNCIAS']) {
    const pSheet = workbook.Sheets['PENDÊNCIAS'];
    const pJson: any[] = XLSX.utils.sheet_to_json(pSheet, { header: 1 });

    pJson.forEach((row, idx) => {
      if (Array.isArray(row) && row.length >= 2) {
        const cadet = String(row[0]).trim();
        const rule = String(row[1]).trim();
        if (cadet && rule) {
          exemptions.push({
            id: `p_imp_${idx}`,
            cadetName: cadet,
            description: rule,
            period: '2026-07',
            status: 'active',
          });
        }
      }
    });
  }

  // 4. Processar Desligados
  if (workbook.Sheets['Desligados']) {
    const dSheet = workbook.Sheets['Desligados'];
    const dJson: any[] = XLSX.utils.sheet_to_json(dSheet);

    dJson.forEach((row, idx) => {
      const month = row['Mês'] || '2026-08';
      const num = row['Número'] || '';
      const name = row['Nome'] || '';
      const amountVal = row['Valor'] || 0;
      const club = row['Clube'] || 'SCAER';
      const desc = row['Descrição'] || 'Cobrança Pendente Desligado';

      const amount = parseFloat(String(amountVal).replace(',', '.'));

      if (num && !isNaN(amount)) {
        desligados.push({
          id: `d_imp_${idx}`,
          period: String(month),
          cadetNumber: String(num),
          warName: String(name).toUpperCase(),
          amount,
          clubName: String(club),
          description: String(desc),
        });
      }
    });
  }

  return {
    roster,
    expenses,
    exemptions,
    desligados,
  };
}
