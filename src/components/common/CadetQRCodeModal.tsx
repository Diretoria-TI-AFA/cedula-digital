import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { User } from '../../types';
import { QrCode, ShieldCheck, X } from 'lucide-react';

interface CadetQRCodeModalProps {
  user: User;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const CadetQRCodeModal: React.FC<CadetQRCodeModalProps> = ({ user, onClose, theme = 'dark' }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const isDark = theme === 'dark';

  const qrPayload = `SCAER_CADET_ID:${user.cadetNumber}:${user.warName}:${user.id}`;

  useEffect(() => {
    QRCode.toDataURL(qrPayload, {
      width: 400,
      margin: 2,
      color: {
        dark: '#020617', // Slate 950
        light: '#ffffff',
      },
    }).then((url) => {
      setQrDataUrl(url);
    }).catch(console.error);
  }, [qrPayload]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className={`w-full max-w-sm rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-6 text-center relative ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Botão Fechar */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-2">
            <QrCode className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black tracking-tight">Identidade Digital SCAER</h3>
          <p className="text-xs text-slate-400 font-mono">Aprensentar para lançamento de gastos</p>
        </div>

        {/* QR Code Frame */}
        <div className="p-4 rounded-2xl bg-white shadow-2xl inline-block border-4 border-cyan-500/30">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code Cédula Digital" className="w-56 h-56 mx-auto rounded-lg" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs font-bold animate-pulse">
              Gerando QR Code...
            </div>
          )}
        </div>

        {/* Cadete Info */}
        <div className={`p-4 rounded-2xl border space-y-1 font-mono ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="text-base font-extrabold text-cyan-400">
            {user.cadetNumber} {user.warName}
          </div>
          <div className="text-xs text-slate-400">{user.name}</div>
          <div className="text-[10px] text-slate-500 uppercase">{user.squadron}</div>
        </div>

        {/* Rodapé com Selo */}
        <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>QR Code Verificado pela Diretoria de Cédula</span>
        </div>

      </div>
    </div>
  );
};
