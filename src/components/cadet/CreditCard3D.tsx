import React, { useState } from 'react';
import type { User } from '../../types';
import { CadetQRCodeModal } from '../common/CadetQRCodeModal';
import { Shield, Sparkles, QrCode, Eye, EyeOff, Lock, Maximize2 } from 'lucide-react';

interface CreditCard3DProps {
  user: User;
  invoiceTotal: number;
  dueDate: string;
  theme?: 'dark' | 'light';
}

export const CreditCard3D: React.FC<CreditCard3DProps> = ({ user, invoiceTotal, dueDate, theme = 'dark' }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const isDark = theme === 'dark';

  return (
    <div className="w-full max-w-md mx-auto my-6">
      
      {/* Superior Controls */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center space-x-2 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
          <span className={`font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Cédula Digital SCAER
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Botão QR Code Modal */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg border bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 transition-all font-bold"
            title="Expandir QR Code para Leitura"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR ID</span>
          </button>

          <button
            onClick={() => setShowValues(!showValues)}
            className={`flex items-center space-x-1.5 text-xs transition-colors px-2.5 py-1 rounded-lg border ${
              isDark
                ? 'text-slate-400 hover:text-cyan-400 bg-slate-900/60 border-slate-800'
                : 'text-slate-600 hover:text-blue-600 bg-slate-100 border-slate-300'
            }`}
          >
            {showValues ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showValues ? 'Ocultar Valor' : 'Exibir Valor'}</span>
          </button>
        </div>
      </div>

      {/* Cartão Simplificado de Cédula Digital (Flip 3D) */}
      <div
        className="group relative w-full h-56 sm:h-60 cursor-pointer perspective-1000 select-none"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`relative w-full h-full duration-700 transform-style-3d transition-transform ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRENTE DO CARTÃO */}
          <div className={`absolute inset-0 w-full h-full rounded-3xl p-6 flex flex-col justify-between overflow-hidden backdrop-blur-2xl border shadow-2xl backface-hidden transition-colors ${
            isDark
              ? 'bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-slate-900/95 border-white/15 shadow-cyan-500/10'
              : 'bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 border-slate-700 shadow-xl'
          }`}>
            
            {/* Fluid Glow Background */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-400/30 transition-all duration-500" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/30 transition-all duration-500" />

            {/* Header do Cartão */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Shield className="w-8 h-8 text-cyan-400" />
                <div>
                  <span className="text-sm font-black tracking-widest text-white uppercase block leading-tight">
                    SCAER
                  </span>
                  <span className="text-[9px] font-bold text-cyan-400 tracking-wider block">
                    CÉDULA DIGITAL
                  </span>
                </div>
              </div>

              {/* Chip Militar Reflexivo */}
              <div className="w-10 h-8 rounded-lg bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-amber-400/30 rounded-md border border-amber-200/50 flex flex-col justify-around px-1 py-0.5">
                  <div className="w-full h-0.5 bg-amber-800/40 rounded-full" />
                  <div className="w-2/3 h-0.5 bg-amber-800/40 rounded-full" />
                  <div className="w-full h-0.5 bg-amber-800/40 rounded-full" />
                </div>
              </div>
            </div>

            {/* Informações do Cadete (Número e Nome formatados: XX/XXX NOME) */}
            <div className="relative z-10 my-auto">
              <div className="text-xs font-mono text-cyan-400 tracking-widest mb-0.5 uppercase">
                NÚMERO E NOME
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono tracking-wide text-white uppercase drop-shadow-md">
                {user.cadetNumber} {user.warName}
              </div>
              <div className="text-xs font-medium text-slate-300 mt-1">
                {user.squadron}
              </div>
            </div>

            {/* Total da Cédula do Mês */}
            <div className="relative z-10 flex items-end justify-between border-t border-white/10 pt-3">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                  TITULAR
                </span>
                <span className="text-xs font-bold text-slate-200 uppercase">
                  {user.name}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                  TOTAL DA CÉDULA
                </span>
                <span className="text-lg font-black text-cyan-300 font-mono">
                  {showValues ? `R$ ${invoiceTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '••••••'}
                </span>
              </div>
            </div>

            {/* Indicador para girar */}
            <div className="absolute right-3 top-3 text-[9px] text-slate-400 opacity-60 pointer-events-none">
              Girar 🔄
            </div>
          </div>

          {/* VERSO DO CARTÃO (IDENTIDADE DIGITAL QR CODE INTERATIVO) */}
          <div className={`absolute inset-0 w-full h-full rounded-3xl p-6 flex flex-col justify-between overflow-hidden backdrop-blur-2xl border shadow-2xl backface-hidden rotate-y-180 transition-colors ${
            isDark
              ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-cyan-500/30'
              : 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/40'
          }`}>
            
            {/* Faixa Magnética Oficial */}
            <div className="absolute top-5 left-0 w-full h-10 bg-slate-900 border-y border-slate-800 shadow-inner flex items-center justify-end px-4">
              <span className="text-[9px] font-mono text-slate-400 tracking-wider">
                SOCIEDADE ACADÊMICA DOS CADETES DA AERONÁUTICA
              </span>
            </div>

            {/* Conteúdo Central Verso */}
            <div className="relative z-10 mt-12 flex items-center justify-between">
              <div className="space-y-1 max-w-[200px]">
                <div className="text-xs font-bold text-white uppercase">
                  {user.cadetNumber} {user.warName}
                </div>
                <div className="text-[10px] text-slate-300">
                  Cédula acadêmica para controle de consumos e mensalidades nos clubes da SCAER.
                </div>
                <div className="text-[10px] font-mono text-cyan-400 pt-1">
                  CPF: {user.cpf}
                </div>
              </div>

              {/* QR Code Interativo */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQrModal(true);
                }}
                className="flex flex-col items-center bg-white p-2 rounded-xl shadow-lg border border-cyan-400/40 hover:scale-105 transition-all cursor-pointer group/qr"
                title="Expandir QR Code para Leitura"
              >
                <div className="relative">
                  <QrCode className="w-14 h-14 text-slate-950" />
                  <div className="absolute inset-0 bg-cyan-500/20 rounded opacity-0 group-hover/qr:opacity-100 flex items-center justify-center transition-all">
                    <Maximize2 className="w-5 h-5 text-slate-950" />
                  </div>
                </div>
                <span className="text-[8px] font-extrabold text-slate-950 tracking-tighter mt-1 uppercase">
                  AMPLIAR QR CODE
                </span>
              </div>
            </div>

            {/* Rodapé do Verso */}
            <div className="relative z-10 text-[9px] text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2">
              <div className="flex items-center space-x-1 text-emerald-400 font-semibold">
                <Lock className="w-3 h-3" />
                <span>Assinatura Digital SCAER</span>
              </div>
              <span className="font-mono text-slate-300">Vencimento Cédula: {dueDate}</span>
            </div>

          </div>

        </div>
      </div>

      {/* Modal QR Code */}
      {showQrModal && (
        <CadetQRCodeModal user={user} onClose={() => setShowQrModal(false)} theme={theme} />
      )}

    </div>
  );
};
