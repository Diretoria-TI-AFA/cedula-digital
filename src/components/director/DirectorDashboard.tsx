import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import type { Club, ClubMembership, DirectorReport, Expense, User } from '../../types';
import { generateDirectorPDFReport, generateSHA256 } from '../../lib/pdfGenerator';
import { ReportVerificationModal } from './ReportVerificationModal';
import { QRCodeExpenseScanner } from '../common/QRCodeExpenseScanner';
import { LaunchExpenseModal } from '../scaer/LaunchExpenseModal';
import { BeautifulSealBadge } from './BeautifulSealBadge';
import contadorDataImport from '../../data/contador_data.json';
import repasseDataImport from '../../data/repasse_data.json';
import {
  FileCheck,
  Download,
  QrCode,
  Search,
  Building,
  Users,
  Receipt,
  FileSpreadsheet,
  FileText,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Filter,
  Calculator,
  DollarSign
} from 'lucide-react';
import { pb } from '../../lib/pocketbase';

interface DirectorDashboardProps {
  directorUser: User;
  expenses: Expense[];
  clubs: Club[];
  memberships: ClubMembership[];
  reports: DirectorReport[];
  onSaveReport: (report: Omit<DirectorReport, 'id'>) => Promise<DirectorReport>;
  theme?: 'dark' | 'light';
  onRefreshData?: () => void;
}

export const DirectorDashboard: React.FC<DirectorDashboardProps> = ({
  directorUser,
  expenses,
  clubs,
  memberships,
  reports,
  onSaveReport,
  theme = 'dark',
  onRefreshData,
}) => {
  const [directorSubTab, setDirectorSubTab] = useState<'audit' | 'contador' | 'repasse' | 'members'>('audit');

  // Filtros de Auditoria & Livro Razão
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-08');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClubFilter, setSelectedClubFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filtros do Contador e Repasse
  const [contadorSearchTerm, setContadorSearchTerm] = useState<string>('');
  const [contadorPage, setContadorPage] = useState<number>(1);

  // Filtros da Aba Sócios dos Clubes
  const [memberClubFilter, setMemberClubFilter] = useState<string>('all');
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [memberPage, setMemberPage] = useState<number>(1);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [showQrScanner, setShowQrScanner] = useState<boolean>(false);
  const [showLaunchModal, setShowLaunchModal] = useState<boolean>(false);
  const [scannedCadetInfo, setScannedCadetInfo] = useState<{ cadetNumber: string; warName?: string } | null>(null);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const isDark = theme === 'dark';

  // --- DADOS DO CONTADOR E REPASSE IMPORTADOS DA PLANILHA ---
  const contadorData = contadorDataImport as Array<{
    id: string;
    number: string;
    warName: string;
    fullName: string;
    cpf: string;
    totalAmount: number;
    billingPeriod: string;
  }>;

  const repasseData = repasseDataImport as Array<{
    id: string;
    clubName: string;
    amount: number;
    billingPeriod: string;
    category: string;
  }>;

  // Lançamentos do Período (Auditoria)
  const periodExpenses = expenses.filter((e) => selectedPeriod === 'all' || e.billingPeriod === selectedPeriod);
  
  const filteredExpenses = periodExpenses.filter((e) => {
    const matchesClub = selectedClubFilter === 'all' || e.clubId === selectedClubFilter;
    const matchesSearch =
      e.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.cadetNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.clubName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClub && matchesSearch;
  });

  const totalAmount = periodExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const uniqueCadetIds = new Set(periodExpenses.map((e) => e.userId));

  // --- FILTRAGEM DO CONTADOR ---
  const filteredContador = contadorData.filter((item) =>
    item.warName.toLowerCase().includes(contadorSearchTerm.toLowerCase()) ||
    item.number.toLowerCase().includes(contadorSearchTerm.toLowerCase()) ||
    item.fullName.toLowerCase().includes(contadorSearchTerm.toLowerCase()) ||
    item.cpf.includes(contadorSearchTerm)
  );
  const totalContadorAmount = filteredContador.reduce((acc, curr) => acc + curr.totalAmount, 0);

  // --- FILTRAGEM DO REPASSE ---
  const totalRepasseAmount = repasseData.reduce((acc, curr) => acc + curr.amount, 0);

  // --- FILTRAGEM DE SÓCIOS DOS CLUBES ---
  const activeMemberships = memberships.filter((m) => m.status === 'approved');

  const filteredMemberships = activeMemberships.filter((m) => {
    const matchesClub = memberClubFilter === 'all' || m.clubId === memberClubFilter;
    const matchesSearch =
      m.userName.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      m.cadetNumber.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      (m.squadron || '').toLowerCase().includes(memberSearchQuery.toLowerCase());
    return matchesClub && matchesSearch;
  });

  // Exportar Contador para XLSX
  const handleExportContadorXLSX = () => {
    const rows = filteredContador.map((item) => ({
      'Número de Ordem': item.number,
      'Nome de Guerra': item.warName,
      'Nome Completo': item.fullName,
      'CPF': item.cpf,
      'Valor Total Cédula (R$)': item.totalAmount.toFixed(2),
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contador');
    XLSX.writeFile(workbook, `Contador_SCAER_2026.xlsx`);
  };

  // Exportar Contador para PDF
  const handleExportContadorPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('DADOS DO CONTADOR - ACUMULADO CÉDULA SCAER 2026', 14, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Acumulado: R$ ${totalContadorAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Total de Cadetes: ${filteredContador.length}`, 14, 22);

    let y = 32;
    doc.setFont('helvetica', 'bold');
    doc.text('Nº', 14, y);
    doc.text('Nome de Guerra', 35, y);
    doc.text('Nome Completo', 80, y);
    doc.text('CPF', 150, y);
    doc.text('Valor Total', 180, y);
    doc.line(14, y + 2, 195, y + 2);

    y += 8;
    doc.setFont('helvetica', 'normal');
    filteredContador.slice(0, 45).forEach((item) => {
      if (y > 280) {
        doc.addPage();
        y = 15;
      }
      doc.text(item.number, 14, y);
      doc.text(item.warName.substring(0, 18), 35, y);
      doc.text(item.fullName.substring(0, 30), 80, y);
      doc.text(item.cpf, 150, y);
      doc.text(`R$ ${item.totalAmount.toFixed(2)}`, 180, y);
      y += 6;
    });
    doc.save('Contador_SCAER_2026.pdf');
  };

  // Exportar Repasse para XLSX
  const handleExportRepasseXLSX = () => {
    const rows = repasseData.map((item) => ({
      'Entidade / Clube / Diretoria': item.clubName,
      'Categoria': item.category,
      'Valor a Repassar (R$)': item.amount.toFixed(2),
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Repasse');
    XLSX.writeFile(workbook, `Repasse_Clubes_SCAER.xlsx`);
  };

  // Exportar Repasse para PDF
  const handleExportRepassePDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('VALORES A REPASSAR - CLUBES E DIRETORIAS SCAER', 14, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Geral a Repassar: R$ ${totalRepasseAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 22);

    let y = 32;
    doc.setFont('helvetica', 'bold');
    doc.text('Entidade / Clube', 14, y);
    doc.text('Categoria', 100, y);
    doc.text('Valor Repasse', 160, y);
    doc.line(14, y + 2, 195, y + 2);

    y += 8;
    doc.setFont('helvetica', 'normal');
    repasseData.forEach((item) => {
      if (y > 280) {
        doc.addPage();
        y = 15;
      }
      doc.text(item.clubName, 14, y);
      doc.text(item.category, 100, y);
      doc.text(`R$ ${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 160, y);
      y += 6.5;
    });
    doc.save('Repasse_Clubes_SCAER.pdf');
  };

  // Exportar Sócios para XLSX
  const handleExportMembersXLSX = () => {
    const rows = filteredMemberships.map((m) => {
      const club = clubs.find((c) => c.id === m.clubId);
      return {
        'Número': m.cadetNumber,
        'Cadete (Nome de Guerra)': m.userName,
        'Esquadrão': m.squadron || 'Athos',
        'Clube SCAER': m.clubName || club?.name || 'Clube',
        'Mensalidade (R$)': club ? club.monthlyFee.toFixed(2) : '0.00',
        'Status': 'Sócio Ativo',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Socios_Clubes');
    XLSX.writeFile(workbook, `Socios_Clubes_SCAER.xlsx`);
  };

  // Exportar Sócios para PDF
  const handleExportMembersPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RELAÇÃO DE SÓCIOS ATIVOS DOS CLUBES SCAER', 14, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total de Sócios Listados: ${filteredMemberships.length} cadetes`, 14, 22);

    let y = 32;
    doc.setFont('helvetica', 'bold');
    doc.text('Nº e Guerra', 14, y);
    doc.text('Esquadrão', 70, y);
    doc.text('Clube SCAER', 110, y);
    doc.text('Status', 165, y);
    doc.line(14, y + 2, 195, y + 2);

    y += 8;
    doc.setFont('helvetica', 'normal');
    filteredMemberships.slice(0, 45).forEach((m) => {
      if (y > 280) {
        doc.addPage();
        y = 15;
      }
      doc.text(`${m.cadetNumber} ${m.userName}`.substring(0, 24), 14, y);
      doc.text((m.squadron || 'Athos').substring(0, 18), 70, y);
      doc.text((m.clubName || 'Clube').substring(0, 22), 110, y);
      doc.text('Ativo', 165, y);
      y += 6;
    });
    doc.save('Socios_Clubes_SCAER.pdf');
  };

  // Handler para Excluir/Cancelar Lançamento
  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Tem certeza que deseja cancelar/excluir este lançamento da cédula?')) return;
    try {
      await pb.collection('expenses').delete(expenseId);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Erro ao excluir lançamento:', err);
      alert('Erro ao excluir lançamento no PocketBase.');
    }
  };

  // Handler para Lançamentos da Diretoria
  const handleLaunchIndividual = async (launch: Omit<Expense, 'id' | 'createdAt' | 'status'>) => {
    await pb.collection('expenses').create({ ...launch, createdAt: new Date().toISOString() });
    if (onRefreshData) onRefreshData();
  };

  const handleLaunchBulk = async (launches: Omit<Expense, 'id' | 'createdAt' | 'status'>[]) => {
    for (const item of launches) {
      await pb.collection('expenses').create({ ...item, createdAt: new Date().toISOString() });
    }
    if (onRefreshData) onRefreshData();
  };

  // Handler para Gerar PDF (Sintético ou Detalhado)
  const handleGenerateReport = async (reportType: 'synthetic' | 'detailed') => {
    setIsGeneratingPdf(true);
    try {
      const hashRaw = `${selectedPeriod}_${directorUser.id}_${totalAmount}_${periodExpenses.length}_${reportType}_${Date.now()}`;
      const verificationHash = await generateSHA256(hashRaw);

      const { pdfUrl, hash } = await generateDirectorPDFReport({
        period: selectedPeriod,
        director: directorUser,
        expenses: periodExpenses,
        totalAmount,
        totalLaunches: periodExpenses.length,
        totalCadets: uniqueCadetIds.size,
        verificationHash,
        reportType,
      });

      await onSaveReport({
        title: `Relatório ${reportType === 'synthetic' ? 'Sintético (Somatório)' : 'Detalhado'} SCAER - ${selectedPeriod}`,
        period: selectedPeriod,
        reportType,
        totalAmount,
        totalLaunches: periodExpenses.length,
        totalCadets: uniqueCadetIds.size,
        verificationHash: hash,
        issuedAt: new Date().toLocaleString('pt-BR'),
        issuedBy: directorUser.id,
        directorName: `${directorUser.cadetNumber} ${directorUser.warName}`,
        pdfUrl,
      });

      setGeneratedPdfUrl(pdfUrl);
      setLastHash(hash);

      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Relatorio_SCAER_${reportType.toUpperCase()}_${selectedPeriod}.pdf`;
      link.click();
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      alert('Erro ao gerar relatório em PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handler para Exportar Planilha Excel / Sheets (CSV)
  const handleExportSheets = () => {
    if (periodExpenses.length === 0) {
      alert('Nenhum dado disponível para exportação neste período.');
      return;
    }

    const headers = ['Matricula', 'Cadete', 'Clube', 'Descricao', 'Categoria', 'Valor', 'Data', 'Gestor'];
    const rows = filteredExpenses.map(exp => [
      `"${exp.cadetNumber}"`,
      `"${exp.userName}"`,
      `"${exp.clubName}"`,
      `"${exp.description}"`,
      `"${exp.category}"`,
      exp.amount.toFixed(2),
      `"${exp.createdAt}"`,
      `"${exp.createdByName}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SCAER_Cedula_Export_${selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Banner Principal da Diretoria de Cédula */}
      <div className={`p-5 sm:p-6 rounded-xl border transition-colors ${
        isDark
          ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
          : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
              }`}>
                DIRETORIA DE CÉDULA SCAER
              </span>
              <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>SISTEMA OFICIAL</span>
            </div>

            <h2 className="text-xl font-bold tracking-tight">
              Painel da Diretoria de Cédula
            </h2>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Diretor Responsável: <strong className="font-semibold">{directorUser.cadetNumber} {directorUser.warName}</strong> ({directorUser.name})
            </p>
          </div>

          {/* Botões de Ação da Diretoria */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                setScannedCadetInfo(null);
                setShowLaunchModal(true);
              }}
              className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition-colors flex items-center space-x-1.5 ${
                isDark
                  ? 'bg-zinc-100 text-zinc-950 hover:bg-white'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Lançar Gasto</span>
            </button>

            <button
              onClick={handleExportSheets}
              className={`px-3.5 py-2 rounded-lg font-semibold text-xs border transition-colors flex items-center space-x-1.5 ${
                isDark
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar CSV</span>
            </button>

            <button
              disabled={isGeneratingPdf}
              onClick={() => handleGenerateReport('synthetic')}
              className={`px-3.5 py-2 rounded-lg font-semibold text-xs border transition-colors flex items-center space-x-1.5 ${
                isDark
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>PDF Sintético</span>
            </button>

            <button
              disabled={isGeneratingPdf}
              onClick={() => handleGenerateReport('detailed')}
              className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>PDF Detalhado</span>
            </button>

            <button
              onClick={() => setShowQrScanner(true)}
              className="px-4 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition-all flex items-center space-x-1.5"
            >
              <QrCode className="w-4 h-4" />
              <span>Escanear QR Code</span>
            </button>
          </div>
        </div>
      </div>

      {/* Abas Principais Diretas no Início da Diretoria */}
      <div className={`flex items-center space-x-2 border-b pb-2 overflow-x-auto ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <button
          onClick={() => setDirectorSubTab('audit')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            directorSubTab === 'audit'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25 font-extrabold'
              : isDark ? 'bg-slate-900 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>1. Livro Razão & Auditoria ({expenses.length})</span>
        </button>

        <button
          onClick={() => setDirectorSubTab('contador')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            directorSubTab === 'contador'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 font-extrabold'
              : isDark ? 'bg-slate-900 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>2. Dados do Contador ({contadorData.length} cadetes)</span>
        </button>

        <button
          onClick={() => setDirectorSubTab('repasse')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            directorSubTab === 'repasse'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 font-extrabold'
              : isDark ? 'bg-slate-900 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>3. Repasse aos Clubes ({repasseData.length} entidades)</span>
        </button>

        <button
          onClick={() => setDirectorSubTab('members')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            directorSubTab === 'members'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 font-extrabold'
              : isDark ? 'bg-slate-900 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>4. Sócios dos 14 Clubes ({activeMemberships.length})</span>
        </button>
      </div>

      {/* ABA 1: VISÃO GERAL DE AUDITORIA & LIVRO RAZÃO */}
      {directorSubTab === 'audit' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Cards de Métricas Consolidadas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className={`p-5 rounded-2xl border shadow-lg backdrop-blur-xl transition-colors ${
              isDark
                ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-purple-500/30'
                : 'bg-gradient-to-br from-white to-purple-50 border-purple-300'
            }`}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Total Consolidado Cédula</span>
                <Receipt className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-purple-500 font-mono">
                R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-[10px] text-slate-400">
                Período selecionado: {selectedPeriod === 'all' ? 'Todos os Meses' : selectedPeriod}
              </div>
            </div>

            <div className={`p-5 rounded-2xl border backdrop-blur-xl transition-colors ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Cadetes Alcançados</span>
                <Users className="w-4 h-4 text-cyan-500" />
              </div>
              <div className={`text-2xl font-bold font-mono ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {uniqueCadetIds.size} <span className="text-xs font-normal text-slate-400">cadetes</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-400">
                Cadetes com cobranças no período
              </div>
            </div>

            <div className={`p-5 rounded-2xl border backdrop-blur-xl transition-colors ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Total de Lançamentos</span>
                <FileCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-500 font-mono">
                {periodExpenses.length} <span className="text-xs font-normal text-slate-400">itens</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-400">
                Lançamentos auditados
              </div>
            </div>

            <div className={`p-5 rounded-2xl border backdrop-blur-xl transition-colors ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Clubes Registrados</span>
                <Building className="w-4 h-4 text-amber-500" />
              </div>
              <div className={`text-2xl font-bold font-mono ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {clubs.length} <span className="text-xs font-normal text-slate-400">clubes</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-400">
                14 clubes sob a SCAER
              </div>
            </div>

          </div>

          {/* Selo Holográfico de Autenticidade da Diretoria (Fixo) */}
          <BeautifulSealBadge
            hash={lastHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
            issuedAt={new Date().toLocaleString('pt-BR')}
            directorName={`${directorUser.cadetNumber} ${directorUser.warName}`}
            period={selectedPeriod}
            theme={theme}
          />

          {generatedPdfUrl && (
            <div className="flex justify-end pt-2">
              <a
                href={generatedPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Último Relatório PDF Emitido</span>
              </a>
            </div>
          )}

          {/* Livro Razão de Auditoria */}
          <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl shadow-xl transition-colors ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`p-4 border-b flex flex-col md:flex-row items-center justify-between gap-4 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center space-x-3 w-full md:w-auto">
                <h3 className={`text-sm font-bold shrink-0 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Livro Razão de Auditoria
                </h3>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className={`border rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">Todos os Meses</option>
                  <option value="2026-08">Agosto / 2026</option>
                  <option value="2026-07">Julho / 2026</option>
                  <option value="2026-06">Junho / 2026</option>
                  <option value="2026-05">Maio / 2026</option>
                  <option value="2026-04">Abril / 2026</option>
                  <option value="2026-03">Março / 2026</option>
                  <option value="2026-02">Fevereiro / 2026</option>
                  <option value="2026-01">Janeiro / 2026</option>
                </select>
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto">
                <select
                  value={selectedClubFilter}
                  onChange={(e) => setSelectedClubFilter(e.target.value)}
                  className={`border rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">Todos os 14 Clubes</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar cadete, descrição ou clube..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full border rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`font-mono uppercase border-b ${
                  isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="p-4">Número e Nome</th>
                    <th className="p-4">Clube Emissor</th>
                    <th className="p-4">Descrição do Gasto</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Mês</th>
                    <th className="p-4">Valor (R$)</th>
                    <th className="p-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                        Nenhum lançamento registrado no banco de dados para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.slice((currentPage - 1) * 40, currentPage * 40).map((exp) => (
                      <tr key={exp.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                        <td className="p-4 font-bold font-mono text-cyan-500">
                          {exp.cadetNumber} {exp.userName}
                        </td>
                        <td className="p-4 font-medium">{exp.clubName}</td>
                        <td className="p-4">
                          {exp.description}
                        </td>
                        <td className="p-4 opacity-80">{exp.category}</td>
                        <td className="p-4 font-mono opacity-80">{exp.billingPeriod}</td>
                        <td className="p-4 font-bold text-cyan-500 font-mono">R$ {exp.amount.toFixed(2)}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-all"
                            title="Cancelar/Excluir Lançamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Controles de Paginação do Livro Razão */}
            <div className={`p-4 border-t flex items-center justify-between text-xs ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
            }`}>
              <span>
                Mostrando página {currentPage} de {Math.ceil(filteredExpenses.length / 40) || 1} ({filteredExpenses.length} lançamentos auditados no banco)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border hover:bg-slate-800 disabled:opacity-30 transition-colors"
                >
                  Anterior
                </button>
                <button
                  disabled={currentPage >= Math.ceil(filteredExpenses.length / 40)}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-1.5 rounded-lg border hover:bg-slate-800 disabled:opacity-30 transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ABA 2: DADOS DO CONTADOR (SOMATÓRIO POR CADETE) */}
      {directorSubTab === 'contador' && (
        <div className="space-y-6 animate-in fade-in">
          <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <h4 className="text-sm font-bold flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-amber-500" />
                <span>Dados do Contador - Somatório Acumulado por Cadete ({filteredContador.length} cadetes)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Total Geral Acumulado: <strong className="text-emerald-400 font-mono">R$ {totalContadorAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por Nº, Nome ou CPF..."
                  value={contadorSearchTerm}
                  onChange={(e) => { setContadorSearchTerm(e.target.value); setContadorPage(1); }}
                  className={`w-full border rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              <button
                onClick={handleExportContadorXLSX}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center space-x-1.5 shadow-md"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar XLSX</span>
              </button>

              <button
                onClick={handleExportContadorPDF}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center space-x-1.5 shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Exportar PDF</span>
              </button>
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl shadow-xl transition-colors ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`font-mono uppercase border-b ${
                  isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="p-3.5">Número</th>
                    <th className="p-3.5">Nome de Guerra</th>
                    <th className="p-3.5">Nome Completo</th>
                    <th className="p-3.5">CPF</th>
                    <th className="p-3.5 font-right">Valor Total na Cédula (R$)</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {filteredContador.slice((contadorPage - 1) * 35, contadorPage * 35).map((c) => (
                    <tr key={c.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                      <td className="p-3.5 font-bold font-mono text-cyan-400">{c.number}</td>
                      <td className="p-3.5 font-extrabold text-slate-200">{c.warName}</td>
                      <td className="p-3.5 opacity-90">{c.fullName}</td>
                      <td className="p-3.5 font-mono opacity-70">{c.cpf}</td>
                      <td className="p-3.5 font-black text-emerald-400 font-mono text-sm">
                        R$ {c.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`p-4 border-t flex items-center justify-between text-xs ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
            }`}>
              <span>Página {contadorPage} de {Math.ceil(filteredContador.length / 35) || 1} ({filteredContador.length} cadetes)</span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={contadorPage === 1}
                  onClick={() => setContadorPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border hover:bg-slate-800 disabled:opacity-30"
                >
                  Anterior
                </button>
                <button
                  disabled={contadorPage >= Math.ceil(filteredContador.length / 35)}
                  onClick={() => setContadorPage(p => p + 1)}
                  className="p-1.5 rounded-lg border hover:bg-slate-800 disabled:opacity-30"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: REPASSE FINANCEIRO AOS CLUBES E DIRETORIAS */}
      {directorSubTab === 'repasse' && (
        <div className="space-y-6 animate-in fade-in">
          <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <h4 className="text-sm font-bold flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span>Valores a Repassar para Clubes e Diretorias ({selectedPeriod})</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Total Geral de Repasse: <strong className="text-emerald-400 font-mono">R$ {totalRepasseAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportRepasseXLSX}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center space-x-1.5 shadow-md"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar XLSX</span>
              </button>

              <button
                onClick={handleExportRepassePDF}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center space-x-1.5 shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Exportar PDF</span>
              </button>
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl shadow-xl transition-colors ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`font-mono uppercase border-b ${
                  isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="p-4">Clube / Entidade / Diretoria</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Mês Apuração</th>
                    <th className="p-4">Valor Total a Repassar (R$)</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {repasseData.map((r) => (
                    <tr key={r.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                      <td className="p-4 font-bold text-slate-100 text-sm">{r.clubName}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          r.category.includes('Diretoria') ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'
                        }`}>
                          {r.category}
                        </span>
                      </td>
                      <td className="p-4 font-mono opacity-80">{r.billingPeriod}</td>
                      <td className="p-4 font-black text-emerald-400 font-mono text-base">
                        R$ {r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className={`font-mono uppercase border-t ${
                  isDark ? 'bg-slate-950 text-slate-200 border-slate-800' : 'bg-slate-100 text-slate-900 border-slate-300'
                }`}>
                  <tr>
                    <td colSpan={3} className="p-4 font-bold text-sm">TOTAL GERAL DE REPASSES</td>
                    <td className="p-4 font-black text-lg text-emerald-400">
                      R$ {totalRepasseAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: SÓCIOS DOS 14 CLUBES */}
      {directorSubTab === 'members' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Barra de Filtros da Aba de Sócios */}
          <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-purple-400 shrink-0" />
                <select
                  value={memberClubFilter}
                  onChange={(e) => { setMemberClubFilter(e.target.value); setMemberPage(1); }}
                  className={`border rounded-xl px-3 py-1.5 text-xs font-extrabold focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">Todos os 14 Clubes SCAER</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (R$ {c.monthlyFee.toFixed(2)}/mês)
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar sócio por número, nome ou esquadrão..."
                  value={memberSearchQuery}
                  onChange={(e) => { setMemberSearchQuery(e.target.value); setMemberPage(1); }}
                  className={`w-full border rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
              <button
                onClick={handleExportMembersXLSX}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center space-x-1.5 shadow-md"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar XLSX</span>
              </button>

              <button
                onClick={handleExportMembersPDF}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center space-x-1.5 shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Exportar PDF</span>
              </button>
            </div>
          </div>

          {/* Tabela de Sócios dos Clubes */}
          <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl shadow-xl transition-colors ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`font-mono uppercase border-b ${
                  isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="p-4">Número e Nome de Guerra</th>
                    <th className="p-4">Esquadrão</th>
                    <th className="p-4">Clube SCAER</th>
                    <th className="p-4">Mensalidade</th>
                    <th className="p-4">Status da Adesão</th>
                    <th className="p-4">Data de Aprovação</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {filteredMemberships.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                        Nenhum sócio ativo encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredMemberships.slice((memberPage - 1) * 35, memberPage * 35).map((m) => {
                      const club = clubs.find((c) => c.id === m.clubId);
                      return (
                        <tr key={m.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                          <td className="p-4 font-bold font-mono text-cyan-400 text-sm">
                            {m.cadetNumber} {m.userName}
                          </td>
                          <td className="p-4 opacity-80">{m.squadron || 'Athos'}</td>
                          <td className="p-4 font-extrabold text-amber-400">
                            {m.clubName || club?.name || 'Clube'}
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-200">
                            R$ {club ? club.monthlyFee.toFixed(2) : '0.00'}/mês
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Sócio Ativo</span>
                            </span>
                          </td>
                          <td className="p-4 font-mono opacity-70">
                            {m.approvedAt || m.requestedAt || '2026-01-01'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação da Tabela de Sócios */}
            <div className={`p-4 border-t flex items-center justify-between text-xs ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
            }`}>
              <span>
                Página {memberPage} de {Math.ceil(filteredMemberships.length / 35) || 1} ({filteredMemberships.length} sócios cadastrados)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={memberPage === 1}
                  onClick={() => setMemberPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border hover:bg-slate-800 disabled:opacity-30 transition-colors"
                >
                  Anterior
                </button>
                <button
                  disabled={memberPage >= Math.ceil(filteredMemberships.length / 35)}
                  onClick={() => setMemberPage(p => p + 1)}
                  className="p-1.5 rounded-lg border hover:bg-slate-800 disabled:opacity-30 transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {showVerifyModal && (
        <ReportVerificationModal reports={reports} onClose={() => setShowVerifyModal(false)} />
      )}

      {/* Modal de Lançamento da Diretoria */}
      {showLaunchModal && (
        <LaunchExpenseModal
          club={clubs[0] || { id: 'clb_geraes', name: 'SCAER DIRETORIA', monthlyFee: 0, category: 'Diretoria' }}
          activeMembers={[]}
          allCadets={[]}
          managerUser={directorUser}
          scannedCadet={scannedCadetInfo}
          onLaunchIndividual={handleLaunchIndividual}
          onLaunchBulk={handleLaunchBulk}
          onClose={() => {
            setShowLaunchModal(false);
            setScannedCadetInfo(null);
          }}
          theme={theme}
        />
      )}

      {showQrScanner && (
        <QRCodeExpenseScanner
          onScanSuccess={(cadetNumber, warName) => {
            setShowQrScanner(false);
            setScannedCadetInfo({ cadetNumber, warName });
            setShowLaunchModal(true);
          }}
          onClose={() => setShowQrScanner(false)}
          theme={theme}
        />
      )}

    </div>
  );
};
