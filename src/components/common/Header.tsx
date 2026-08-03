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
    <header className={`sticky top-0 z-40 w-full backdrop-blur-xl border-b transition-colors duration-300 ${
      isDark
        ? 'bg-slate-950/85 border-slate-800/80 shadow-2xl'
        : 'bg-white/90 border-slate-200 shadow-md'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className={`w-full h-full rounded-[14px] flex items-center justify-center ${
                isDark ? 'bg-slate-950' : 'bg-white'
              }`}>
                <CreditCard className="w-6 h-6 text-cyan-500 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className={`text-xl font-extrabold tracking-tight bg-gradient-to-r ${
                  isDark
                    ? 'from-white via-slate-200 to-cyan-400'
                    : 'from-slate-900 via-slate-800 to-blue-600'
                } bg-clip-text text-transparent`}>
                  CÉDULA DIGITAL
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                  SCAER
                </span>
              </div>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Sociedade Acadêmica dos Cadetes da Aeronáutica
              </p>
            </div>
          </div>

          {/* Role Navigation Tabs */}
          <nav className={`hidden md:flex items-center space-x-1 p-1.5 rounded-2xl border shadow-inner transition-colors ${
            isDark ? 'bg-slate-900/90 border-slate-800/80' : 'bg-slate-100 border-slate-200'
          }`}>
            {/* Abas para Cadete */}
            {currentUser.role === 'cadete' && (
              <>
                <button
                  onClick={() => setActiveTab('card')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === 'card'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Minha Cédula</span>
                </button>

                <button
                  onClick={() => setActiveTab('clubs')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === 'clubs'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Clubes da SCAER</span>
                </button>
              </>
            )}

            {/* Aba Única para Gestores / Presidentes de Clubes */}
            {isManager && (
              <button
                onClick={() => setActiveTab('scaer')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === 'scaer'
                    ? 'bg-gradient-to-r from-amber-500 to-red-600 text-white shadow-lg shadow-amber-500/25'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Portal do Clube SCAER</span>
              </button>
            )}

            {/* Aba Única para Diretor */}
            {currentUser.role === 'diretor' && (
              <button
                onClick={() => setActiveTab('director')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === 'director'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>Diretoria de Cédula</span>
              </button>
            )}
          </nav>

          {/* Profile, Theme Switcher & Logout */}
          <div className="flex items-center space-x-3">
            
            {/* Toggle de Tema Claro / Escuro */}
            <button
              onClick={onToggleTheme}
              title={isDark ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
              className={`p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
                  : 'bg-slate-100 border-slate-300 text-indigo-600 hover:bg-slate-200'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Indicador de Servidor PocketBase */}
            <div
              className={`hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                isPbConnected
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              }`}
              title="PocketBase Remoto (cedula-scaer.pockethost.io)"
            >
              <Server className="w-3.5 h-3.5" />
              <span>cedula-scaer</span>
            </div>

            {/* Perfil do Usuário Logado */}
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
            }`}>
              {currentUser.cadetNumber && (
                <span className="text-cyan-500 font-mono">{currentUser.cadetNumber}</span>
              )}
              <span>{currentUser.warName || currentUser.name}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] uppercase bg-cyan-500/20 text-cyan-400 font-extrabold">
                {currentUser.role}
              </span>
            </div>

            {/* Botão Sair (Logout) */}
            <button
              onClick={() => {
                pb.authStore.clear();
                onLogout();
              }}
              className={`p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center ${
                isDark
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                  : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
              }`}
              title="Sair do Sistema"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
