import React, { useMemo, useState } from 'react';
import type { Club, ClubMembership, User } from '../../types';
import {
  Users,
  PlusCircle,
  LogOut,
  Clock,
  CheckCircle2,
  Shield,
  Loader2,
  LayoutList,
  LayoutGrid,
  Search
} from 'lucide-react';

interface CadetClubsViewProps {
  user: User;
  clubs: Club[];
  memberships: ClubMembership[];
  onRequestMembership: (clubId: string, action: 'join' | 'leave', notes?: string) => Promise<void>;
  theme?: 'dark' | 'light';
}

export const CadetClubsView: React.FC<CadetClubsViewProps> = ({
  user,
  clubs,
  memberships,
  onRequestMembership,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  // Modo de Visualização (Lista vs Cards) - Padrão Lista
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('clubs_view_mode') as 'list' | 'grid') || 'list';
  });

  // Filtros de Busca & Status
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'my_clubs' | 'available'>('all');
  const [loadingClubId, setLoadingClubId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleToggleView = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('clubs_view_mode', mode);
  };

  const handleAction = async (clubId: string, action: 'join' | 'leave') => {
    setLoadingClubId(clubId);
    try {
      await onRequestMembership(clubId, action);
      const isBefore20 = new Date().getDate() <= 20;
      if (isBefore20) {
        setActionFeedback(
          action === 'leave'
            ? 'Você solicitou a saída do clube. A prévia da sua fatura do próximo mês foi atualizada imediatamente e o valor foi removido!'
            : 'Você solicitou a entrada no clube. A prévia da sua fatura do próximo mês foi atualizada com a mensalidade prevista!'
        );
      } else {
        setActionFeedback(
          'Solicitação registrada! Como o prazo do dia 20 já encerrou para a próxima fatura, a alteração entrará em vigor no mês subsequente.'
        );
      }
      setTimeout(() => setActionFeedback(null), 6000);
    } finally {
      setLoadingClubId(null);
    }
  };

  // Mapeamento de adesões do cadete
  const userMembershipsMap = useMemo(() => {
    const map = new Map<string, ClubMembership>();
    memberships.forEach((m) => {
      if (m.userId === user.id || (user.cadetNumber && m.cadetNumber === user.cadetNumber)) {
        map.set(m.clubId, m);
      }
    });
    return map;
  }, [memberships, user]);

  // Contagem de clubes ativos do cadete e total mensal
  const myApprovedClubs = useMemo(() => {
    return clubs.filter((c) => {
      const s = userMembershipsMap.get(c.id)?.status;
      return s === 'approved' || s === 'active';
    });
  }, [clubs, userMembershipsMap]);

  const totalMonthlyClubFees = useMemo(() => {
    return myApprovedClubs.reduce((acc, curr) => acc + (curr.monthlyFee || 0), 0);
  }, [myApprovedClubs]);

  // Filtragem dos Clubes
  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const mem = userMembershipsMap.get(club.id);
      const isApproved = mem?.status === 'approved' || mem?.status === 'active';
      const isPending = mem?.status === 'pending_entry' || mem?.status === 'pending_exit';

      // Filtro de Status
      if (statusFilter === 'my_clubs' && !isApproved) return false;
      if (statusFilter === 'available' && (isApproved || isPending)) return false;

      // Filtro de Busca
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        club.name.toLowerCase().includes(query) ||
        (club.code || '').toLowerCase().includes(query) ||
        (club.category || '').toLowerCase().includes(query) ||
        (club.description || '').toLowerCase().includes(query);

      return matchesSearch;
    });
  }, [clubs, userMembershipsMap, statusFilter, searchQuery]);

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
                SCAER • CLUBES ACADÊMICOS
              </span>
              <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                CATÁLOGO OFICIAL
              </span>
            </div>

            <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Clubes da SCAER
            </h2>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Associe-se aos clubes oficiais. As mensalidades dos clubes ativos são incluídas automaticamente na sua fatura.
            </p>
          </div>

          <div className={`p-3.5 rounded-xl border flex flex-col items-end justify-center min-w-[190px] ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Mensalidades de Clubes
            </span>
            <span className={`text-xl font-black font-mono mt-0.5 ${isDark ? 'text-zinc-100' : 'text-zinc-950'}`}>
              R$ {totalMonthlyClubFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {myApprovedClubs.length} {myApprovedClubs.length === 1 ? 'clube ativo' : 'clubes ativos'}
            </span>
          </div>
        </div>
      </div>

      {/* Banner de Feedback de Ação */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between space-x-3 transition-colors ${
            isDark ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center space-x-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-semibold">{actionFeedback}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Banner Informativo da Regra do Dia 20 */}
      <div className={`p-4 rounded-xl border flex items-start space-x-3 transition-colors ${
        isDark ? 'bg-amber-950/20 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <p className="font-bold">Regra de Cobrança e Adesões (Dia 20 de cada mês):</p>
          <p className={isDark ? 'text-amber-300/80' : 'text-amber-800'}>
            Solicitações de entrada ou saída feitas até o <strong>dia 20 às 23:59</strong> atualizam imediatamente a <strong>prévia da fatura do mês seguinte</strong> e são consolidadas em definitivo no dia 20.
            Solicitações feitas <strong>após o dia 20</strong> mantêm a fatura do próximo mês inalterada e entram em vigor na fatura do <strong>mês subsequente (M+2)</strong>.
          </p>
        </div>
      </div>

      {/* Barra de Ferramentas: Busca + Filtro de Status + Alternador Lista / Cards */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
      }`}>
        
        {/* Filtros Rápidos de Status */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              statusFilter === 'all'
                ? isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
                : isDark ? 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Todos os Clubes ({clubs.length})
          </button>

          <button
            onClick={() => setStatusFilter('my_clubs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              statusFilter === 'my_clubs'
                ? isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
                : isDark ? 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Meus Clubes ({myApprovedClubs.length})
          </button>

          <button
            onClick={() => setStatusFilter('available')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              statusFilter === 'available'
                ? isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
                : isDark ? 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Disponíveis ({clubs.length - myApprovedClubs.length})
          </button>
        </div>

        {/* Busca e Alternador de Modo de Visualização */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar clube por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none ${
                isDark
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-zinc-700'
                  : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-500 shadow-xs'
              }`}
            />
          </div>

          {/* Toggle de Layout (Lista vs Cards) */}
          <div className={`flex items-center p-1 rounded-lg border ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
          }`}>
            <button
              onClick={() => handleToggleView('list')}
              title="Visualizar em Lista"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list'
                  ? isDark ? 'bg-zinc-800 text-zinc-100 shadow-xs' : 'bg-white text-zinc-950 shadow-xs font-bold'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleToggleView('grid')}
              title="Visualizar em Cards"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid'
                  ? isDark ? 'bg-zinc-800 text-zinc-100 shadow-xs' : 'bg-white text-zinc-950 shadow-xs font-bold'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODO 1: VISUALIZAÇÃO EM LISTA (TABELA)                                   */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className={`rounded-xl border overflow-hidden transition-colors ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`font-mono uppercase border-b ${
                isDark ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              }`}>
                <tr>
                  <th className="p-3.5">Código & Nome do Clube</th>
                  <th className="p-3.5">Categoria</th>
                  <th className="p-3.5">Mensalidade</th>
                  <th className="p-3.5 text-center">Membros</th>
                  <th className="p-3.5">Seu Status</th>
                  <th className="p-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-zinc-200'}`}>
                {filteredClubs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-400 font-medium">
                      Nenhum clube encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredClubs.map((club) => {
                    const userMem = userMembershipsMap.get(club.id);
                    const isApproved = userMem?.status === 'approved' || userMem?.status === 'active';
                    const isPendingEntry = userMem?.status === 'pending_entry';
                    const isPendingExit = userMem?.status === 'pending_exit';
                    const isLoading = loadingClubId === club.id;

                    return (
                      <tr key={club.id} className={`transition-colors ${isDark ? 'hover:bg-zinc-800/30' : 'hover:bg-zinc-50'}`}>
                        
                        {/* Nome & Código */}
                        <td className="p-3.5">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg border shrink-0 ${
                              isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                            }`}>
                              <Shield className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className={`font-mono text-[10px] font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                  {club.code || 'SCAER'}
                                </span>
                                <h3 className={`font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                                  {club.name}
                                </h3>
                              </div>
                              <p className={`text-[11px] line-clamp-1 mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                {club.description}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Categoria */}
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase ${
                            isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                          }`}>
                            {club.category || 'Geral'}
                          </span>
                        </td>

                        {/* Mensalidade */}
                        <td className={`p-3.5 font-bold font-mono text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                          R$ {club.monthlyFee.toFixed(2)}
                          <span className={`text-[10px] font-normal block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>/mês</span>
                        </td>

                        {/* Membros */}
                        <td className={`p-3.5 text-center font-mono font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          <span className="flex items-center justify-center space-x-1">
                            <Users className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{club.memberCount || 0}</span>
                          </span>
                        </td>

                        {/* Status de Adesão */}
                        <td className="p-3.5">
                          {isApproved && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center space-x-1 w-fit ${
                              isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                            }`}>
                              <CheckCircle2 className="w-3 h-3 text-zinc-400" />
                              <span>Membro Ativo</span>
                            </span>
                          )}

                          {isPendingEntry && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center space-x-1 w-fit">
                              <Clock className="w-3 h-3" />
                              <span>Entrada Pendente</span>
                            </span>
                          )}

                          {isPendingExit && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20 flex items-center space-x-1 w-fit">
                              <Clock className="w-3 h-3" />
                              <span>Saída Pendente</span>
                            </span>
                          )}

                          {!userMem && (
                            <span className={`px-2 py-0.5 rounded text-[10px] border ${
                              isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'
                            }`}>
                              Não associado
                            </span>
                          )}
                        </td>

                        {/* Ação */}
                        <td className="p-3.5 text-right">
                          {isApproved && (
                            <button
                              disabled={isLoading}
                              onClick={() => handleAction(club.id, 'leave')}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors inline-flex items-center space-x-1 ${
                                isDark
                                  ? 'bg-zinc-950 hover:bg-red-950/30 text-zinc-400 hover:text-red-400 border-zinc-800 hover:border-red-500/30'
                                  : 'bg-white hover:bg-red-50 text-zinc-600 hover:text-red-600 border-zinc-300 hover:border-red-200 shadow-xs'
                              }`}
                            >
                              {isLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <LogOut className="w-3.5 h-3.5" />
                              )}
                              <span>Desligar</span>
                            </button>
                          )}

                          {isPendingEntry && (
                            <span className="text-[11px] text-amber-500 font-medium italic">
                              Aguardando aprovação
                            </span>
                          )}

                          {isPendingExit && (
                            <span className="text-[11px] text-red-500 font-medium italic">
                              Processando saída
                            </span>
                          )}

                          {!userMem && (
                            <button
                              disabled={isLoading}
                              onClick={() => handleAction(club.id, 'join')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center space-x-1.5 ${
                                isDark
                                  ? 'bg-zinc-100 text-zinc-950 hover:bg-white'
                                  : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-xs'
                              }`}
                            >
                              {isLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <PlusCircle className="w-3.5 h-3.5" />
                              )}
                              <span>Solicitar Entrada</span>
                            </button>
                          )}
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODO 2: VISUALIZAÇÃO EM CARDS (GRID)                                     */}
      {/* ========================================================================= */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClubs.map((club) => {
            const userMem = userMembershipsMap.get(club.id);
            const isApproved = userMem?.status === 'approved' || userMem?.status === 'active';
            const isPendingEntry = userMem?.status === 'pending_entry';
            const isPendingExit = userMem?.status === 'pending_exit';
            const isLoading = loadingClubId === club.id;

            return (
              <div
                key={club.id}
                className={`flex flex-col justify-between rounded-xl border p-4 sm:p-5 transition-all ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                    }`}>
                      <Shield className="w-4 h-4" />
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                    }`}>
                      {club.category}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className={`text-[10px] font-mono font-semibold uppercase ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {club.code || 'SCAER'}
                    </div>
                    <h3 className={`text-base font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {club.name}
                    </h3>
                    <p className={`text-xs line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {club.description}
                    </p>
                  </div>
                </div>

                <div className={`mt-4 pt-3 border-t space-y-3 ${
                  isDark ? 'border-zinc-800' : 'border-zinc-200'
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className={`text-[10px] uppercase block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Mensalidade
                      </span>
                      <span className={`text-sm font-bold font-mono ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        R$ {club.monthlyFee.toFixed(2)}/mês
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] uppercase block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Membros
                      </span>
                      <span className={`text-xs font-semibold flex items-center justify-end space-x-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        <Users className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{club.memberCount || 0}</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    {isApproved && (
                      <div className="space-y-2">
                        <div className={`flex items-center justify-center space-x-1.5 p-2 rounded-lg border text-xs font-semibold ${
                          isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Membro Ativo</span>
                        </div>
                        <button
                          disabled={isLoading}
                          onClick={() => handleAction(club.id, 'leave')}
                          className={`w-full py-2 rounded-lg border text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 ${
                            isDark
                              ? 'bg-zinc-950 hover:bg-red-950/30 text-zinc-400 hover:text-red-400 border-zinc-800'
                              : 'bg-white hover:bg-red-50 text-zinc-600 hover:text-red-600 border-zinc-300 shadow-xs'
                          }`}
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <LogOut className="w-3.5 h-3.5" />
                          )}
                          <span>Solicitar Desligamento</span>
                        </button>
                      </div>
                    )}

                    {isPendingEntry && (
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-semibold text-center flex items-center justify-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Entrada Pendente</span>
                      </div>
                    )}

                    {isPendingExit && (
                      <div className="p-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-semibold text-center flex items-center justify-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Saída Pendente</span>
                      </div>
                    )}

                    {!userMem && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleAction(club.id, 'join')}
                        className={`w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                          isDark
                            ? 'bg-zinc-100 text-zinc-950 hover:bg-white'
                            : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-xs'
                        }`}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <PlusCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Solicitar Entrada</span>
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
