import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import type { CadetRosterItem, PendingExemption, DesligadoItem, Expense, Club } from '../../types';
import { DatabaseService, POCKETBASE_URL } from '../../lib/pocketbase';
import { parseCedulaExcelFile } from '../../lib/excelImporter';
import contadorDataImport from '../../data/contador_data.json';
import repasseDataImport from '../../data/repasse_data.json';
import {
  FileSpreadsheet,
  Search,
  Users,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Layers,
  Upload,
  Download,
  Calculator
} from 'lucide-react';

interface ExcelSpreadsheetViewProps {
  expenses: Expense[];
  clubs: Club[];
  roster: CadetRosterItem[];
  exemptions: PendingExemption[];
  desligados: DesligadoItem[];
  theme?: 'dark' | 'light';
  onRefreshData?: () => void;
}

export const ExcelSpreadsheetView: React.FC<ExcelSpreadsheetViewProps> = ({
  expenses,
  roster,
  theme = 'dark',
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'contador' | 'repasse' | 'extrato' | 'roster'>('contador');
  
  // Filtros & Paginação
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMonth] = useState<string>('2026-08');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 30;

  // Estado da Importação
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const isDark = theme === 'dark';

  // --- CONTADOR DATA & REPASSE DATA DAS PLANILHAS OFICIAIS ---
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

  // --- FILTROS PARA A ABA CONTADOR ---
  const filteredContador = contadorData.filter((item) =>
    item.warName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.cpf.includes(searchTerm)
  );

  const totalContadorAmount = filteredContador.reduce((acc, curr) => acc + curr.totalAmount, 0);

  // --- FILTROS PARA A ABA REPASSE ---
  const filteredRepasse = repasseData.filter((item) =>
    item.clubName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRepasseAmount = filteredRepasse.reduce((acc, curr) => acc + curr.amount, 0);

  // --- HANDLERS DE EXPORTAÇÃO XLSX E PDF ---
  const handleExportContadorXLSX = () => {
    const excelRows = filteredContador.map((item) => ({
      'Número de Ordem': item.number,
      'Nome de Guerra': item.warName,
      'Nome Completo': item.fullName,
      'CPF': item.cpf,
      'Valor Total (R$)': item.totalAmount.toFixed(2),
      'Mês Apuração': item.billingPeriod,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contador');
    XLSX.writeFile(workbook, `Contador_CedulAthos_${selectedMonth}.xlsx`);
  };

  const handleExportContadorPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`RELATÓRIO DO CONTADOR - CÉDULATHOS 2026 (${selectedMonth})`, 14, 15);
    
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

    doc.save(`Contador_CedulAthos_${selectedMonth}.pdf`);
  };

  const handleExportRepasseXLSX = () => {
    const excelRows = filteredRepasse.map((item) => ({
      'Entidade / Clube': item.clubName,
      'Categoria': item.category,
      'Mês': item.billingPeriod,
      'Valor a Repassar (R$)': item.amount.toFixed(2),
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Repasse');
    XLSX.writeFile(workbook, `Repasse_Clubes_${selectedMonth}.xlsx`);
  };

  const handleExportRepassePDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`RELATÓRIO DE REPASSE AOS CLUBES E DIRETORIAS (${selectedMonth})`, 14, 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Geral de Repasse: R$ ${totalRepasseAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 22);

    let y = 32;
    doc.setFont('helvetica', 'bold');
    doc.text('Entidade / Clube', 14, y);
    doc.text('Categoria', 100, y);
    doc.text('Valor Repasse', 160, y);
    doc.line(14, y + 2, 195, y + 2);

    y += 8;
    doc.setFont('helvetica', 'normal');

    filteredRepasse.forEach((item) => {
      if (y > 280) {
        doc.addPage();
        y = 15;
      }
      doc.text(item.clubName, 14, y);
      doc.text(item.category, 100, y);
      doc.text(`R$ ${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 160, y);
      y += 6.5;
    });

    doc.save(`Repasse_Clubes_${selectedMonth}.pdf`);
  };

  // --- HANDLER DE IMPORTAÇÃO EXCEL DA PLANILHA ---
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const parsed = await parseCedulaExcelFile(file, 'usr_diretor_fernando', '23/001 FERNANDO');
      await DatabaseService.importBulkDataFromExcel(
        parsed.roster,
        parsed.expenses,
        parsed.exemptions,
        parsed.desligados
      );
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Erro na importação do Excel:', err);
    } finally {
      setIsImporting(false);
    }
  };

  // Paginação Contador
  const totalPagesContador = Math.ceil(filteredContador.length / itemsPerPage) || 1;
  const paginatedContador = filteredContador.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      
      {/* Header da Central de Consultas CédulAthos */}
      <div className={`p-6 rounded-3xl border shadow-xl backdrop-blur-xl transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Central de Consultas - Planilha CédulAthos 2k26
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Dados Oficiais
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Conectado ao PocketBase (<strong className="text-emerald-400">{POCKETBASE_URL}</strong>)
              </p>
            </div>
          </div>

          <label className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all flex items-center space-x-2 cursor-pointer shrink-0">
            <Upload className="w-4 h-4" />
            <span>{isImporting ? 'Importando...' : 'Importar Planilha (.xlsx)'}</span>
            <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" />
          </label>
        </div>

        {/* Abas de Navegação das Planilhas */}
        <div className="flex items-center space-x-2 overflow-x-auto mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => { setActiveTab('contador'); setCurrentPage(1); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'contador'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-extrabold'
                : isDark ? 'bg-slate-950 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>1. Aba Contador ({contadorData.length} cadetes)</span>
          </button>

          <button
            onClick={() => setActiveTab('repasse')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'repasse'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-extrabold'
                : isDark ? 'bg-slate-950 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>2. Aba Repasse ({repasseData.length} entidades)</span>
          </button>

          <button
            onClick={() => { setActiveTab('roster'); setCurrentPage(1); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'roster'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : isDark ? 'bg-slate-950 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Efetivo Cadetes</span>
          </button>

          <button
            onClick={() => { setActiveTab('extrato'); setCurrentPage(1); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'extrato'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : isDark ? 'bg-slate-950 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>4. Lançamentos ({expenses.length})</span>
          </button>
        </div>
      </div>

      {/* ABA 1: DADOS DO CONTADOR COM EXPORTAÇÃO XLSX E PDF */}
      {activeTab === 'contador' && (
        <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl shadow-xl transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`p-4 border-b flex flex-col md:flex-row items-center justify-between gap-4 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <div>
              <h4 className="text-sm font-bold flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-amber-500" />
                <span>Dados do Contador - Somatório por Cadete ({filteredContador.length} cadetes)</span>
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
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
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
                {paginatedContador.map((c) => (
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
            <span>Página {currentPage} de {totalPagesContador} ({filteredContador.length} cadetes)</span>
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPagesContador}
                onClick={() => setCurrentPage(p => Math.min(totalPagesContador, p + 1))}
                className="p-1.5 rounded-lg border hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: DADOS DE REPASSE FINANCEIRO AOS CLUBES E DIRETORIAS */}
      {activeTab === 'repasse' && (
        <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl shadow-xl transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`p-4 border-b flex flex-col md:flex-row items-center justify-between gap-4 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <div>
              <h4 className="text-sm font-bold flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span>Valores a Repassar para Clubes e Diretorias (Agosto/2026)</span>
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
                {filteredRepasse.map((r) => (
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
      )}

      {/* ABA 3: EFETIVO TOTAL */}
      {activeTab === 'roster' && (
        <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl shadow-xl transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`font-mono uppercase border-b ${
                isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <tr>
                  <th className="p-3.5">Número e Nome</th>
                  <th className="p-3.5">Nome Completo</th>
                  <th className="p-3.5">Esquadrão</th>
                  <th className="p-3.5">CPF</th>
                  <th className="p-3.5">E-mail</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {roster.slice(0, 50).map((cadet) => (
                  <tr key={cadet.id}>
                    <td className="p-3.5 font-bold font-mono text-cyan-500">{cadet.number} {cadet.warName}</td>
                    <td className="p-3.5 font-medium">{cadet.fullName}</td>
                    <td className="p-3.5 opacity-80">{cadet.squadron}</td>
                    <td className="p-3.5 font-mono opacity-80">{cadet.cpf}</td>
                    <td className="p-3.5 font-mono text-[11px] text-blue-400">{cadet.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 4: EXTRATO & LANÇAMENTOS */}
      {activeTab === 'extrato' && (
        <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl shadow-xl transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`font-mono uppercase border-b ${
                isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <tr>
                  <th className="p-3.5">Mês</th>
                  <th className="p-3.5">Número e Nome</th>
                  <th className="p-3.5">Clube</th>
                  <th className="p-3.5">Descrição</th>
                  <th className="p-3.5">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {expenses.slice(0, 50).map((exp) => (
                  <tr key={exp.id}>
                    <td className="p-3.5 font-mono opacity-80">{exp.billingPeriod}</td>
                    <td className="p-3.5 font-bold font-mono text-cyan-500">{exp.cadetNumber} {exp.userName}</td>
                    <td className="p-3.5 font-medium">{exp.clubName}</td>
                    <td className="p-3.5 opacity-90">{exp.description}</td>
                    <td className="p-3.5 font-bold text-emerald-500 font-mono">R$ {exp.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
