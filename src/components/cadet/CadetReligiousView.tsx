import React, { useState } from 'react';
import type { Club, ClubMembership, Expense, User } from '../../types';
import {
  Heart,
  Church,
  Sparkles,
  HeartHandshake,
  CheckCircle2,
  Calendar,
  XCircle,
  Loader2,
  ShieldCheck
} from 'lucide-react';

interface CadetReligiousViewProps {
  user: User;
  clubs: Club[];
  memberships: ClubMembership[];
  expenses: Expense[];
  onSetDonation: (clubId: string, clubName: string, amount: number) => Promise<void>;
  onCancelDonation: (clubId: string) => Promise<void>;
  theme?: 'dark' | 'light';
}

interface ReligiousEntityConfig {
  code: string;
  defaultName: string;
  tradition: string;
  tagline: string;
  description: string;
  schedule: string;
  icon: React.ElementType;
}

const RELIGIOUS_ENTITIES: ReligiousEntityConfig[] = [
  {
    code: 'ACC',
    defaultName: 'ACC - Associação dos Cadetes Cristãos',
    tradition: 'Evangélico',
    tagline: 'Comunhão, oração e fortalecimento espiritual dos Cadetes Cristãos.',
    description: 'Reuniões semanais de estudo bíblico, louvor e apoio mútuo para a formação moral e espiritual do futuro oficial.',
    schedule: 'Quintas-feiras às 20h00 • Sala de Instrução',
    icon: Heart,
  },
  {
    code: 'CAT',
    defaultName: 'Capelania & Grupo Católico',
    tradition: 'Católico',
    tagline: 'Santa Missa, confissões e vida sacramental na AFA.',
    description: 'Encontros de formação católica, preparação para sacramentos, recitação do Santo Terço e assistência pastoral na Capela.',
    schedule: 'Domingos às 19h00 (Santa Missa) e Terças às 20h30 (Terço)',
    icon: Church,
  },
  {
    code: 'ESP',
    defaultName: 'Grupo de Estudos Espíritas',
    tradition: 'Espírita',
    tagline: 'Estudo do Evangelho, moral cristã e consolo doutrinário.',
    description: 'Encontros fraternos para estudo das obras básicas do Espiritismo, reflexão evangélica, passes e diálogo acolhedor.',
    schedule: 'Quartas-feiras às 20h15 • Sala de Convivência',
    icon: Sparkles,
  },
  {
    code: 'ACS',
    defaultName: 'Campanhas de Ação Social',
    tradition: 'Social',
    tagline: 'Solidariedade e apoio humanitário às comunidades carentes.',
    description: 'Arrecadação e distribuição de alimentos, agasalhos, materiais escolares e apoio a instituições de caridade.',
    schedule: 'Ações mensais e campanhas sazonais da SCAER',
    icon: HeartHandshake,
  },
];

const PRESET_AMOUNTS = [5, 10, 20, 50];

export const CadetReligiousView: React.FC<CadetReligiousViewProps> = ({
  user,
  clubs,
  memberships,
  expenses,
  onSetDonation,
  onCancelDonation,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const currentPeriod = '2026-08';

  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [selectedAmounts, setSelectedAmounts] = useState<Record<string, number>>({});

  // Obter doações ativas do cadete no período
  const userDonationExpenses = expenses.filter(
    (e) =>
      (e.userId === user.id || e.cadetNumber === user.cadetNumber) &&
      e.billingPeriod === currentPeriod &&
      (e.description.toLowerCase().includes('doação') ||
        e.description.toLowerCase().includes('culto') ||
        e.clubName.toLowerCase().includes('acc') ||
        e.clubName.toLowerCase().includes('católico') ||
        e.clubName.toLowerCase().includes('espírita') ||
        e.clubName.toLowerCase().includes('ação social'))
  );

  const totalMonthlyDonation = userDonationExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const handleSelectPreset = (code: string, amount: number) => {
    setSelectedAmounts((prev) => ({ ...prev, [code]: amount }));
    setCustomInputs((prev) => ({ ...prev, [code]: '' }));
  };

  const handleCustomChange = (code: string, val: string) => {
    setCustomInputs((prev) => ({ ...prev, [code]: val }));
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedAmounts((prev) => ({ ...prev, [code]: parsed }));
    }
  };

  const handleConfirmDonation = async (entity: ReligiousEntityConfig) => {
    const amount = selectedAmounts[entity.code] || 10;
    if (amount <= 0) {
      alert('Por favor, selecione ou digite um valor válido para a doação.');
      return;
    }

    setLoadingCode(entity.code);
    try {
      // Localizar clube correspondente no banco
      const matchedClub = clubs.find(
        (c) =>
          c.code?.toUpperCase() === entity.code.toUpperCase() ||
          c.name.toUpperCase().includes(entity.code.toUpperCase()) ||
          c.name.toUpperCase().includes(entity.tradition.toUpperCase())
      );

      const targetClubId = matchedClub?.id || `clb_${entity.code.toLowerCase()}`;
      const targetClubName = matchedClub?.name || entity.defaultName;

      await onSetDonation(targetClubId, targetClubName, amount);
    } catch (err) {
      console.error('Erro ao registrar doação:', err);
      alert('Erro ao registrar doação. Tente novamente.');
    } finally {
      setLoadingCode(null);
    }
  };

  const handleCancel = async (entity: ReligiousEntityConfig) => {
    if (!confirm(`Deseja cancelar sua contribuição mensal para ${entity.defaultName}?`)) return;

    setLoadingCode(entity.code);
    try {
      const matchedClub = clubs.find(
        (c) =>
          c.code?.toUpperCase() === entity.code.toUpperCase() ||
          c.name.toUpperCase().includes(entity.code.toUpperCase()) ||
          c.name.toUpperCase().includes(entity.tradition.toUpperCase())
      );

      const targetClubId = matchedClub?.id || `clb_${entity.code.toLowerCase()}`;
      await onCancelDonation(targetClubId);
    } catch (err) {
      console.error('Erro ao cancelar doação:', err);
      alert('Erro ao cancelar doação.');
    } finally {
      setLoadingCode(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header Banner com Métricas */}
      <div className={`p-4 sm:p-5 rounded-xl border transition-colors ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-2xl space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
              }`}>
                SCAER • ASSISTÊNCIA RELIGIOSA E SOCIAL
              </span>
              <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                CONTRIBUIÇÃO LIVRE
              </span>
            </div>

            <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Cultos Religiosos & Ação Social
            </h2>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Apoie as atividades dos cultos religiosos da AFA e projetos sociais. Os valores escolhidos são incluídos mensalmente na sua Cédula Digital.
            </p>
          </div>

          <div className={`p-3.5 rounded-xl border flex flex-col items-end justify-center min-w-[190px] ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Doação Mensal Total
            </span>
            <span className={`text-xl font-black font-mono mt-0.5 ${isDark ? 'text-zinc-100' : 'text-zinc-950'}`}>
              R$ {totalMonthlyDonation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {userDonationExpenses.length} {userDonationExpenses.length === 1 ? 'culto apoiado' : 'cultos apoiados'} em {currentPeriod}
            </span>
          </div>
        </div>
      </div>

      {/* Grid com os 4 Cards de Cultos Religiosos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RELIGIOUS_ENTITIES.map((entity) => {
          const Icon = entity.icon;
          const isLoading = loadingCode === entity.code;

          // Localizar gasto de doação ativo para esta entidade
          const activeDonation = userDonationExpenses.find(
            (e) =>
              e.description.toLowerCase().includes(entity.code.toLowerCase()) ||
              e.description.toLowerCase().includes(entity.tradition.toLowerCase()) ||
              e.clubName.toLowerCase().includes(entity.code.toLowerCase()) ||
              e.clubName.toLowerCase().includes(entity.tradition.toLowerCase())
          );

          // Localizar adesão ativa
          const activeMem = memberships.find(
            (m) =>
              m.userId === user.id &&
              (m.status === 'approved' || m.status === 'active') &&
              ((m.clubName || '').toLowerCase().includes(entity.code.toLowerCase()) ||
                (m.clubName || '').toLowerCase().includes(entity.tradition.toLowerCase()))
          );

          const currentAmount = activeDonation?.amount || (activeMem?.notes ? parseFloat(activeMem.notes.replace(/[^\d.,]/g, '').replace(',', '.')) : 0) || 0;
          const isContributing = currentAmount > 0;
          const selectedValue = selectedAmounts[entity.code] !== undefined ? selectedAmounts[entity.code] : (currentAmount || 10);

          return (
            <div
              key={entity.code}
              className={`rounded-xl border p-4 sm:p-5 flex flex-col justify-between transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
              }`}
            >
              <div className="space-y-3">
                
                {/* Header do Card */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                          {entity.defaultName}
                        </h3>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {entity.tradition}
                      </span>
                    </div>
                  </div>

                  {isContributing ? (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center space-x-1 ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-800'
                    }`}>
                      <CheckCircle2 className="w-3 h-3 text-zinc-400" />
                      <span>R$ {currentAmount.toFixed(2)}/mês</span>
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-500' : 'bg-zinc-50 border-zinc-200 text-zinc-500'
                    }`}>
                      Sem doação
                    </span>
                  )}
                </div>

                <p className={`text-xs leading-relaxed line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {entity.description}
                </p>

                <div className={`p-2 rounded-lg border text-[11px] flex items-center space-x-2 ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}>
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{entity.schedule}</span>
                </div>

                {/* Seletor de Valor de Doação */}
                <div className="pt-1 space-y-1.5">
                  <label className={`text-[10px] font-semibold uppercase tracking-wider block ${
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  }`}>
                    Contribuição mensal:
                  </label>

                  <div className="grid grid-cols-4 gap-1.5">
                    {PRESET_AMOUNTS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSelectPreset(entity.code, preset)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-all ${
                          selectedValue === preset && !customInputs[entity.code]
                            ? isDark
                              ? 'bg-zinc-100 text-zinc-950 border-white shadow-xs'
                              : 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                            : isDark
                              ? 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                              : 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-100'
                        }`}
                      >
                        R$ {preset}
                      </button>
                    ))}
                  </div>

                  {/* Campo de Valor Personalizado */}
                  <div className="flex items-center space-x-2 pt-1">
                    <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Outro valor:
                    </span>
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400">
                        R$
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Ex: 30"
                        value={customInputs[entity.code] || ''}
                        onChange={(e) => handleCustomChange(entity.code, e.target.value)}
                        className={`w-full border rounded-lg pl-8 pr-3 py-1 text-xs font-mono focus:outline-none ${
                          isDark
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-zinc-700'
                            : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-500 shadow-xs'
                        }`}
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Botões de Ação do Card */}
              <div className={`pt-3 border-t mt-4 flex items-center justify-between gap-2 ${
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              }`}>
                {isContributing && (
                  <button
                    disabled={isLoading}
                    onClick={() => handleCancel(entity)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center space-x-1 ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-500/30'
                        : 'bg-white border-zinc-300 text-zinc-600 hover:text-red-600 hover:border-red-300 shadow-xs'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Pausar</span>
                  </button>
                )}

                <button
                  disabled={isLoading}
                  onClick={() => handleConfirmDonation(entity)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    isDark
                      ? 'bg-zinc-100 text-zinc-950 hover:bg-white'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-xs'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {isContributing
                          ? `Atualizar: R$ ${selectedValue.toFixed(2)}/mês`
                          : `Doar R$ ${selectedValue.toFixed(2)}/mês`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Informativo de Transparência SCAER */}
      <div className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
        isDark ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
      }`}>
        <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            Prestação de Contas
          </p>
          <p className="text-[11px] leading-relaxed">
            100% dos valores arrecadados pela Cédula Digital são repassados integralmente aos coordenadores de cada culto e Ação Social para manutenção das atividades e campanhas beneficentes.
          </p>
        </div>
      </div>

    </div>
  );
};
