import React, { useState } from 'react';
import type { Club, ClubMembership, User } from '../../types';
import { Users, PlusCircle, LogOut, Clock, CheckCircle2, Sparkles, Plane, Target, Crown, Cpu } from 'lucide-react';

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
  const [loadingClubId, setLoadingClubId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const isDark = theme === 'dark';

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Plane': return <Plane className="w-6 h-6 text-cyan-500" />;
      case 'Target': return <Target className="w-6 h-6 text-amber-500" />;
      case 'Sparkles': return <Sparkles className="w-6 h-6 text-purple-500" />;
      case 'Crown': return <Crown className="w-6 h-6 text-emerald-500" />;
      case 'Cpu': return <Cpu className="w-6 h-6 text-blue-500" />;
      default: return <Users className="w-6 h-6 text-cyan-500" />;
    }
  };

  const handleAction = async (clubId: string, action: 'join' | 'leave') => {
    setLoadingClubId(clubId);
    try {
      await onRequestMembership(clubId, action);
    } finally {
      setLoadingClubId(null);
    }
  };

  const filteredClubs = filterCategory === 'all'
    ? clubs
    : clubs.filter(c => (c.category || '').toLowerCase() === filterCategory.toLowerCase());

  return (
    <div className="space-y-6">
      
      {/* Banner Principal dos Clubes */}
      <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border shadow-2xl backdrop-blur-xl transition-colors ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 border-slate-800'
          : 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border-slate-700 text-white'
      }`}>
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            SOCIEDADE ACADÊMICA DOS CADETES DA AERONÁUTICA
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
            Clubes da SCAER
          </h2>
          <p className="text-sm text-slate-200 mt-2 leading-relaxed">
            Navegue e associe-se aos 14 clubes oficiais da SCAER. As mensalidades dos clubes em que você é membro ativo são computadas na sua Cédula Digital.
          </p>
        </div>
      </div>

      {/* Filtros por Categoria */}
      <div className={`flex items-center space-x-2 overflow-x-auto pb-2 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        {['all', 'Militar', 'Esporte', 'Social', 'Cultura', 'Tecnologia'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 ${
              filterCategory === cat
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                : isDark
                ? 'bg-slate-900/80 text-slate-400 hover:text-slate-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat === 'all' ? 'Todos os 14 Clubes' : cat}
          </button>
        ))}
      </div>

      {/* Grid dos 14 Clubes da SCAER */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClubs.map((club) => {
          const userMem = memberships.find((m) => m.userId === user.id && m.clubId === club.id);
          const isApproved = userMem?.status === 'approved';
          const isPendingEntry = userMem?.status === 'pending_entry';
          const isPendingExit = userMem?.status === 'pending_exit';

          return (
            <div
              key={club.id}
              className={`flex flex-col justify-between rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 hover:shadow-xl group ${
                isDark
                  ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className={`p-3.5 rounded-2xl border ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {renderIcon(club.icon || 'shield')}
                  </div>

                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                    isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    {club.category}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-[10px] font-bold text-cyan-500 tracking-wider uppercase font-mono">
                    {club.code}
                  </div>
                  <h3 className={`text-lg font-bold mt-0.5 transition-colors group-hover:text-cyan-500 ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    {club.name}
                  </h3>
                  <p className={`text-xs mt-2 line-clamp-2 leading-relaxed ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {club.description}
                  </p>
                </div>
              </div>

              <div className={`mt-6 pt-4 border-t space-y-4 ${
                isDark ? 'border-slate-800/80' : 'border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Mensalidade</span>
                    <span className="text-base font-extrabold text-cyan-500 font-mono">
                      R$ {club.monthlyFee.toFixed(2)}
                      <span className="text-[10px] font-normal text-slate-400">/mês</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block">Associados</span>
                    <span className={`text-sm font-bold flex items-center justify-end space-x-1 ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}>
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{club.memberCount} cadetes</span>
                    </span>
                  </div>
                </div>

                <div>
                  {isApproved && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center space-x-1.5 p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Membro Ativo</span>
                      </div>
                      <button
                        disabled={loadingClubId === club.id}
                        onClick={() => handleAction(club.id, 'leave')}
                        className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                          isDark
                            ? 'bg-slate-950 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border-slate-800 hover:border-red-500/30'
                            : 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border-slate-300'
                        }`}
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Solicitar Desligamento</span>
                      </button>
                    </div>
                  )}

                  {isPendingEntry && (
                    <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-bold text-center flex items-center justify-center space-x-2">
                      <Clock className="w-4 h-4 animate-spin-slow" />
                      <span>Pedido de Entrada Pendente</span>
                    </div>
                  )}

                  {isPendingExit && (
                    <div className="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold text-center flex items-center justify-center space-x-2">
                      <Clock className="w-4 h-4 animate-spin-slow" />
                      <span>Aguardando Aprovação de Saída</span>
                    </div>
                  )}

                  {!userMem && (
                    <button
                      disabled={loadingClubId === club.id}
                      onClick={() => handleAction(club.id, 'join')}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{loadingClubId === club.id ? 'Enviando...' : 'Solicitar Entrada'}</span>
                    </button>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
