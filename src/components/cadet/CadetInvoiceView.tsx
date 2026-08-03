import React, { useState } from 'react';
import type { Expense, User } from '../../types';
import { Calendar, Receipt, ChevronRight, CheckCircle2, Clock, Info, Tag, ArrowUpRight } from 'lucide-react';

interface CadetInvoiceViewProps {
  user: User;
  expenses: Expense[];
  theme?: 'dark' | 'light';
}

export const CadetInvoiceView: React.FC<CadetInvoiceViewProps> = ({ user, expenses, theme = 'dark' }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-07');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const isDark = theme === 'dark';

  // Períodos disponíveis (Cédula atual e cédulas anteriores)
  const availablePeriods = [
    { period: '2026-07', label: 'Julho / 2026 (Cédula Atual)', status: 'open' },
    { period: '2026-06', label: 'Junho / 2026', status: 'closed' },
    { period: '2026-05', label: 'Maio / 2026', status: 'closed' },
  ];

  // Filtrar gastos do Cadete logado no período selecionado
  const cadetExpenses = expenses.filter(
    (e) => e.userId === user.id && e.billingPeriod === selectedPeriod
  );

  // Somatórios da Cédula
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
    <div className="space-y-6">
      
      {/* Seletor de Mês / Período da Cédula */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border backdrop-blur-xl transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center space-x-3 mb-3 sm:mb-0">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Período da Cédula
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Selecione o mês para consultar o extrato detalhado
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto">
          {availablePeriods.map((item) => (
            <button
              key={item.period}
              onClick={() => setSelectedPeriod(item.period)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center space-x-1.5 shrink-0 ${
                selectedPeriod === item.period
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : isDark
                  ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{item.label}</span>
              {item.status === 'open' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cards com Resumo da Cédula */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total da Cédula */}
        <div className={`p-5 rounded-2xl border shadow-lg backdrop-blur-xl transition-colors ${
          isDark
            ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-cyan-500/30'
            : 'bg-gradient-to-br from-white to-blue-50/50 border-cyan-300'
        }`}>
          <div className={`flex items-center justify-between text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Total da Cédula</span>
            <Receipt className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-black text-cyan-500 font-mono">
            R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-[10px] font-semibold text-slate-400 flex items-center justify-between">
            <span>{cadetExpenses.length} lançamentos</span>
            <span className={`px-2 py-0.5 rounded-full ${
              currentPeriodObj?.status === 'open' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
            }`}>
              {currentPeriodObj?.status === 'open' ? 'Cédula Aberta' : 'Cédula Paga'}
            </span>
          </div>
        </div>

        {/* Mensalidades dos Clubes */}
        <div className={`p-5 rounded-2xl border shadow-sm backdrop-blur-xl transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`flex items-center justify-between text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Mensalidades de Clubes</span>
            <Tag className="w-4 h-4 text-blue-500" />
          </div>
          <div className={`text-xl font-bold font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            R$ {totalMensalidades.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className={`mt-2 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Fixas mensais ativas nos clubes
          </div>
        </div>

        {/* Consumo & Munição */}
        <div className={`p-5 rounded-2xl border shadow-sm backdrop-blur-xl transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`flex items-center justify-between text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Consumo Extra / Serviços</span>
            <ArrowUpRight className="w-4 h-4 text-amber-500" />
          </div>
          <div className={`text-xl font-bold font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            R$ {totalConsumo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className={`mt-2 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Consumos e materiais
          </div>
        </div>

        {/* Eventos e Não Sócios */}
        <div className={`p-5 rounded-2xl border shadow-sm backdrop-blur-xl transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`flex items-center justify-between text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Eventos / Taxas Avulsas</span>
            <Info className="w-4 h-4 text-purple-500" />
          </div>
          <div className={`text-xl font-bold font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            R$ {totalEventos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className={`mt-2 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Convites e ingressos de eventos
          </div>
        </div>

      </div>

      {/* Lista de Gastos da Cédula */}
      <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl shadow-xl transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className={`p-5 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div>
            <h3 className={`text-base font-bold flex items-center space-x-2 ${
              isDark ? 'text-slate-100' : 'text-slate-800'
            }`}>
              <Receipt className="w-5 h-5 text-cyan-500" />
              <span>Extrato Detalhado da Cédula</span>
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Clique para ver o comprovante com o responsável pelo lançamento
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-500 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
            {cadetExpenses.length} itens
          </span>
        </div>

        {cadetExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Nenhum gasto lançado nesta cédula.</p>
          </div>
        ) : (
          <div className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
            {cadetExpenses.map((exp) => (
              <div
                key={exp.id}
                onClick={() => setSelectedExpense(exp)}
                className={`p-4 sm:p-5 transition-colors cursor-pointer flex items-center justify-between group ${
                  isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl flex items-center justify-center ${
                    exp.category === 'Mensalidade'
                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                      : exp.category === 'Consumo'
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                  }`}>
                    <Receipt className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className={`text-sm font-bold transition-colors group-hover:text-cyan-500 ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        {exp.description}
                      </h4>
                      {exp.isNonMemberEvent && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          Evento (Não Sócio)
                        </span>
                      )}
                    </div>

                    <div className={`flex items-center space-x-3 text-xs mt-1 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {exp.clubName}
                      </span>
                      <span>•</span>
                      <span>Lançado por: {exp.createdByName}</span>
                      <span>•</span>
                      <span>{exp.createdAt}</span>
                    </div>
                  </div>

                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className={`text-base font-bold font-mono ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center justify-end space-x-1 text-[10px] mt-0.5">
                      {exp.status === 'paid' ? (
                        <span className="text-emerald-500 flex items-center space-x-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Pago</span>
                        </span>
                      ) : (
                        <span className="text-amber-500 flex items-center space-x-1 font-semibold">
                          <Clock className="w-3 h-3" />
                          <span>Pendente na Cédula</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Comprovante */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Receipt className="w-6 h-6 text-cyan-500" />
                <h3 className="text-base font-bold">Comprovante de Lançamento na Cédula</h3>
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className={`p-4 rounded-2xl border space-y-1 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Descrição</div>
                <div className="text-sm font-bold">{selectedExpense.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[10px] text-slate-400 font-mono">Valor Registrado</div>
                  <div className="text-base font-bold text-cyan-500 font-mono">
                    R$ {selectedExpense.amount.toFixed(2)}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[10px] text-slate-400 font-mono">Categoria</div>
                  <div className="text-xs font-bold">{selectedExpense.category}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <span className="text-slate-400">Cadete:</span>
                  <span className="font-semibold">{selectedExpense.cadetNumber} {selectedExpense.userName}</span>
                </div>
                <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <span className="text-slate-400">Clube Emissor:</span>
                  <span className="font-semibold">{selectedExpense.clubName}</span>
                </div>
                <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <span className="text-slate-400">Responsável pelo Lançamento:</span>
                  <span className="font-semibold">{selectedExpense.createdByName}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Data & Hora de Registro:</span>
                  <span className="font-mono">{selectedExpense.createdAt}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedExpense(null)}
              className={`w-full py-3 rounded-xl font-bold text-xs transition-colors ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
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
