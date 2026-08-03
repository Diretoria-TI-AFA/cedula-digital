import React, { useState } from 'react';
import type { Club, ClubMembership, Expense, User } from '../../types';
import { LaunchExpenseModal } from './LaunchExpenseModal';
import { QRCodeExpenseScanner } from '../common/QRCodeExpenseScanner';
import {
  Shield,
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
  ArrowUpRight,
  DollarSign
} from 'lucide-react';

interface ScaerManagerViewProps {
  user: User;
  clubs: Club[];
  memberships: ClubMembership[];
  expenses: Expense[];
  allCadets: User[];
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
  onUpdateMembershipStatus,
  onLaunchIndividual,
  onLaunchBulk,
  onTriggerRecurring,
  theme = 'dark',
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'cashflow' | 'charts' | 'requests'>('members');
  const [showLaunchModal, setShowLaunchModal] = useState<boolean>(false);
  const [showQrScanner, setShowQrScanner] = useState<boolean>(false);
  const [scannedCadetInfo, setScannedCadetInfo] = useState<{ cadetNumber: string; warName?: string } | null>(null);
  
  // Filtros de Caixa e Busca
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-07');
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
  const activeMembers = clubMemberships.filter((m) => m.status === 'approved');
  const pendingRequests = clubMemberships.filter(
    (m) => m.status === 'pending_entry' || m.status === 'pending_exit'
  );

  // Lançamentos e Caixa do Clube
  const clubExpenses = expenses.filter((e) => e.clubId === managedClub.id);
  
  // Lançamentos filtrados por Período e Categoria
  const filteredExpenses = clubExpenses.filter((e) => {
    const matchPeriod = selectedPeriod === 'all' || e.billingPeriod === selectedPeriod;
    const matchCategory = selectedCategory === 'all' || e.category === selectedCategory;
    const matchSearch =
      e.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.cadetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchPeriod && matchCategory && matchSearch;
  });

  // Métricas Financeiras
  const periodExpenses = clubExpenses.filter((e) => selectedPeriod === 'all' || e.billingPeriod === selectedPeriod);
  const totalPeriodRevenue = periodExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const recurringRevenue = periodExpenses.filter(e => e.category === 'Mensalidade').reduce((acc, curr) => acc + curr.amount, 0);
  const consumptionRevenue = periodExpenses.filter(e => e.category !== 'Mensalidade').reduce((acc, curr) => acc + curr.amount, 0);

  // Filtro de Sócios para a Tabela de Membros
  const filteredMembers = activeMembers.filter(
    (m) =>
      m.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.cadetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.squadron.toLowerCase().includes(searchTerm.toLowerCase())
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
      .filter((e) => e.cadetNumber === cadetNumber || e.userName === cadetNumber)
      .reduce((acc, curr) => acc + curr.amount, 0);
  };

  // Ranking Top 5 Cadetes Consumidores
  const cadetConsumptionMap = new Map<string, { cadetNumber: string; userName: string; total: number }>();
  periodExpenses.forEach((exp) => {
    const key = exp.cadetNumber || exp.userName;
    const current = cadetConsumptionMap.get(key) || { cadetNumber: exp.cadetNumber, userName: exp.userName, total: 0 };
    current.total += exp.amount;
    cadetConsumptionMap.set(key, current);
  });
  const topCadets = Array.from(cadetConsumptionMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Evolução Mensal do Caixa (Dados para o Gráfico de Barras)
  const availablePeriods = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
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
      <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border shadow-2xl backdrop-blur-xl transition-colors ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-950 border-amber-500/30'
          : 'bg-gradient-to-r from-amber-900 via-red-900 to-slate-900 border-amber-400 text-white'
      }`}>
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5" />
                <span>GESTOR DO CLUBE SCAER</span>
              </span>

              {/* Seletor do Clube Administrado */}
              <select
                value={managedClub.id}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-950/90 text-amber-400 border border-amber-500/40 focus:outline-none cursor-pointer shadow-lg"
              >
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    Clube: {c.name} (R$ {c.monthlyFee.toFixed(2)}/mês)
                  </option>
                ))}
              </select>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              Gestão Financeira & Sócios: {managedClub.name}
            </h2>
            <p className="text-xs text-slate-200 mt-1">
              Presidente / Gestor Logado: <strong className="text-amber-300">{user.warName || user.name}</strong> • Mensalidade Base: R$ {managedClub.monthlyFee.toFixed(2)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Botão de Leitor de QR Code */}
            <button
              onClick={() => setShowQrScanner(true)}
              className="px-5 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-xl shadow-cyan-600/25 transition-all flex items-center space-x-2"
              title="Escanear QR Code do Cadete"
            >
              <QrCode className="w-5 h-5" />
              <span>Escanear QR Code</span>
            </button>

            {/* Botão Lançar Gasto */}
            <button
              onClick={() => {
                setScannedCadetInfo(null);
                setShowLaunchModal(true);
              }}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-bold text-xs shadow-xl shadow-amber-500/25 transition-all flex items-center space-x-2"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Lançar Gasto na Cédula</span>
            </button>
          </div>
        </div>
      </div>

      {/* BANNER RECORRENTE E PEDIDOS PENDENTES */}
      {pendingRequests.length > 0 && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
          isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}>
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5 animate-bounce shrink-0 text-amber-400" />
            <span className="text-xs font-bold">
              Você possui {pendingRequests.length} solicitação(ões) pendente(s) de entrada/saída de sócios no clube.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('requests')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs transition-all hover:bg-amber-400"
          >
            Ver Pedidos
          </button>
        </div>
      )}

      {/* Cards de Métricas Principais de Caixa do Clube */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className={`p-5 rounded-2xl border shadow-lg backdrop-blur-xl transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Caixa Total no Mês ({selectedPeriod})</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-500 font-mono">
            R$ {totalPeriodRevenue.toFixed(2)}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center space-x-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            <span>Arrecadação total no período</span>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border backdrop-blur-xl transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Mensalidades Recorrentes</span>
            <Receipt className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            R$ {recurringRevenue.toFixed(2)}
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            {activeMembers.length} sócios ativos (R$ {managedClub.monthlyFee}/mês)
          </div>
        </div>

        <div className={`p-5 rounded-2xl border backdrop-blur-xl transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Consumos & Taxas Avulsas</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            R$ {consumptionRevenue.toFixed(2)}
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            Gastos extras e eventos especiais
          </div>
        </div>

        <div className={`p-5 rounded-2xl border backdrop-blur-xl transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Ação Rápida: Mensalidades</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <button
            onClick={async () => {
              const count = await onTriggerRecurring(managedClub.id, selectedPeriod === 'all' ? '2026-07' : selectedPeriod);
              alert(`${count} mensalidade(s) de R$ ${managedClub.monthlyFee.toFixed(2)} gerada(s) para os sócios ativos!`);
            }}
            className="w-full mt-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center space-x-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Lançar Mensalidades do Mês</span>
          </button>
        </div>

      </div>

      {/* Menu Superior de Abas do Presidente */}
      <div className={`flex items-center space-x-2 border-b pb-2 overflow-x-auto ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeTab === 'members'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : isDark ? 'bg-slate-900 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gestão de Sócios ({activeMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cashflow')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeTab === 'cashflow'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : isDark ? 'bg-slate-900 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Caixa & Extrato do Clube ({periodExpenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeTab === 'charts'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : isDark ? 'bg-slate-900 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Gráficos & Evolução</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 relative ${
            activeTab === 'requests'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : isDark ? 'bg-slate-900 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Caixa de Pedidos ({pendingRequests.length})</span>
          {pendingRequests.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute top-1 right-1" />
          )}
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
                  <option value="2026-07">Julho / 2026</option>
                  <option value="2026-08">Agosto / 2026</option>
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
