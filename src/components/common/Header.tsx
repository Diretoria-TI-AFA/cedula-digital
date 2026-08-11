import React from 'react';
import type { User } from '../../types';
import { pb } from '../../lib/pocketbase';
import { Shield, CreditCard, Users, FileCheck, Server, Sun, Moon, LogOut } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onLogout: () => void;
  activeTab: 'card' | 'clubs' | 'scaer' | 'director';
  setActiveTab: (tab: 'card' | 'clubs' | 'scaer' | 'director') => void;
  isPbConnected: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  activeTab,
  setActiveTab,
  isPbConnected,
  theme,
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';
  const isManager = currentUser.role === 'presidente' || currentUser.role === 'scaer';

  return (
    <header className={`sticky top-0 z-40 w-full border-b transition-colors duration-200 ${
      isDark
        ? 'bg-zinc-950/90 border-zinc-800 text-zinc-100 backdrop-blur-md'
        : 'bg-white/90 border-zinc-200 text-zinc-900 backdrop-blur-md'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-100 border-zinc-200 text-zinc-900'
            }`}>
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-tight">
                  CÉDULA DIGITAL
                </h1>
                <span className={`px-1.5 py-0.5 text-[9px] font-bold tracking-wider rounded border uppercase ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                }`}>
                  SCAER
                </span>
              </div>
            </div>
          </div>

          {/* Role Navigation Tabs */}
          <nav className={`hidden md:flex items-center space-x-1 p-1 rounded-lg border ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
          }`}>
            {currentUser.role === 'cadete' && (
              <>
                <button
                  onClick={() => setActiveTab('card')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'card'
                      ? isDark ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'bg-zinc-900 text-white shadow-sm'
                      : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Minha Cédula</span>
                </button>

                <button
                  onClick={() => setActiveTab('clubs')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'clubs'
                      ? isDark ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'bg-zinc-900 text-white shadow-sm'
                      : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Clubes SCAER</span>
                </button>
              </>
            )}

            {isManager && (
              <button
                onClick={() => setActiveTab('scaer')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'scaer'
                    ? isDark ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'bg-zinc-900 text-white shadow-sm'
                    : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Portal do Clube</span>
              </button>
            )}

            {currentUser.role === 'diretor' && (
              <button
                onClick={() => setActiveTab('director')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'director'
                    ? isDark ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'bg-zinc-900 text-white shadow-sm'
                    : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Diretoria</span>
              </button>
            )}
          </nav>

          {/* Profile & Settings */}
          <div className="flex items-center space-x-2.5">
            
            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              title={isDark ? 'Tema Claro' : 'Tema Escuro'}
              className={`p-2 rounded-lg border transition-colors ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* PB Status */}
            <div
              className={`hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                isPbConnected
                  ? isDark ? 'bg-zinc-900 border-zinc-800 text-emerald-400' : 'bg-zinc-100 border-zinc-200 text-emerald-700'
                  : isDark ? 'bg-zinc-900 border-zinc-800 text-amber-400' : 'bg-zinc-100 border-zinc-200 text-amber-700'
              }`}
              title="PocketBase Remoto"
            >
              <Server className="w-3 h-3" />
              <span>cedula-scaer</span>
            </div>

            {/* Current User */}
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-zinc-100 border-zinc-200 text-zinc-800'
            }`}>
              {currentUser.cadetNumber && (
                <span className="font-mono text-zinc-400">#{currentUser.cadetNumber}</span>
              )}
              <span>{currentUser.warName || currentUser.name}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {currentUser.role}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                pb.authStore.clear();
                onLogout();
              }}
              className={`p-2 rounded-lg border transition-colors ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-red-400 hover:bg-red-950/30'
                  : 'bg-zinc-100 border-zinc-200 text-red-600 hover:bg-red-50'
              }`}
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
