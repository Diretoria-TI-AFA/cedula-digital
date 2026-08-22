import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { Expense, User } from '../types';

export interface GeneratePdfOptions {
  period: string;
  director: User;
  expenses: Expense[];
  totalAmount: number;
  totalLaunches: number;
  totalCadets: number;
  verificationHash: string;
  reportType: 'synthetic' | 'detailed'; // Sintético (Soma por Cadete) ou Detalhado
}

// Helper para gerar SHA-256 Hash
export async function generateSHA256(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateDirectorPDFReport(options: GeneratePdfOptions): Promise<{ pdfBlob: Blob; pdfUrl: string; hash: string }> {
  const { period, director, expenses, totalAmount, totalLaunches, totalCadets, verificationHash, reportType } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const [year, month] = period.split('-');
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthTitle = `${monthNames[parseInt(month, 10) - 1] || month} / ${year}`;
  const nowFormatted = new Date().toLocaleString('pt-BR');
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- CABEÇALHO INSTITUCIONAL DA CÉDULA ---
  doc.setFillColor(15, 23, 42); // Navy Dark
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Faixa Dourada
  doc.setFillColor(217, 119, 6); // Gold #D97706
  doc.rect(0, 41, pageWidth, 1.5, 'F');

  // Textos do Cabeçalho
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SOCIEDADE ACADÊMICA DOS CADETES DA AERONÁUTICA (SCAER)', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  const modeTitle = reportType === 'synthetic' ? 'RELATÓRIO SINTÉTICO (SOMATÓRIO POR CADETE)' : 'RELATÓRIO DETALHADO DE LANÇAMENTOS';
  doc.text(`DIRETORIA DE CÉDULA - ${modeTitle} - PERÍODO: ${monthTitle.toUpperCase()}`, 14, 23);

  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Diretor Responsável: ${director.cadetNumber} ${director.warName} (${director.name})`, 14, 31);
  doc.text(`Data da Emissão: ${nowFormatted}`, 14, 36);

  // --- RESUMO EXECUTIVO ---
  let currentY = 50;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, currentY, 56, 22, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL CONSOLIDADO CÉDULA', 18, currentY + 6);
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, currentY + 16);

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(77, currentY, 56, 22, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL DE REGISTROS', 81, currentY + 6);
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalLaunches} lançamentos`, 81, currentY + 16);

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(140, currentY, 56, 22, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('CADETES ENVOLVIDOS', 144, currentY + 6);
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalCadets} cadetes`, 144, currentY + 16);

  currentY += 30;

  // --- CONTEÚDO DA TABELA DEPENDENDO DO TIPO (SINTÉTICO OU DETALHADO) ---
  if (reportType === 'synthetic') {
    // Agrupar gastos por Cadete (Número e Nome)
    const cadetTotalsMap: { [key: string]: { name: string; number: string; total: number; count: number } } = {};

    expenses.forEach((exp) => {
      const cadetName = exp.userName || exp.cadetName || 'Cadete';
      const key = `${exp.cadetNumber}_${cadetName}`;
      if (!cadetTotalsMap[key]) {
        cadetTotalsMap[key] = {
          number: exp.cadetNumber,
          name: cadetName,
          total: 0,
          count: 0
        };
      }
      cadetTotalsMap[key].total += exp.amount;
      cadetTotalsMap[key].count += 1;
    });

    const cadetTotalsList = Object.values(cadetTotalsMap);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Somatório Consolidado de Cédula por Cadete', 14, currentY);

    currentY += 5;

    // Cabeçalho da Tabela Sintética
    doc.setFillColor(30, 41, 59);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Número e Nome do Cadete (XX/XXX NOME)', 18, currentY + 5.5);
    doc.text('Qtd. Lançamentos', 120, currentY + 5.5);
    doc.text('Valor Total Cédula', 165, currentY + 5.5);

    currentY += 8;

    cadetTotalsList.forEach((cItem, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, currentY, 182, 7, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`${cItem.number} ${cItem.name}`, 18, currentY + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.text(`${cItem.count} itens`, 120, currentY + 4.8);

      doc.setFont('helvetica', 'bold');
      doc.text(`R$ ${cItem.total.toFixed(2)}`, 165, currentY + 4.8);

      currentY += 7;
    });
  } else {
    // Tabela Detalhada
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Detalhamento Completo de Lançamentos na Cédula', 14, currentY);

    currentY += 5;

    doc.setFillColor(30, 41, 59);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Cadete (XX/XXX FULANO)', 18, currentY + 5.5);
    doc.text('Clube Emissor', 65, currentY + 5.5);
    doc.text('Descrição do Gasto', 105, currentY + 5.5);
    doc.text('Valor', 175, currentY + 5.5);

    currentY += 8;

    const displayExps = expenses.slice(0, 14);
    displayExps.forEach((exp, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, currentY, 182, 7, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`${exp.cadetNumber} ${exp.userName}`, 18, currentY + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.text(exp.clubName.substring(0, 22), 65, currentY + 4.8);
      doc.text(exp.description.substring(0, 32), 105, currentY + 4.8);

      doc.setFont('helvetica', 'bold');
      doc.text(`R$ ${exp.amount.toFixed(2)}`, 175, currentY + 4.8);

      currentY += 7;
    });
  }

  // --- SEÇÃO DE ASSINATURA DIGITAL E SELO OFICIAL DA DIRETORIA DE CÉDULA ---
  const stampY = 205;

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(14, stampY, 182, 70, 4, 4, 'FD');

  const qrDataUrl = await QRCode.toDataURL(`https://scaer.fab.mil.br/verify?hash=${verificationHash}`, {
    margin: 1,
    width: 120,
    color: { dark: '#0F172A', light: '#FFFFFF' }
  });

  doc.addImage(qrDataUrl, 'PNG', 18, stampY + 8, 30, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('VALIDAÇÃO DE AUTENTICIDADE E ASSINATURA DIGITAL', 52, stampY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Este documento oficial foi assinado eletronicamente pela Diretoria de Cédula da SCAER.', 52, stampY + 20);
  doc.text('Escaneie o QR Code ao lado para checar a integridade do selo no portal institucional.', 52, stampY + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 58, 138);
  doc.text(`HASH SHA-256: ${verificationHash}`, 52, stampY + 31);

  // --- SELO/CARIMBO OFICIAL VISUAL DA DIRETORIA DE CÉDULA ---
  const sealCenterX = 168;
  const sealCenterY = stampY + 24;

  doc.setDrawColor(217, 119, 6); // Dourado
  doc.setLineWidth(0.8);
  doc.circle(sealCenterX, sealCenterY, 15, 'S');

  doc.setDrawColor(30, 58, 138); // Azul Marinho
  doc.setLineWidth(0.4);
  doc.circle(sealCenterX, sealCenterY, 13.2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(217, 119, 6);
  doc.text('★ DIRETORIA DE CÉDULA ★', sealCenterX - 12.5, sealCenterY - 6);

  doc.setFontSize(6);
  doc.setTextColor(15, 23, 42);
  doc.text('SCAER', sealCenterX - 4.5, sealCenterY - 1);
  doc.text('AUTÊNTICO', sealCenterX - 7.5, sealCenterY + 3);

  doc.setFontSize(4.5);
  doc.setTextColor(16, 185, 129);
  doc.text('ASSINADO DIGITAL', sealCenterX - 9, sealCenterY + 7);

  // Assinatura do Diretor
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(52, stampY + 54, 140, stampY + 54);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${director.cadetNumber} ${director.warName}`.toUpperCase(), 52, stampY + 59);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Diretor de Cédula - Sociedade Acadêmica dos Cadetes da Aeronáutica`, 52, stampY + 63);

  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);

  return {
    pdfBlob,
    pdfUrl,
    hash: verificationHash
  };
}
