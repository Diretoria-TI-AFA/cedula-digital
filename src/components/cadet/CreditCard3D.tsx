import React, { useState } from 'react';
import type { User } from '../../types';
import { CadetQRCodeModal } from '../common/CadetQRCodeModal';
import { Shield, QrCode, Eye, EyeOff } from 'lucide-react';

interface CreditCard3DProps {
  user: User;
  invoiceTotal: number;
  dueDate: string;
  theme?: 'dark' | 'light';
}

export const CreditCard3D: React.FC<CreditCard3DProps> = ({ user, invoiceTotal, dueDate, theme = 'dark' }) => {
  const [showValues, setShowValues] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const isDark = theme === 'dark';

  return (
    <div className="w-full max-w-xl mx-auto my-4">
      
      {/* Flat Cadet Identity Card */}
      <div className={`p-6 sm:p-7 rounded-2xl border transition-all duration-200 ${
        isDark
          ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
          : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
      }`}>
        
        {/* Card Header */}
        <div className="flex items-center justify-between border-b pb-4 border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg border ${
              isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-100 border-zinc-200 text-zinc-900'
            }`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider uppercase block leading-none">
                SCAER • Cédula Digital
              </span>
              <span className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {user.squadron || 'Academia da Força Aérea'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowValues(!showValues)}
              className={`p-2 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                isDark
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900'
              }`}
              title={showValues ? 'Ocultar Saldo' : 'Exibir Saldo'}
            >
              {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                isDark
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100 hover:bg-white'
                  : 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>QR ID</span>
            </button>
          </div>
        </div>

        {/* Cadet Identity Body */}
        <div className="py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <span className={`text-[11px] font-semibold uppercase tracking-wider block ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              Cadete Titular
            </span>
            <div className="text-xl font-bold font-mono tracking-tight mt-0.5">
              {user.cadetNumber ? `#${user.cadetNumber} ` : ''}{user.warName || user.name}
            </div>
            <div className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              CPF: {user.cpf || 'Não informado'}
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-200 dark:border-zinc-800">
            <span className={`text-[11px] font-semibold uppercase tracking-wider block ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              Total da Cédula
            </span>
            <div className="text-2xl font-black font-mono tracking-tight mt-0.5">
              {showValues ? `R$ ${invoiceTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '••••••'}
            </div>
            <div className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Vencimento: {dueDate}
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
