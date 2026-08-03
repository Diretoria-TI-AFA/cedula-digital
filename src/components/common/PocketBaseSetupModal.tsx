import React from 'react';
import { POCKETBASE_URL } from '../../lib/pocketbase';
import { Server, CheckCircle2, ShieldCheck } from 'lucide-react';

interface PocketBaseSetupModalProps {
  onClose: () => void;
  onSuccess: () => void;
  theme?: 'dark' | 'light';
}

export const PocketBaseSetupModal: React.FC<PocketBaseSetupModalProps> = ({ onClose, theme = 'dark' }) => {
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`w-full max-w-xl rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-4 ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">Servidor PocketBase Conectado</h3>
              <p className="text-xs text-slate-400">URL: <strong className="text-emerald-400">{POCKETBASE_URL}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            ✕
          </button>
        </div>

        {/* Status de Sucesso */}
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-3">
          <div className="font-bold flex items-center space-x-2 text-base text-white">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <span>PocketBase Provisionado com Sucesso!</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-300">
            Todas as coleções (<code>clubs</code>, <code>club_memberships</code>, <code>expenses</code>, <code>director_reports</code> e <code>users</code>) foram criadas e os 14 clubes da SCAER com os cadastros dos cadetes já foram sincronizados no servidor real do PocketHost.
          </p>
        </div>

        {/* Informações Úteis */}
        <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
          isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <div className="font-bold text-slate-200 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Painel Administrativo do PocketHost:</span>
          </div>
          <p className="font-mono text-cyan-400">
            <a href="https://cedula.pockethost.io/_/" target="_blank" rel="noreferrer" className="underline">
              https://cedula.pockethost.io/_/
            </a>
          </p>
        </div>

        {/* Rodapé */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg"
          >
            Concluído
          </button>
        </div>

      </div>
    </div>
  );
};
