import React from 'react';
import { Shield, CheckCircle2, Copy, Lock, Sparkles } from 'lucide-react';

interface BeautifulSealBadgeProps {
  hash: string;
  issuedAt: string;
  directorName: string;
  period: string;
  theme?: 'dark' | 'light';
}

export const BeautifulSealBadge: React.FC<BeautifulSealBadgeProps> = ({
  hash,
  issuedAt,
  directorName,
  period,
  theme = 'dark',
}) => {
  const [copied, setCopied] = React.useState(false);
  const isDark = theme === 'dark';

  const handleCopyHash = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 shadow-2xl transition-all duration-300 ${
      isDark
        ? 'bg-gradient-to-br from-slate-900 via-amber-950/30 to-slate-950 border-amber-500/40 shadow-amber-500/10'
        : 'bg-gradient-to-br from-amber-50 via-white to-slate-50 border-amber-400 shadow-xl'
    }`}>
      {/* Luzes de Fundo Holográficas */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-amber-500/20 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-gradient-to-tr from-purple-500/20 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Lado Esquerdo: Selo Holográfico com Asas AFA */}
        <div className="flex items-center space-x-5">
          <div className="relative group shrink-0">
            {/* Anel Dourado Fixo e Elegante */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 p-1 shadow-xl shadow-amber-500/30">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center border border-amber-400/50">
                <Shield className="w-10 h-10 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
              </div>
            </div>
            
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center border-2 border-slate-950 shadow-md">
              <CheckCircle2 className="w-4 h-4 stroke-[3]" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-[10px] font-black tracking-widest uppercase rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-sm flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>SELO OFICIAL DE AUTENTICIDADE</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-extrabold">AFA • SCAER</span>
            </div>

            <h4 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Diretoria de Cédula Digital ({period})
            </h4>

            <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Assinado por: <strong className="text-amber-400">{directorName}</strong> • {issuedAt}
            </p>
          </div>
        </div>

        {/* Lado Direito: Hash Criptográfica SHA-256 */}
        <div className={`w-full md:w-auto p-4 rounded-2xl border backdrop-blur-xl flex flex-col justify-between space-y-2 ${
          isDark ? 'bg-slate-950/90 border-amber-500/30' : 'bg-white border-amber-300 shadow-md'
        }`}>
          <div className="flex items-center justify-between space-x-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Hash de Auditoria SHA-256</span>
            </span>
            <button
              onClick={handleCopyHash}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center space-x-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copiado!' : 'Copiar Hash'}</span>
            </button>
          </div>

          <div className="font-mono text-xs text-cyan-300 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 break-all select-all font-bold tracking-tight">
            {hash}
          </div>
        </div>

      </div>
    </div>
  );
};
