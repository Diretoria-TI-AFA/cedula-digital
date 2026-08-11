import React, { useState } from 'react';
import type { Club, ClubMembership, User } from '../../types';
import { Users, PlusCircle, LogOut, Clock, CheckCircle2, Shield, Loader2 } from 'lucide-react';

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
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header Banner */}
      <div className={`p-6 rounded-xl border transition-colors ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
      }`}>
        <div className="max-w-2xl space-y-1.5">
          <div className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${
            isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
          }`}>
            SCAER • Sociedade Acadêmica dos Cadetes da Aeronáutica
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Clubes Acadêmicos
          </h2>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Associe-se aos clubes oficiais da SCAER. As mensalidades dos clubes em que você for membro ativo serão lançadas na sua Cédula Digital.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={`flex items-center space-x-1.5 overflow-x-auto pb-1 border-b ${
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      }`}>
        {['all', 'Militar', 'Esporte', 'Social', 'Cultura', 'Tecnologia'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filterCategory === cat
                ? isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
                : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            {cat === 'all' ? 'Todos os Clubes' : cat}
          </button>
        ))}
      </div>

      {/* Clubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClubs.map((club) => {
          const userMem = memberships.find((m) => m.userId === user.id && m.clubId === club.id);
          const isApproved = userMem?.status === 'approved';
          const isPendingEntry = userMem?.status === 'pending_entry';
          const isPendingExit = userMem?.status === 'pending_exit';

          return (
            <div
              key={club.id}
              className={`flex flex-col justify-between rounded-xl border p-5 transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg border ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                  }`}>
                    <Shield className="w-5 h-5" />
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                  }`}>
                    {club.category}
                  </span>
                </div>

                <div className="mt-3 space-y-1">
                  <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">
                    {club.code}
                  </div>
                  <h3 className="text-base font-bold">
                    {club.name}
                  </h3>
                  <p className={`text-xs line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {club.description}
                  </p>
                </div>
              </div>

              <div className={`mt-5 pt-3 border-t space-y-3 ${
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase block">Mensalidade</span>
                    <span className="text-sm font-bold font-mono">
                      R$ {club.monthlyFee.toFixed(2)}/mês
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 uppercase block">Membros</span>
                    <span className="text-xs font-semibold flex items-center justify-end space-x-1">
                      <Users className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{club.memberCount}</span>
                    </span>
                  </div>
                </div>

                <div>
                  {isApproved && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-center space-x-1.5 p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Membro Ativo</span>
                      </div>
                      <button
                        disabled={loadingClubId === club.id}
                        onClick={() => handleAction(club.id, 'leave')}
                        className={`w-full py-2 rounded-lg border text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 ${
                          isDark
                            ? 'bg-zinc-950 hover:bg-red-950/30 text-zinc-400 hover:text-red-400 border-zinc-800'
                            : 'bg-zinc-100 hover:bg-red-50 text-zinc-600 hover:text-red-600 border-zinc-200'
                        }`}
                      >
                        <LogOut className="w-3.5 h-3.5" />
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
                      disabled={loadingClubId === club.id}
                      onClick={() => handleAction(club.id, 'join')}
                      className={`w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
                        isDark
                          ? 'bg-zinc-100 text-zinc-950 hover:bg-white'
                          : 'bg-zinc-900 text-white hover:bg-zinc-800'
                      }`}
                    >
                      {loadingClubId === club.id ? (
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

    </div>
  );
};
