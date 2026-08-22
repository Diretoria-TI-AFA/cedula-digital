import React, { useState } from 'react';
import type { User } from '../../types';
import { pb } from '../../lib/pocketbase';
import { queryCache } from '../../lib/queryCache';
import { CreditCard, Lock, Mail, ArrowRight, AlertCircle, Sun, Moon, Loader2 } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, theme, onToggleTheme }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDark = theme === 'dark';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      let authRecord: User;

      try {
        const res = await pb.collection('users').authWithPassword(email.trim(), password);
        authRecord = res.record as unknown as User;
      } catch (pbErr) {
        const searchVal = email.trim();
        const userMatch = await pb.collection('users').getFirstListItem(
          `email = "${searchVal}" || cadetNumber = "${searchVal}" || username = "${searchVal}"`
        );

        if (userMatch) {
          const res = await pb.collection('users').authWithPassword(userMatch.email, password);
          authRecord = res.record as unknown as User;
        } else {
          throw pbErr;
        }
      }

      queryCache.clear();
      onLoginSuccess(authRecord);
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      setErrorMessage('E-mail ou senha incorreta. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative min-h-screen flex flex-col justify-center items-center p-4 select-none transition-colors duration-200 ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
    }`}>
      
      {/* Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-30">
        <button
          onClick={onToggleTheme}
          className={`p-2.5 rounded-lg border transition-all duration-200 ${
            isDark 
              ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700' 
              : 'bg-white border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:border-zinc-300 shadow-sm'
          }`}
          title="Alternar Tema"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-sm relative z-20 space-y-6">
        
        {/* Minimalist Brand Header */}
        <div className="text-center space-y-3">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl border ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
          }`}>
            <CreditCard className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight">
              CÉDULA DIGITAL
            </h1>
            <p className={`text-xs font-medium mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Sociedade Acadêmica dos Cadetes da Aeronáutica (SCAER)
            </p>
          </div>
        </div>

        {/* Minimalist Form Card */}
        <div className={`p-6 sm:p-7 rounded-xl border transition-all duration-200 ${
          isDark
            ? 'bg-zinc-900/90 border-zinc-800'
            : 'bg-white border-zinc-200 shadow-sm'
        }`}>

          {errorMessage && (
            <div className={`mb-5 p-3 rounded-lg border text-xs font-medium flex items-center space-x-2.5 ${
              isDark ? 'bg-red-950/40 border-red-800/60 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* E-mail Input Field */}
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                E-mail ou Usuário
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="seu.email@fab.mil.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full border rounded-lg pl-9 pr-3 py-2.5 text-xs font-medium focus:outline-none transition-colors ${
                    isDark 
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500' 
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-zinc-900'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Password Input Field */}
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full border rounded-lg pl-9 pr-3 py-2.5 text-xs font-medium focus:outline-none transition-colors ${
                    isDark 
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500' 
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-zinc-900'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 ${
                isDark
                  ? 'bg-zinc-100 text-zinc-950 hover:bg-white active:bg-zinc-200'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

        </div>

        {/* Simplified Footer */}
        <div className={`text-center text-[11px] font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          <p>AFA • Diretoria de Cédula • SCAER 2026</p>
        </div>

      </div>
    </div>
  );
};
