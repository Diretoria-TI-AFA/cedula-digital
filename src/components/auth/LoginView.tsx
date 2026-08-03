import React, { useState } from 'react';
import type { User } from '../../types';
import { pb } from '../../lib/pocketbase';
import { CreditCard, Lock, Mail, ArrowRight, AlertCircle, Sun, Moon, Shield, Sparkles } from 'lucide-react';

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

      onLoginSuccess(authRecord);
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      setErrorMessage('E-mail ou senha incorreta. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative min-h-screen flex flex-col justify-center items-center p-4 overflow-hidden select-none transition-colors duration-500 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Dynamic Animated Background Mesh */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Floating Ambient Glowing Orbs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse duration-1000" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse duration-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse duration-1000" />

        {/* Subtle Military Radar Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-30">
        <button
          onClick={onToggleTheme}
          className={`p-3.5 rounded-2xl border backdrop-blur-xl shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
            isDark 
              ? 'bg-slate-900/80 border-slate-800 text-amber-400 hover:bg-slate-800 hover:border-amber-400/30' 
              : 'bg-white/80 border-slate-200 text-indigo-600 hover:bg-slate-100 hover:border-indigo-400/40'
          }`}
          title="Alternar Tema"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-20 space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Animated Brand Header */}
        <div className="text-center space-y-4">
          <div className="relative inline-flex items-center justify-center">
            {/* Glowing Ring Animation */}
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 rounded-3xl blur-xl opacity-70 animate-tilt duration-1000 group-hover:opacity-100" />
            
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-0.5 shadow-2xl shadow-cyan-500/40">
              <div className={`w-full h-full rounded-[22px] flex items-center justify-center backdrop-blur-xl transition-colors ${
                isDark ? 'bg-slate-950/90' : 'bg-white/90'
              }`}>
                <CreditCard className="w-10 h-10 text-cyan-400 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-center space-x-2.5">
              <h1 className="text-3xl font-black tracking-wider bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-sm">
                CÉDULA DIGITAL
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-black tracking-widest rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 uppercase shadow-sm">
                SCAER
              </span>
            </div>
            <p className={`text-xs font-semibold tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Sociedade Acadêmica dos Cadetes da Aeronáutica
            </p>
          </div>
        </div>

        {/* Glassmorphic Form Card */}
        <div className={`relative p-8 sm:p-9 rounded-3xl border shadow-2xl backdrop-blur-2xl transition-all duration-300 ${
          isDark
            ? 'bg-slate-900/80 border-slate-800/80 shadow-cyan-500/5 hover:border-slate-700'
            : 'bg-white/90 border-slate-200/90 shadow-slate-300/40 hover:border-slate-300'
        }`}>
          
          {/* Decorative Corner Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-bl-full blur-2xl pointer-events-none" />

          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center space-x-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* E-mail Input Field */}
            <div className="space-y-2">
              <label className={`text-xs font-bold tracking-wider uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                E-mail
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-cyan-400" />
                <input
                  type="text"
                  placeholder="tp.fulanoabc@fab.mil.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full border rounded-2xl pl-11 pr-4 py-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all duration-200 ${
                    isDark 
                      ? 'bg-slate-950/70 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500/50' 
                      : 'bg-slate-50/80 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Password Input Field */}
            <div className="space-y-2">
              <label className={`text-xs font-bold tracking-wider uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Senha
              </label>
              <div className="relative group">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-cyan-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full border rounded-2xl pl-11 pr-4 py-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all duration-200 ${
                    isDark 
                      ? 'bg-slate-950/70 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500/50' 
                      : 'bg-slate-50/80 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Glowing Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full group overflow-hidden rounded-2xl p-0.5 font-black text-xs uppercase tracking-wider transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 rounded-2xl transition-all duration-300 group-hover:opacity-90" />
              <div className="relative px-6 py-4 rounded-[14px] bg-transparent text-white flex items-center justify-center space-x-2 shadow-xl shadow-cyan-500/25">
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Autenticando...</span>
                  </div>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </div>
            </button>

          </form>

        </div>

        {/* Simplified Official Footer */}
        <div className="text-center text-xs font-bold tracking-wide opacity-80 space-y-1">
          <p className="flex items-center justify-center space-x-2">
            <Shield className="w-3.5 h-3.5 text-cyan-400 inline" />
            <span>Academia da Força Aérea • Diretoria de Cédula • © 2026 SCAER</span>
          </p>
        </div>

      </div>
    </div>
  );
};
