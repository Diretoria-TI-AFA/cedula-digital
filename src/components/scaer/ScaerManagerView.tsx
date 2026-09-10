import React, { useState, useEffect } from 'react';
import type { Club, ClubMembership, Expense, User, ScaerConfig } from '../../types';
import { getNextPeriod } from '../../lib/pocketbase';
import { LaunchExpenseModal } from './LaunchExpenseModal';
import { QRCodeExpenseScanner } from '../common/QRCodeExpenseScanner';
import {
  Users,
  PlusCircle,
  CheckCircle2,
  Calendar,
  Receipt,
  Search,
  Bell,
  UserPlus,
  UserMinus,
  QrCode,
  TrendingUp,
  BarChart3,
  Filter,
  Eye,
  X,
  Award,
  Wallet,
  DollarSign,
  Settings,
  Zap,
  Clock,
  Shield,
  Sparkles,
  Lock,
} from 'lucide-react';

interface ScaerManagerViewProps {
  user: User;
  clubs: Club[];
  memberships: ClubMembership[];
  expenses: Expense[];
  allCadets: User[];
  scaerConfig?: ScaerConfig | null;
  onUpdateScaerConfig?: (config: Partial<ScaerConfig>) => Promise<void>;
  onTriggerMonthlyBilling?: (period: string) => Promise<boolean>;
  onConsolidateDay20?: (targetPeriod?: string) => Promise<{ convertedCount: number; period: string }>;
  onGenerateAllPreviews?: (targetPeriod?: string) => Promise<{ cadetsProcessed: number }>;
  onUpdateMembershipStatus: (membershipId: string, status: 'approved' | 'rejected' | 'inactive') => Promise<void>;
  onLaunchIndividual: (launch: Omit<Expense, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  onLaunchBulk: (launches: Omit<Expense, 'id' | 'createdAt' | 'status'>[]) => Promise<void>;
  onTriggerRecurring: (clubId: string, billingPeriod: string) => Promise<number>;
  theme?: 'dark' | 'light';
}

export const ScaerManagerView: React.FC<ScaerManagerViewProps> = ({
  user,
  clubs,
  memberships,
  expenses,
  allCadets,
  scaerConfig,
  onUpdateScaerConfig,
  onTriggerMonthlyBilling,
  onConsolidateDay20,
  onGenerateAllPreviews,
  onUpdateMembershipStatus,
  onLaunchIndividual,
  onLaunchBulk,
  onTriggerRecurring,
  theme = 'dark',
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'cashflow' | 'charts' | 'requests' | 'config'>('members');
  const [showLaunchModal, setShowLaunchModal] = useState<boolean>(false);
  const [showQrScanner, setShowQrScanner] = useState<boolean>(false);
  const [scannedCadetInfo, setScannedCadetInfo] = useState<{ cadetNumber: string; warName?: string } | null>(null);

  // Estado de edição da configuração SCAER
  const [monthlyFeeInput, setMonthlyFeeInput] = useState<string>(
    scaerConfig ? String(scaerConfig.scaerMonthlyFee) : '100'
  );
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [isTriggeringBilling, setIsTriggeringBilling] = useState<boolean>(false);
  const [isConsolidatingDay20, setIsConsolidatingDay20] = useState<boolean>(false);
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState<boolean>(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (scaerConfig) {
      setMonthlyFeeInput(String(scaerConfig.scaerMonthlyFee));
    }
  }, [scaerConfig]);
  
  // Filtros de Caixa e Busca
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-09');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modal de Detalhamento do Cadete
  const [selectedCadetDetail, setSelectedCadetDetail] = useState<{ cadetNumber: string; userName: string; squadron?: string } | null>(null);

  const isDark = theme === 'dark';

  const fallbackClub: Club = {
    id: 'clb_geraes',
    name: user.warName || 'GERAES',
    monthlyFee: 20,
    category: 'Investimentos',
  };

  // Encontrar o clube inicial do usuário por ID, Nome de Guerra ou E-mail
  const initialClub =
    clubs.find((c) => c.id === user.clubId) ||
    clubs.find((c) => user.warName && c.name.toUpperCase().includes(user.warName.toUpperCase())) ||
    clubs.find((c) => user.email && user.email.toUpperCase().includes(c.name.toUpperCase().replace(/\s+/g, ''))) ||
    clubs[0];

  const [selectedClubId, setSelectedClubId] = useState<string>(() => initialClub?.id || '');

  // Atualizar quando `user` ou `clubs` mudarem
  React.useEffect(() => {
    if (initialClub?.id) {
      setSelectedClubId(initialClub.id);
    }
  }, [user.id, user.clubId, clubs]);

  const managedClub = clubs.find((c) => c.id === selectedClubId) || initialClub || fallbackClub;

  // Memberships do Clube
  const clubMemberships = memberships.filter((m) => m.clubId === managedClub.id);
  const activeMembers = clubMemberships.filter((m) => m.status === 'approved' || m.status === 'active');
  const pendingRequests = clubMemberships.filter(
    (m) => m.status === 'pending_entry' || m.status === 'pending_exit'
  );

  // Lançamentos e Caixa do Clube
  const clubExpenses = expenses.filter((e) => e.clubId === managedClub.id);
  
  // Lançamentos filtrados por Período e Categoria
  const filteredExpenses = clubExpenses.filter((e) => {
    const matchPeriod = selectedPeriod === 'all' || e.billingPeriod === selectedPeriod;
    const matchCategory = selectedCategory === 'all' || e.category === selectedCategory;
    const cadetName = (e.userName || e.cadetName || '').toLowerCase();
    const num = (e.cadetNumber || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    const matchSearch = cadetName.includes(q) || num.includes(q) || desc.includes(q);
    return matchPeriod && matchCategory && matchSearch;
  });

  // Métricas Financeiras
  const periodExpenses = clubExpenses.filter((e) => selectedPeriod === 'all' || e.billingPeriod === selectedPeriod);
  const totalPeriodRevenue = periodExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const recurringRevenue = periodExpenses.filter(e => e.category === 'Mensalidade' || e.category === 'mensalidade_clube').reduce((acc, curr) => acc + curr.amount, 0);
  const consumptionRevenue = periodExpenses.filter(e => e.category !== 'Mensalidade' && e.category !== 'mensalidade_clube').reduce((acc, curr) => acc + curr.amount, 0);

  // Filtro de Sócios para a Tabela de Membros
  const filteredMembers = activeMembers.filter(
    (m) =>
      (m.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.cadetNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.squadron || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handler ao escanear o QR Code do Cadete
  const handleQrScanSuccess = (cadetNumber: string, warName?: string) => {
    setScannedCadetInfo({ cadetNumber, warName });
    setShowQrScanner(false);
    setShowLaunchModal(true);
  };

  // Lançamentos por Sócios (Totais e por Período)
  const getCadetTotalSpent = (cadetNumber: string) => {
    return periodExpenses
      .filter((e) => e.cadetNumber === cadetNumber || e.userName === cadetNumber || e.cadetName === cadetNumber)
      .reduce((acc, curr) => acc + curr.amount, 0);
  };

  // Ranking Top 5 Cadetes Consumidores
  const cadetConsumptionMap = new Map<string, { cadetNumber: string; userName: string; total: number }>();
  periodExpenses.forEach((exp) => {
    const key = exp.cadetNumber || exp.userName || exp.cadetName || exp.id || 'unknown';
    const current = cadetConsumptionMap.get(key) || {
      cadetNumber: exp.cadetNumber || '---',
      userName: exp.userName || exp.cadetName || 'Cadete',
      total: 0,
    };
    current.total += exp.amount;
    cadetConsumptionMap.set(key, current);
  });
  const topCadets = Array.from(cadetConsumptionMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Evolução Mensal do Caixa (Dados para o Gráfico de Barras)
  const availablePeriods = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

  const monthlyRevenueData = availablePeriods.map((period) => {
    const periodSum = clubExpenses
      .filter((e) => e.billingPeriod === period)
      .reduce((acc, curr) => acc + curr.amount, 0);
    return { period, total: periodSum };
  });
  const maxMonthlyRevenue = Math.max(...monthlyRevenueData.map((d) => d.total), 100);

  // Evolução de Sócios (Estimada a partir da data de aprovação)
  const memberGrowthData = availablePeriods.map((period) => {
    const count = activeMembers.filter((m) => {
      if (!m.approvedAt) return true;
      return m.approvedAt.substring(0, 7) <= period;
    }).length;
    return { period, count: count > 0 ? count : activeMembers.length };
  });
  const maxMemberCount = Math.max(...memberGrowthData.map((d) => d.count), 10);

  return (
    <div className="space-y-6">
      
      {/* Banner Principal do Clube Administrado */}
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
                GESTOR DE CLUBE
              </span>

              {/* Seletor do Clube Administrado */}
              <select
                value={managedClub.id}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border focus:outline-none cursor-pointer ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                }`}
              >
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    Clube: {c.name} (R$ {c.monthlyFee.toFixed(2)}/mês)
                  </option>
                ))}
              </select>
            </div>

            <h2 className="text-xl font-bold tracking-tight">
              Gestão Financeira & Sócios: {managedClub.name}
            </h2>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Gestor: <strong className="font-semibold">{user.warName || user.name}</strong> • Mensalidade: R$ {managedClub.monthlyFee.toFixed(2)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Botão de Leitor de QR Code */}
            <button
              onClick={() => setShowQrScanner(true)}
              className={`px-4 py-2 rounded-lg font-semibold text-xs border transition-colors flex items-center space-x-1.5 ${
                isDark
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900'
              }`}
              title="Escanear QR Code do Cadete"
            >
              <QrCode className="w-4 h-4" />
              <span>Escanear QR ID</span>
            </button>

            {/* Botão Lançar Gasto */}
            <button
              onClick={() => {
                setScannedCadetInfo(null);
                setShowLaunchModal(true);
              }}
              className={`px-4 py-2 rounded-lg font-semibold text-xs transition-colors flex items-center space-x-1.5 ${
                isDark
                  ? 'bg-zinc-100 text-zinc-950 hover:bg-white'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Lançar na Cédula</span>
            </button>
          </div>
        </div>
      </div>

      {/* BANNER RECORRENTE E PEDIDOS PENDENTES */}
      {pendingRequests.length > 0 && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
          isDark ? 'bg-zinc-900 border-zinc-800 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center space-x-2.5">
            <Bell className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold">
              Você possui {pendingRequests.length} solicitação(ões) pendente(s) de entrada/saída de sócios.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1 rounded-lg font-semibold text-xs border transition-colors ${
              isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-200 hover:text-white' : 'bg-white border-zinc-300 text-zinc-800'
            }`}
          >
            Ver Pedidos
          </button>
        </div>
      )}

      {/* Cards de Métricas Principais de Caixa do Clube */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-1 ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            <span>Caixa Total Mês ({selectedPeriod})</span>
            <Wallet className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono">
            R$ {totalPeriodRevenue.toFixed(2)}
          </div>
          <div className={`mt-1 text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Arrecadação total do clube
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-1 ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            <span>Mensalidades Recorrentes</span>
            <Receipt className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono">
            R$ {recurringRevenue.toFixed(2)}
          </div>
          <div className={`mt-1 text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {activeMembers.length} sócios ativos (R$ {managedClub.monthlyFee}/mês)
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-1 ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            <span>Consumos & Avulsos</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono">
            R$ {consumptionRevenue.toFixed(2)}
          </div>
          <div className={`mt-1 text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Gastos extras e materiais
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-1 ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            <span>Mensalidades em Lote</span>
            <Calendar className="w-4 h-4" />
          </div>
          <button
            onClick={async () => {
              const count = await onTriggerRecurring(managedClub.id, selectedPeriod === 'all' ? '2026-07' : selectedPeriod);
              alert(`${count} mensalidade(s) de R$ ${managedClub.monthlyFee.toFixed(2)} gerada(s) para os sócios ativos!`);
            }}
            className={`w-full mt-1 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 ${
              isDark ? 'bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-100' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Gerar Mensalidades</span>
          </button>
        </div>

      </div>

      {/* Menu Superior de Abas do Presidente */}
      <div className={`flex items-center space-x-1.5 border-b pb-1 overflow-x-auto ${
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      }`}>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'members'
              ? isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
              : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Sócios ({activeMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cashflow')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'cashflow'
              ? isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
              : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Caixa & Extrato ({periodExpenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'charts'
              ? isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
              : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Evolução</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'requests'
              ? isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
              : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Pedidos ({pendingRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'config'
              ? isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
              : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configurações SCAER</span>
        </button>
      </div>

      {/* ABA 1: GESTÃO DE SÓCIOS E DETALHAMENTO INDIVIDUAL */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar sócio por número, guerra ou esquadrão..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              />
            </div>

            <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
              <span>Total de Sócios Ativos:</span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-mono">
                {activeMembers.length} cadetes
              </span>
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
                    <th className="p-4">Nº / Nome de Guerra</th>
                    <th className="p-4">Esquadrão</th>
                    <th className="p-4">Status no Clube</th>
                    <th className="p-4">Gastos em {selectedPeriod}</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {filteredMembers.map((m) => {
                    const cadetSpent = getCadetTotalSpent(m.cadetNumber);
                    return (
                      <tr key={m.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                        <td className="p-4">
                          <div className="font-bold font-mono text-amber-500 text-sm">
                            {m.cadetNumber} {m.userName}
                          </div>
                        </td>
                        <td className="p-4 opacity-80">{m.squadron || 'Athos'}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Sócio Ativo</span>
                          </span>
                        </td>
                        <td className="p-4 font-bold font-mono text-emerald-400">
                          R$ {cadetSpent.toFixed(2)}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedCadetDetail({ cadetNumber: m.cadetNumber, userName: m.userName, squadron: m.squadron })}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 text-[11px] transition-all inline-flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Extrato do Sócio</span>
                          </button>

                          <button
                            onClick={() => {
                              setScannedCadetInfo({ cadetNumber: m.cadetNumber, warName: m.userName });
                              setShowLaunchModal(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-bold border border-amber-500/30 text-[11px] transition-all"
                          >
                            + Lançar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CAIXA DO CLUBE & EXTRATO COM FILTROS */}
      {activeTab === 'cashflow' && (
        <div className="space-y-6">
          {/* Barra de Filtros */}
          <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Filtro de Período */}
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className={`border rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">Todos os Meses</option>
                  <option value="2026-10">Outubro / 2026 (Prévia)</option>
                  <option value="2026-09">Setembro / 2026</option>
                  <option value="2026-08">Agosto / 2026</option>
                  <option value="2026-07">Julho / 2026</option>
                  <option value="2026-06">Junho / 2026</option>
                  <option value="2026-05">Maio / 2026</option>
                </select>
              </div>

              {/* Filtro de Categoria */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-cyan-400 shrink-0" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`border rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">Todas as Categorias</option>
                  <option value="Mensalidade">Mensalidades</option>
                  <option value="Consumo">Consumo / Bar</option>
                  <option value="Evento">Eventos</option>
                  <option value="Equipamento">Equipamentos</option>
                  <option value="Taxa Avulsa">Taxa Avulsa</option>
                </select>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por cadete ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full border rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              />
            </div>
          </div>

          {/* Tabela de Lançamentos */}
          <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl shadow-xl transition-colors ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`font-mono uppercase border-b ${
                  isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="p-4">Cadete</th>
                    <th className="p-4">Descrição do Gasto</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Mês</th>
                    <th className="p-4">Valor (R$)</th>
                    <th className="p-4">Lançado por</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Nenhum lançamento encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                        <td className="p-4 font-bold font-mono text-cyan-500">
                          {exp.cadetNumber} {exp.userName}
                        </td>
                        <td className="p-4">
                          {exp.description}
                          {exp.isNonMemberEvent && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-400 font-bold">
                              Não Sócio
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            exp.category === 'Mensalidade'
                              ? 'bg-blue-500/20 text-blue-400'
                              : exp.category === 'Consumo'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-indigo-500/20 text-indigo-400'
                          }`}>
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-4 font-mono opacity-80">{exp.billingPeriod}</td>
                        <td className="p-4 font-bold text-amber-500 font-mono">R$ {exp.amount.toFixed(2)}</td>
                        <td className="p-4 opacity-80">{exp.createdByName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: GRÁFICOS & ANALYTICS DE CAIXA E SÓCIOS */}
      {activeTab === 'charts' && (
        <div className="space-y-6 animate-in fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gráfico 1: Evolução do Caixa (Receita Mensal) */}
            <div className={`p-6 rounded-3xl border shadow-xl backdrop-blur-xl transition-colors ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-extrabold flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <span>Evolução do Caixa Mensal (R$)</span>
                  </h3>
                  <p className="text-xs text-slate-400">Arrecadação total do clube por mês de apuração</p>
                </div>
              </div>

              {/* Gráfico de Barras SVG Customizado */}
              <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-800 pb-2">
                {monthlyRevenueData.map((item) => {
                  const heightPct = Math.max((item.total / maxMonthlyRevenue) * 100, 8);
                  return (
                    <div key={item.period} className="flex-1 flex flex-col items-center group relative">
                      {/* Tooltip Hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-950 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-[10px] font-mono font-bold pointer-events-none z-20 whitespace-nowrap shadow-lg">
                        R$ {item.total.toFixed(2)}
                      </div>

                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full max-w-[36px] rounded-t-xl bg-gradient-to-t from-emerald-600 via-cyan-500 to-emerald-400 transition-all duration-500 group-hover:scale-105 shadow-lg shadow-emerald-500/20"
                      />
                      <span className="text-[10px] font-mono font-bold text-slate-400 mt-2">
                        {item.period.replace('2026-', '')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gráfico 2: Evolução da Quantidade de Sócios */}
            <div className={`p-6 rounded-3xl border shadow-xl backdrop-blur-xl transition-colors ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-extrabold flex items-center space-x-2">
                    <Users className="w-5 h-5 text-amber-500" />
                    <span>Evolução do Quadro de Sócios</span>
                  </h3>
                  <p className="text-xs text-slate-400">Quantidade de cadetes associados ativos ao longo dos meses</p>
                </div>
              </div>

              {/* Gráfico de Linhas / Colunas com Destaque */}
              <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-800 pb-2">
                {memberGrowthData.map((item) => {
                  const heightPct = Math.max((item.count / maxMemberCount) * 100, 10);
                  return (
                    <div key={item.period} className="flex-1 flex flex-col items-center group relative">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-950 text-amber-400 border border-amber-500/30 px-2 py-1 rounded text-[10px] font-mono font-bold pointer-events-none z-20 whitespace-nowrap shadow-lg">
                        {item.count} sócios
                      </div>

                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full max-w-[36px] rounded-t-xl bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 transition-all duration-500 group-hover:scale-105 shadow-lg shadow-amber-500/20"
                      />
                      <span className="text-[10px] font-mono font-bold text-slate-400 mt-2">
                        {item.period.replace('2026-', '')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Ranking dos Maiores Consumidores do Clube */}
          <div className={`p-6 rounded-3xl border shadow-xl backdrop-blur-xl transition-colors ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center space-x-2 mb-4">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-extrabold">Top 5 Cadetes Mais Ativos no Clube ({selectedPeriod})</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {topCadets.map((cadet, idx) => (
                <div
                  key={cadet.cadetNumber}
                  className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2 transition-colors ${
                    isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center justify-center font-mono">
                      #{idx + 1}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Top Cadete</span>
                  </div>

                  <div>
                    <div className="font-bold text-xs font-mono text-cyan-400">
                      {cadet.cadetNumber}
                    </div>
                    <div className="text-xs font-extrabold text-slate-200 truncate">
                      {cadet.userName}
                    </div>
                  </div>

                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    R$ {cadet.total.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ABA 4: CAIXA DE PEDIDOS PENDENTES */}
      {activeTab === 'requests' && (
        <div className={`p-6 rounded-3xl border shadow-xl transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <h3 className="text-base font-extrabold mb-4 flex items-center space-x-2">
            <Bell className="w-5 h-5 text-amber-500" />
            <span>Solicitações Pendentes de Adesão ou Desligamento</span>
          </h3>

          {pendingRequests.length === 0 ? (
            <div className="py-12 text-center text-xs font-medium text-slate-400">
              Nenhuma solicitação pendente no momento. Todos os pedidos de sócios foram analisados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
                    isDark ? 'bg-slate-950/90 border-amber-500/30' : 'bg-white border-amber-200 shadow-sm'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      {req.status === 'pending_entry' ? (
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center space-x-1">
                          <UserPlus className="w-3 h-3" />
                          <span>Pedido de Entrada</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-red-500/20 text-red-500 border border-red-500/30 flex items-center space-x-1">
                          <UserMinus className="w-3 h-3" />
                          <span>Pedido de Saída</span>
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-200 font-mono">
                      {req.cadetNumber} {req.userName}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {req.squadron} • Solicitado em {req.requestedAt}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateMembershipStatus(req.id, req.status === 'pending_entry' ? 'approved' : 'inactive')}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md"
                    >
                      Aprovar
                    </button>
                    <button
                      onClick={() => onUpdateMembershipStatus(req.id, 'rejected')}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
                    >
                      Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 5: CONFIGURAÇÕES DA SCAER & MENSALIDADE OBRIGATÓRIA */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div
            className={`p-6 rounded-2xl border transition-colors ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div
                className={`p-2.5 rounded-xl border ${
                  isDark ? 'bg-amber-950/40 border-amber-800 text-amber-400' : 'bg-amber-100 border-amber-300 text-amber-800'
                }`}
              >
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Parâmetros Institucionais da SCAER</h3>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Defina o valor da mensalidade SCAER obrigatória e gerencie o faturamento automático.
                </p>
              </div>
            </div>

            {configSuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{configSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Card de Valor da Mensalidade */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Valor da Mensalidade SCAER (Obrigatória)
                  </h4>
                </div>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Este valor será cobrado automaticamente na cédula de todos os cadetes da AFA no dia 1º de cada mês.
                </p>

                <div className="flex items-center space-x-2 pt-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">R$</span>
                    <input
                      type="number"
                      step="0.50"
                      value={monthlyFeeInput}
                      onChange={(e) => setMonthlyFeeInput(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-sm font-bold font-mono rounded-lg border focus:outline-none ${
                        isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                    />
                  </div>

                  <button
                    disabled={isSavingConfig}
                    onClick={async () => {
                      if (!onUpdateScaerConfig) return;
                      setIsSavingConfig(true);
                      try {
                        const fee = parseFloat(monthlyFeeInput) || 100;
                        await onUpdateScaerConfig({ scaerMonthlyFee: fee });
                        setConfigSuccessMsg('Valor da mensalidade SCAER atualizado com sucesso!');
                        setTimeout(() => setConfigSuccessMsg(null), 4000);
                      } catch (err) {
                        alert('Erro ao salvar configuração: ' + err);
                      } finally {
                        setIsSavingConfig(false);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors shrink-0 ${
                      isDark ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950' : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                  >
                    {isSavingConfig ? 'Salvando...' : 'Salvar Valor'}
                  </button>
                </div>
              </div>

              {/* Card de Consolidação Definitiva do Dia 20 */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-zinc-950 border-amber-900/40' : 'bg-amber-50/50 border-amber-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Consolidação Definitiva do Dia 20
                  </h4>
                </div>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Converte todas as transações com status <strong>'preview'</strong> do próximo mês em cobranças definitivas (<strong>'pending'</strong>),
                  efetiva as transições de clubes pendentes e atualiza o fechamento financeiro do período.
                </p>

                <div className="pt-2">
                  <button
                    disabled={isConsolidatingDay20}
                    onClick={async () => {
                      if (!onConsolidateDay20) return;
                      const nextPer = getNextPeriod(scaerConfig?.currentBillingPeriod || '2026-09');
                      const confirm = window.confirm(
                        `Deseja executar a consolidação definitiva do Dia 20 para o período ${nextPer}? Todas as prévias desse período se tornarão lançamentos definitivos!`
                      );
                      if (!confirm) return;

                      setIsConsolidatingDay20(true);
                      try {
                        const res = await onConsolidateDay20(nextPer);
                        setConfigSuccessMsg(`Consolidação do Dia 20 executada! ${res.convertedCount} lançamentos convertidos para definitivo em ${res.period}.`);
                        setTimeout(() => setConfigSuccessMsg(null), 5000);
                      } catch (err) {
                        alert('Erro ao consolidar cobranças: ' + err);
                      } finally {
                        setIsConsolidatingDay20(false);
                      }
                    }}
                    className={`w-full py-2.5 rounded-lg font-bold text-xs transition-colors flex items-center justify-center space-x-2 ${
                      isDark
                        ? 'bg-amber-600 hover:bg-amber-500 text-zinc-950'
                        : 'bg-amber-500 hover:bg-amber-600 text-zinc-950'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span>
                      {isConsolidatingDay20
                        ? 'Consolidando lançamentos...'
                        : `Consolidar em Definitivo (${getNextPeriod(scaerConfig?.currentBillingPeriod || '2026-09')})`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Card de Geração de Prévias Globais */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Sincronizar Prévias de Todos os Cadetes
                  </h4>
                </div>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Garante que todos os cadetes ativos tenham lançamentos provisórios de prévia criados para o próximo mês (SCAER + Clubes + Doações).
                </p>

                <div className="pt-2">
                  <button
                    disabled={isGeneratingPreviews}
                    onClick={async () => {
                      if (!onGenerateAllPreviews) return;
                      const nextPer = getNextPeriod(scaerConfig?.currentBillingPeriod || '2026-09');
                      setIsGeneratingPreviews(true);
                      try {
                        const res = await onGenerateAllPreviews(nextPer);
                        setConfigSuccessMsg(`Prévias sincronizadas com sucesso para ${res.cadetsProcessed} cadetes ativos no período ${nextPer}!`);
                        setTimeout(() => setConfigSuccessMsg(null), 5000);
                      } catch (err) {
                        alert('Erro ao sincronizar prévias: ' + err);
                      } finally {
                        setIsGeneratingPreviews(false);
                      }
                    }}
                    className={`w-full py-2.5 rounded-lg font-bold text-xs transition-colors flex items-center justify-center space-x-2 ${
                      isDark
                        ? 'bg-sky-600 hover:bg-sky-500 text-white'
                        : 'bg-sky-600 hover:bg-sky-700 text-white'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isGeneratingPreviews
                        ? 'Gerando prévias...'
                        : `Gerar / Sincronizar Prévias (${getNextPeriod(scaerConfig?.currentBillingPeriod || '2026-09')})`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Card de Faturamento Geral Manual */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Faturamento Mensal Geral (Mês Corrente)
                  </h4>
                </div>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Executa a cobrança de mensalidade SCAER para o período corrente selecionado.
                </p>

                <div className="pt-2">
                  <button
                    disabled={isTriggeringBilling}
                    onClick={async () => {
                      if (!onTriggerMonthlyBilling) return;
                      const period = scaerConfig?.currentBillingPeriod || '2026-09';
                      const confirm = window.confirm(
                        `Deseja executar a geração automática de mensalidades SCAER para o período ${period}?`
                      );
                      if (!confirm) return;

                      setIsTriggeringBilling(true);
                      try {
                        await onTriggerMonthlyBilling(period);
                        setConfigSuccessMsg(`Faturamento do período ${period} executado com sucesso!`);
                        setTimeout(() => setConfigSuccessMsg(null), 4000);
                      } catch (err) {
                        alert('Erro ao executar faturamento: ' + err);
                      } finally {
                        setIsTriggeringBilling(false);
                      }
                    }}
                    className={`w-full py-2.5 rounded-lg font-bold text-xs transition-colors flex items-center justify-center space-x-2 ${
                      isDark
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>
                      {isTriggeringBilling
                        ? 'Processando cobranças...'
                        : `Executar Cobrança Mensal (${scaerConfig?.currentBillingPeriod || '2026-09'})`}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Regras Institucionais Fixas */}
            <div
              className={`mt-6 p-4 rounded-xl border space-y-2 ${
                isDark ? 'bg-zinc-950/50 border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
              }`}
            >
              <h5 className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Regras de Negócio e Calendário Operacional</span>
              </h5>
              <ul className="text-xs space-y-1.5 text-zinc-400 list-disc list-inside">
                <li>
                  <strong className="text-zinc-200">Dia 20 de cada mês (23:59h):</strong> Prazo limite para cadetes entrarem/saírem de clubes e definirem doações religiosas para a fatura do mês seguinte. Às 23:59h, o Cron consolida os lançamentos de prévia em cobranças definitivas. Solicitações feitas após o dia 20 vigoram apenas para o mês subsequente (M+2).
                </li>
                <li>
                  <strong className="text-zinc-200">Dia 1º de cada mês (00:00h):</strong> Virada oficial do mês de competência da Cédula e abertura da nova prévia provisória.
                </li>
                <li>
                  <strong className="text-zinc-200">Dia 10 de cada mês:</strong> Data limite para vencimento/pagamento da cédula digital do cadete.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHAMENTO DO SÓCIO */}
      {selectedCadetDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-2xl rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setSelectedCadetDetail(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold font-mono text-amber-500">
                  Extrato do Cadete {selectedCadetDetail.cadetNumber} {selectedCadetDetail.userName}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedCadetDetail.squadron || 'Athos'} • Histórico de Lançamentos no {managedClub.name}
                </p>
              </div>
            </div>

            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <table className="w-full text-left text-xs">
                <thead className={`font-mono uppercase border-b ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-200 text-slate-700'}`}>
                  <tr>
                    <th className="p-3">Mês</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3 text-right">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {clubExpenses
                    .filter((e) => e.cadetNumber === selectedCadetDetail.cadetNumber || e.userName === selectedCadetDetail.userName)
                    .map((exp) => (
                      <tr key={exp.id}>
                        <td className="p-3 font-mono opacity-80">{exp.billingPeriod}</td>
                        <td className="p-3 font-medium">{exp.description}</td>
                        <td className="p-3 opacity-80">{exp.category}</td>
                        <td className="p-3 text-right font-bold text-amber-400 font-mono">R$ {exp.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedCadetDetail(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
              >
                Fechar Extrato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Lançamento de Gasto */}
      {showLaunchModal && (
        <LaunchExpenseModal
          club={managedClub}
          activeMembers={activeMembers}
          allCadets={allCadets}
          managerUser={user}
          scannedCadet={scannedCadetInfo}
          onLaunchIndividual={onLaunchIndividual}
          onLaunchBulk={onLaunchBulk}
          onClose={() => {
            setShowLaunchModal(false);
            setScannedCadetInfo(null);
          }}
          theme={theme}
        />
      )}

      {/* Modal do Leitor de QR Code */}
      {showQrScanner && (
        <QRCodeExpenseScanner
          onScanSuccess={handleQrScanSuccess}
          onClose={() => setShowQrScanner(false)}
          theme={theme}
        />
      )}

    </div>
  );
};
