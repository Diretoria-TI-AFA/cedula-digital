import React, { useState, useEffect } from 'react';
import type { Club, User, Expense, LaunchType, ClubMembership } from '../../types';
import { PlusCircle, Users, UserCheck, FileSpreadsheet, Upload, CheckCircle2, AlertCircle, QrCode } from 'lucide-react';

interface LaunchExpenseModalProps {
  club: Club;
  managerUser: User;
  allCadets: User[];
  activeMembers?: ClubMembership[];
  scannedCadet?: { cadetNumber: string; warName?: string } | null;
  onClose: () => void;
  onLaunchIndividual: (launch: Omit<Expense, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  onLaunchBulk: (launches: Omit<Expense, 'id' | 'createdAt' | 'status'>[]) => Promise<void>;
  theme?: 'dark' | 'light';
}

export const LaunchExpenseModal: React.FC<LaunchExpenseModalProps> = ({
  club,
  managerUser,
  allCadets,
  scannedCadet,
  onClose,
  onLaunchIndividual,
  onLaunchBulk,
  theme = 'dark',
}) => {
  const [launchType, setLaunchType] = useState<LaunchType>('individual');
  const [selectedCadetId, setSelectedCadetId] = useState<string>(allCadets[0]?.id || '');
  const [selectedCadetIds, setSelectedCadetIds] = useState<string[]>([]);
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<Expense['category']>('Consumo');
  const [billingPeriod, setBillingPeriod] = useState<string>('2026-07');
  
  // Estado para Importação de CSV
  const [csvText, setCsvText] = useState<string>('');
  const [parsedCsvLaunches, setParsedCsvLaunches] = useState<Omit<Expense, 'id' | 'createdAt' | 'status'>[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isDark = theme === 'dark';

  // Pré-selecionar o cadete escaneado via QR Code
  useEffect(() => {
    if (scannedCadet) {
      const found = allCadets.find(
        (c) =>
          c.cadetNumber.toLowerCase().includes(scannedCadet.cadetNumber.toLowerCase()) ||
          (scannedCadet.warName && c.warName.toLowerCase().includes(scannedCadet.warName.toLowerCase()))
      );
      if (found) {
        setSelectedCadetId(found.id);
      }
    }
  }, [scannedCadet, allCadets]);

  // Parser Flexível de CSV
  const handleParseCsv = (text: string) => {
    setCsvText(text);
    setCsvError(null);
    setParsedCsvLaunches([]);

    if (!text.trim()) return;

    try {
      const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) return;

      const results: Omit<Expense, 'id' | 'createdAt' | 'status'>[] = [];

      const firstLineLower = lines[0].toLowerCase();
      const hasHeader = firstLineLower.includes('matricula') || firstLineLower.includes('numero') || firstLineLower.includes('valor');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      for (const line of dataLines) {
        const parts = line.split(/[,;]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length < 2) continue;

        let cadetQuery = parts[0];
        let valStr = '';
        let desc = 'Lançamento via CSV';
        let cat: Expense['category'] = 'Consumo';

        if (parts.length >= 4) {
          if (!isNaN(parseFloat(parts[2].replace(',', '.')))) {
            valStr = parts[2];
            desc = parts[3] || desc;
            if (parts[4]) cat = parts[4] as any;
          } else {
            valStr = parts[1];
            desc = parts[2] || desc;
          }
        } else {
          valStr = parts[1];
          if (parts[2]) desc = parts[2];
        }

        const numVal = parseFloat(valStr.replace(',', '.'));
        if (isNaN(numVal) || numVal <= 0) continue;

        const targetCadet = allCadets.find(
          c => c.cadetNumber.toLowerCase().includes(cadetQuery.toLowerCase()) ||
               c.warName.toLowerCase().includes(cadetQuery.toLowerCase())
        ) || allCadets[0];

        results.push({
          userId: targetCadet.id,
          userName: targetCadet.warName,
          cadetNumber: targetCadet.cadetNumber,
          clubId: club.id,
          clubName: club.name,
          description: desc,
          amount: numVal,
          category: cat,
          billingPeriod,
          launchType: 'csv',
          createdBy: managerUser.id,
          createdByName: managerUser.warName,
        });
      }

      if (results.length === 0) {
        setCsvError('Nenhum registro válido pôde ser extraído do CSV fornecido.');
      } else {
        setParsedCsvLaunches(results);
      }
    } catch (err) {
      setCsvError('Erro ao interpretar o arquivo CSV. Verifique o formato.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        handleParseCsv(content);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (launchType === 'csv') {
        if (parsedCsvLaunches.length === 0) {
          alert('Por favor, carregue ou cole dados válidos em CSV antes de confirmar.');
          setIsSubmitting(false);
          return;
        }
        await onLaunchBulk(parsedCsvLaunches);
        alert(`Sucesso! ${parsedCsvLaunches.length} lançamentos do CSV foram registrados na cédula.`);
        onClose();
        return;
      }

      const numAmount = parseFloat(amount.replace(',', '.'));
      if (isNaN(numAmount) || numAmount <= 0) {
        alert('Por favor, insira um valor válido maior que R$ 0,00.');
        setIsSubmitting(false);
        return;
      }

      if (!description.trim()) {
        alert('Por favor, informe a descrição do gasto.');
        setIsSubmitting(false);
        return;
      }

      if (launchType === 'individual' || launchType === 'event_non_member') {
        const targetCadet = allCadets.find((c) => c.id === selectedCadetId);
        if (!targetCadet) return;

        await onLaunchIndividual({
          userId: targetCadet.id,
          userName: targetCadet.warName,
          cadetNumber: targetCadet.cadetNumber,
          clubId: club.id,
          clubName: club.name,
          description: description.trim(),
          amount: numAmount,
          category,
          billingPeriod,
          launchType,
          createdBy: managerUser.id,
          createdByName: managerUser.warName,
          isNonMemberEvent: launchType === 'event_non_member',
        });

        alert(`Gasto de R$ ${numAmount.toFixed(2)} lançado na cédula de ${targetCadet.cadetNumber} ${targetCadet.warName}!`);
        onClose();
      } else if (launchType === 'bulk') {
        if (selectedCadetIds.length === 0) {
          alert('Selecione ao menos um cadete para o lançamento em lote.');
          setIsSubmitting(false);
          return;
        }

        const bulkList: Omit<Expense, 'id' | 'createdAt' | 'status'>[] = selectedCadetIds.map((cId) => {
          const c = allCadets.find((item) => item.id === cId)!;
          return {
            userId: c.id,
            userName: c.warName,
            cadetNumber: c.cadetNumber,
            clubId: club.id,
            clubName: club.name,
            description: description.trim(),
            amount: numAmount,
            category,
            billingPeriod,
            launchType: 'bulk',
            createdBy: managerUser.id,
            createdByName: managerUser.warName,
          };
        });

        await onLaunchBulk(bulkList);
        alert(`Gasto lançado com sucesso para ${bulkList.length} cadetes!`);
        onClose();
      }
    } catch (err) {
      console.error('Erro ao lançar gasto:', err);
      alert('Erro ao registrar lançamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCadetObj = allCadets.find(c => c.id === selectedCadetId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`w-full max-w-xl rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-6 my-8 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header do Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Lançar Gasto na Cédula</h3>
              <p className="text-xs text-slate-400">Clube: <strong className="text-amber-400">{club.name}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            ✕
          </button>
        </div>

        {/* Alerta de Cadete Lido via QR Code */}
        {scannedCadet && selectedCadetObj && (
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center space-x-2.5 animate-in fade-in">
            <QrCode className="w-5 h-5 text-cyan-400 shrink-0 animate-pulse" />
            <div>
              <span>Cadete Lido via QR Code: </span>
              <span className="font-mono text-white text-sm ml-1">
                {selectedCadetObj.cadetNumber} {selectedCadetObj.warName}
              </span>
            </div>
          </div>
        )}

        {/* Seleção do Tipo de Lançamento */}
        <div className={`grid grid-cols-3 gap-2 p-1.5 rounded-2xl border text-xs font-bold ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setLaunchType('individual')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              launchType === 'individual'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Individual</span>
          </button>

          <button
            type="button"
            onClick={() => setLaunchType('bulk')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              launchType === 'bulk'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Em Lote</span>
          </button>

          <button
            type="button"
            onClick={() => setLaunchType('csv')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              launchType === 'csv'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar CSV</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Lançamento Individual */}
          {launchType === 'individual' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Selecionar Cadete Target</label>
              <select
                value={selectedCadetId}
                onChange={(e) => setSelectedCadetId(e.target.value)}
                className={`w-full border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {allCadets.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cadetNumber} {c.warName} ({c.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lançamento em Lote */}
          {launchType === 'bulk' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Selecionar Cadetes ({selectedCadetIds.length} selecionados)</label>
              <div className={`max-h-40 overflow-y-auto border rounded-2xl p-3 space-y-2 text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
              }`}>
                {allCadets.map((c) => (
                  <label key={c.id} className="flex items-center space-x-2 cursor-pointer hover:opacity-80">
                    <input
                      type="checkbox"
                      checked={selectedCadetIds.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedCadetIds([...selectedCadetIds, c.id]);
                        else setSelectedCadetIds(selectedCadetIds.filter(id => id !== c.id));
                      }}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="font-mono text-amber-400 font-bold">{c.cadetNumber}</span>
                    <span>{c.warName}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Lançamento CSV */}
          {launchType === 'csv' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Carregar ou Colar Dados CSV</label>
                <label className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs font-bold cursor-pointer border border-amber-500/30 flex items-center space-x-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Arquivo .CSV</span>
                  <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <textarea
                rows={4}
                placeholder={`Cole dados no formato:\n24/015, SILVA, 50.00, Consumo de Munição\n23/001, MORO, 20.00, Mensalidade Extra`}
                value={csvText}
                onChange={(e) => handleParseCsv(e.target.value)}
                className={`w-full border rounded-2xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />

              {csvError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{csvError}</span>
                </div>
              )}

              {parsedCsvLaunches.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{parsedCsvLaunches.length} lançamentos validados no CSV!</span>
                </div>
              )}
            </div>
          )}

          {/* Campos Comuns (Descrição e Valor) para Individual/Lote */}
          {launchType !== 'csv' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Valor do Gasto (R$)</label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full border rounded-2xl px-4 py-3 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className={`w-full border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Consumo">Consumo / Produto</option>
                    <option value="Mensalidade">Mensalidade</option>
                    <option value="Evento">Evento / Inscrição</option>
                    <option value="Equipamento">Equipamento</option>
                    <option value="Taxa Avulsa">Taxa Avulsa</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Descrição do Gasto</label>
                <input
                  type="text"
                  placeholder="Ex: Consumo Bar do Clube, Camiseta Oficial, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Mês de Cobrança</label>
              <select
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value)}
                className={`w-full border rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="2026-07">Julho / 2026</option>
                <option value="2026-08">Agosto / 2026</option>
                <option value="2026-06">Junho / 2026</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-extrabold text-xs shadow-lg transition-all"
              >
                {isSubmitting ? 'Gravando...' : 'Confirmar Lançamento'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
