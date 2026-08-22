import React, { useState } from 'react';
import type { Transaction, User, ScaerConfig } from '../../types';
import {
  Calendar,
  Receipt,
  ChevronRight,
  Info,
  Tag,
  ArrowUpRight,
  X,
  Shield,
  CreditCard,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface CadetInvoiceViewProps {
  user: User;
  expenses?: Transaction[];
  transactions?: Transaction[];
  scaerConfig?: ScaerConfig | null;
  theme?: 'dark' | 'light';
}

export const CadetInvoiceView: React.FC<CadetInvoiceViewProps> = ({
  user,
  expenses = [],
  transactions = [],
  scaerConfig: _scaerConfig,
  theme = 'dark',
}) => {
  const allTxs = transactions.length > 0 ? transactions : expenses;
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-08');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const isDark = theme === 'dark';

  const availablePeriods = [
    { period: '2026-08', label: 'Agosto / 2026 (Atual)', shortName: 'Agosto', status: 'open' },
    { period: '2026-07', label: 'Julho / 2026', shortName: 'Julho', status: 'closed' },
    { period: '2026-06', label: 'Junho / 2026', shortName: 'Junho', status: 'closed' },
    { period: '2026-05', label: 'Maio / 2026', shortName: 'Maio', status: 'closed' },
    { period: '2026-04', label: 'Abril / 2026', shortName: 'Abril', status: 'closed' },
    { period: '2026-03', label: 'Março / 2026', shortName: 'Março', status: 'closed' },
    { period: '2026-02', label: 'Fevereiro / 2026', shortName: 'Fevereiro', status: 'closed' },
  ];

  // Identificação estrita das despesas do cadete (por número de ordem / ID)
  const userNum = (user.cadetNumber || '').replace(/\D/g, '');
  const cadetTransactions = allTxs.filter((e) => {
    const expNum = (e.cadetNumber || '').replace(/\D/g, '');
    const matchesNum = Boolean(userNum && expNum && userNum === expNum);
    const matchesUser = Boolean(
      e.userId === user.id ||
      e.cadetId === user.id ||
      (user.cadetNumber && e.cadetNumber === user.cadetNumber) ||
      matchesNum
    );
    return matchesUser && e.billingPeriod === selectedPeriod;
  });

  const totalAmount = cadetTransactions.reduce((acc, curr) => {
    if (curr.status === 'cancelled' || curr.status === 'deferred') return acc;
    return acc + curr.amount;
  }, 0);

  const totalMensalidades = cadetTransactions
    .filter(
      (e) =>
        e.category === 'Mensalidade' ||
        e.category === 'mensalidade_clube' ||
        e.category === 'mensalidade_scaer' ||
        e.category === 'doacao_religiosa'
    )
    .reduce((acc, curr) => (curr.status === 'cancelled' ? acc : acc + curr.amount), 0);

  const totalConsumo = cadetTransactions
    .filter(
      (e) =>
        e.category === 'Consumo' ||
        e.category === 'consumo' ||
        e.category === 'Equipamento' ||
        e.category === 'equipamento' ||
        e.category === 'Taxa Avulsa' ||
        e.category === 'taxa'
    )
    .reduce((acc, curr) => (curr.status === 'cancelled' ? acc : acc + curr.amount), 0);

  const totalEventos = cadetTransactions
    .filter((e) => e.category === 'Evento' || e.category === 'evento')
    .reduce((acc, curr) => (curr.status === 'cancelled' ? acc : acc + curr.amount), 0);

  const currentPeriodObj = availablePeriods.find((p) => p.period === selectedPeriod);

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'mensalidade_scaer':
        return 'Mensalidade SCAER';
      case 'mensalidade_clube':
        return 'Mensalidade Clube';
      case 'doacao_religiosa':
        return 'Culto / Ação Social';
      case 'evento':
      case 'Evento':
        return 'Evento';
      case 'consumo':
      case 'Consumo':
        return 'Consumo Comercial';
      case 'equipamento':
      case 'Equipamento':
        return 'Equipamento';
      case 'taxa':
      case 'Taxa Avulsa':
        return 'Taxa Avulsa';
      case 'parcelamento':
        return 'Parcelamento';
      default:
        return cat || 'Lançamento';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Seletor de Período Limpo e Minimalista */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
        }`}
      >
        <div className="flex items-center space-x-3 mb-3 sm:mb-0">
          <div
            className={`p-2 rounded-lg border ${
              isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider">Período da Cédula</h3>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Selecione o mês para consultar o extrato
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {availablePeriods.map((item) => (
            <button
              key={item.period}
              onClick={() => setSelectedPeriod(item.period)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                selectedPeriod === item.period
                  ? isDark
                    ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                    : 'bg-zinc-900 text-white font-bold shadow-sm'
                  : isDark
                  ? 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid de 4 Métricas de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total da Cédula */}
        <div
          className={`p-4 rounded-xl border transition-colors ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
          }`}
        >
          <div
            className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-1 ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            <span>Total Cédula</span>
            <Receipt className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono">
            R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div
            className={`mt-1.5 text-[10px] font-medium ${
              currentPeriodObj?.status === 'open' ? 'text-amber-500' : 'text-emerald-500'
            }`}
          >
            {currentPeriodObj?.status === 'open' ? 'Cédula em Aberto' : 'Cédula Paga'} • {cadetTransactions.length} lançamentos
          </div>
        </div>

        {/* Mensalidades */}
        <div
          className={`p-4 rounded-xl border transition-colors ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
          }`}
        >
          <div
            className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-1 ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            <span>Mensalidades</span>
            <Tag className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono">
            R$ {totalMensalidades.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className={`mt-1.5 text-[10px] font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            SCAER, Clubes e Cultos
          </div>
        </div>

        {/* Consumo Comercial */}
        <div
          className={`p-4 rounded-xl border transition-colors ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
          }`}
        >
          <div
            className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-1 ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            <span>Consumo Extra</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono">
            R$ {totalConsumo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className={`mt-1.5 text-[10px] font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            COMAFA, Cantina e Diversos
          </div>
        </div>

        {/* Eventos */}
        <div
          className={`p-4 rounded-xl border transition-colors ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
          }`}
        >
          <div
            className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-1 ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            <span>Eventos & Taxas</span>
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono">
            R$ {totalEventos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className={`mt-1.5 text-[10px] font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            InterAFA e Atividades
          </div>
        </div>
      </div>

      {/* Lista / Tabela de Extrato de Lançamentos */}
      <div
        className={`rounded-2xl border overflow-hidden transition-colors ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
        }`}
      >
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Extrato Detalhado — {currentPeriodObj?.label}
            </h3>
          </div>
          <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {cadetTransactions.length} {cadetTransactions.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {cadetTransactions.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Receipt className={`w-8 h-8 mx-auto ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`} />
            <p className="text-xs font-medium text-zinc-500">
              Nenhum lançamento registrado para este período.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {cadetTransactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => setSelectedTransaction(tx)}
                className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                  isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                      tx.category === 'mensalidade_scaer'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                        : isDark
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-400'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold leading-tight">{tx.description}</span>
                      {tx.category === 'mensalidade_scaer' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 uppercase">
                          SCAER
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {tx.clubName}
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span className={`text-[10px] font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {getCategoryLabel(tx.category)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono block">
                      R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        tx.status === 'paid'
                          ? 'text-emerald-500'
                          : tx.status === 'deferred'
                          ? 'text-sky-400'
                          : 'text-amber-500'
                      }`}
                    >
                      {tx.status === 'paid' ? 'Pago' : tx.status === 'deferred' ? 'Adiado' : 'Pendente'}
                    </span>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Detalhes do Lançamento */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Detalhes do Lançamento</h3>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className={`p-1 rounded-lg border ${
                  isDark ? 'bg-zinc-950 border-zinc-800 hover:text-white' : 'bg-zinc-100 border-zinc-200 hover:text-zinc-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className={`block font-semibold uppercase tracking-wider text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Descrição
                </span>
                <p className="font-bold text-sm mt-0.5">{selectedTransaction.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className={`block font-semibold uppercase tracking-wider text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Clube Emissor
                  </span>
                  <p className="font-medium mt-0.5">{selectedTransaction.clubName}</p>
                </div>
                <div>
                  <span className={`block font-semibold uppercase tracking-wider text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Categoria
                  </span>
                  <p className="font-medium mt-0.5">{getCategoryLabel(selectedTransaction.category)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className={`block font-semibold uppercase tracking-wider text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Valor
                  </span>
                  <p className="font-mono font-black text-base text-amber-500 mt-0.5">
                    R$ {selectedTransaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className={`block font-semibold uppercase tracking-wider text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Competência
                  </span>
                  <p className="font-mono font-bold mt-0.5">{selectedTransaction.billingPeriod}</p>
                </div>
              </div>

              <div>
                <span className={`block font-semibold uppercase tracking-wider text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Status
                </span>
                <div className="flex items-center space-x-1.5 mt-1">
                  {selectedTransaction.status === 'paid' ? (
                    <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-500">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Pago / Quitado</span>
                    </span>
                  ) : selectedTransaction.status === 'deferred' ? (
                    <span className="inline-flex items-center space-x-1 text-xs font-bold text-sky-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Adiado para {selectedTransaction.deferredTo}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-xs font-bold text-amber-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pendente de Pagamento</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setSelectedTransaction(null)}
                className={`w-full py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isDark ? 'bg-zinc-950 border-zinc-800 hover:bg-zinc-800' : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200'
                }`}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
