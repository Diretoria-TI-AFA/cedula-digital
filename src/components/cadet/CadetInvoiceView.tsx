import React, { useState } from 'react';
import type { Expense, User } from '../../types';
import { Calendar, Receipt, ChevronRight, Info, Tag, ArrowUpRight, X } from 'lucide-react';

interface CadetInvoiceViewProps {
  user: User;
  expenses: Expense[];
  theme?: 'dark' | 'light';
}

export const CadetInvoiceView: React.FC<CadetInvoiceViewProps> = ({ user, expenses, theme = 'dark' }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-07');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const isDark = theme === 'dark';

  const availablePeriods = [
    { period: '2026-08', label: 'Agosto / 2026', status: 'open' },
    { period: '2026-07', label: 'Julho / 2026 (Atual)', status: 'open' },
    { period: '2026-06', label: 'Junho / 2026', status: 'closed' },
    { period: '2026-05', label: 'Maio / 2026', status: 'closed' },
    { period: '2026-04', label: 'Abril / 2026', status: 'closed' },
    { period: '2026-03', label: 'Março / 2026', status: 'closed' },
    { period: '2026-02', label: 'Fevereiro / 2026', status: 'closed' },
    { period: '2026-01', label: 'Janeiro / 2026', status: 'closed' },
  ];

  const cadetExpenses = expenses.filter(
    (e) => (e.userId === user.id || (user.cadetNumber && e.cadetNumber === user.cadetNumber)) && e.billingPeriod === selectedPeriod
  );

  const totalAmount = cadetExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalMensalidades = cadetExpenses
    .filter((e) => e.category === 'Mensalidade')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalConsumo = cadetExpenses
    .filter((e) => e.category === 'Consumo' || e.category === 'Equipamento' || e.category === 'Taxa Avulsa')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalEventos = cadetExpenses
    .filter((e) => e.category === 'Evento')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const currentPeriodObj = availablePeriods.find((p) => p.period === selectedPeriod);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Seletor de Período */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-colors ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
      }`}>
        <div className="flex items-center space-x-3 mb-3 sm:mb-0">
          <div className={`p-2 rounded-lg border ${
            isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
          }`}>
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Período da Cédula
            </h3>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Selecione o mês para consultar o extrato
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {availablePeriods.map((item) => (
            <button
              key={item.period}
              onClick={() => setSelectedPeriod(item.period)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                selectedPeriod === item.period
                  ? isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
                  : isDark ? 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Resumo Minimalista */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Total da Cédula */}
        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-1 ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            <span>Total Cédula</span>
            <Receipt className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono">
            R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className={`mt-1.5 text-[10px] font-medium ${
            currentPeriodObj?.status === 'open' ? 'text-amber-500' : 'text-emerald-500'
          }`}>
            {currentPeriodObj?.status === 'open' ? 'Cédula Aberta' : 'Cédula Paga'} • {cadetExpenses.length} lançamentos
          </div>
        </div>

        {/* Mensalidades */}
        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-1 ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            <span>Mensalidades</span>
            <Tag className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono">
            R$ {totalMensalidades.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className={`mt-1.5 text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Mensalidades de clubes
          </div>
        </div>

        {/* Consumo Extra */}
        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-1 ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            <span>Consumo Extra</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono">
            R$ {totalConsumo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className={`mt-1.5 text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Materiais e serviços
          </div>
        </div>

        {/* Eventos */}
        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-1 ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            <span>Eventos</span>
            <Info className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono">
            R$ {totalEventos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className={`mt-1.5 text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Ingressos e avulsos
          </div>
        </div>

      </div>

      {/* Lista de Gastos */}
      <div className={`rounded-xl border overflow-hidden transition-colors ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        }`}>
          <div>
            <h3 className="text-sm font-bold">
              Extrato Detalhado
            </h3>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Clique para visualizar o comprovante individual
            </p>
          </div>
          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
            isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
          }`}>
            {cadetExpenses.length} itens
          </span>
        </div>

        {cadetExpenses.length === 0 ? (
          <div className="p-10 text-center text-zinc-400">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">Nenhum lançamento registrado neste mês.</p>
          </div>
        ) : (
          <div className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-zinc-200'}`}>
            {cadetExpenses.map((exp) => (
              <div
                key={exp.id}
                onClick={() => setSelectedExpense(exp)}
                className={`p-3.5 sm:p-4 transition-colors cursor-pointer flex items-center justify-between group ${
                  isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg border ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                  }`}>
                    <Receipt className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold">
                        {exp.description}
                      </h4>
                      {exp.isNonMemberEvent && (
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border uppercase ${
                          isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-300 text-zinc-700'
                        }`}>
                          Não Sócio
                        </span>
                      )}
                    </div>

                    <div className={`flex items-center space-x-2 text-[11px] mt-0.5 ${
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    }`}>
                      <span className="font-semibold">{exp.clubName}</span>
                      <span>•</span>
                      <span>{exp.createdByName}</span>
                      <span>•</span>
                      <span>{exp.createdAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono">
                      R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] font-medium mt-0.5">
                      {exp.status === 'paid' ? (
                        <span className="text-emerald-500">Pago</span>
                      ) : (
                        <span className="text-amber-500">Pendente</span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-100 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Comprovante Flat */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-xl border p-5 space-y-4 ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-lg'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider">Comprovante de Lançamento</h3>
              <button
                onClick={() => setSelectedExpense(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className={`p-3 rounded-lg border space-y-0.5 ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <span className="text-[10px] text-zinc-400 uppercase font-mono">Descrição</span>
                <div className="text-xs font-bold">{selectedExpense.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2.5 rounded-lg border ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <span className="text-[10px] text-zinc-400 font-mono">Valor</span>
                  <div className="text-sm font-bold font-mono">
                    R$ {selectedExpense.amount.toFixed(2)}
                  </div>
                </div>

                <div className={`p-2.5 rounded-lg border ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <span className="text-[10px] text-zinc-400 font-mono">Categoria</span>
                  <div className="text-xs font-bold">{selectedExpense.category}</div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs pt-1">
                <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-400">Cadete:</span>
                  <span className="font-medium">{selectedExpense.cadetNumber} {selectedExpense.userName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-400">Clube Emissor:</span>
                  <span className="font-medium">{selectedExpense.clubName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-400">Responsável:</span>
                  <span className="font-medium">{selectedExpense.createdByName}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Data/Hora:</span>
                  <span className="font-mono text-zinc-400">{selectedExpense.createdAt}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedExpense(null)}
              className={`w-full py-2 rounded-lg font-semibold text-xs transition-colors ${
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
              }`}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
