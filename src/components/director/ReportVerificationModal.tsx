import React, { useState } from 'react';
import type { DirectorReport } from '../../types';
import { ShieldCheck, Search, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ReportVerificationModalProps {
  reports: DirectorReport[];
  onClose: () => void;
}

export const ReportVerificationModal: React.FC<ReportVerificationModalProps> = ({ reports, onClose }) => {
  const [hashInput, setHashInput] = useState<string>('');
  const [searchResult, setSearchResult] = useState<DirectorReport | null | 'not_found'>(null);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHash = hashInput.trim();
    if (!cleanHash) return;

    const found = reports.find(
      (r) => r.verificationHash.toLowerCase() === cleanHash.toLowerCase() || r.id === cleanHash
    );

    if (found) {
      setSearchResult(found);
    } else {
      setSearchResult('not_found');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 rounded-3xl border border-purple-500/30 p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Validador de Autenticidade Digital</h3>
              <p className="text-xs text-slate-400">Verifique a assinatura e selo de relatórios da Diretoria</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            ✕
          </button>
        </div>

        {/* Formulario de Pesquisa por Hash */}
        <form onSubmit={handleVerify} className="space-y-3">
          <label className="text-xs font-bold text-slate-300 block">
            Insira o Código SHA-256 ou ID do Relatório
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="ex: e3b0c44298fc1c149afbf4c8996fb924..."
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-cyan-300 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center space-x-1"
            >
              <Search className="w-4 h-4" />
              <span>Verificar</span>
            </button>
          </div>
        </form>

        {/* Resultado: VÁLIDO */}
        {searchResult && searchResult !== 'not_found' && (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-3 animate-in fade-in">
            <div className="flex items-center space-x-2 font-bold text-sm text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span>DOCUMENTO AUTÊNTICO E ASSINADO</span>
            </div>

            <div className="text-xs space-y-1.5 text-slate-200">
              <div><strong>Título:</strong> {searchResult.title}</div>
              <div><strong>Período:</strong> {searchResult.period}</div>
              <div><strong>Faturamento Auditado:</strong> R$ {searchResult.totalAmount.toFixed(2)}</div>
              <div><strong>Emissor:</strong> {searchResult.directorName}</div>
              <div><strong>Data de Emissão:</strong> {searchResult.issuedAt}</div>
              <div className="pt-2 text-[10px] font-mono text-emerald-400 break-all">
                HASH: {searchResult.verificationHash}
              </div>
            </div>
          </div>
        )}

        {/* Resultado: NÃO ENCONTRADO */}
        {searchResult === 'not_found' && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center space-x-3 text-xs">
            <AlertCircle className="w-6 h-6 shrink-0 text-red-400" />
            <div>
              <strong className="block text-red-400 font-bold">Relatório não encontrado ou adulterado!</strong>
              Nenhum documento assinado pela Diretoria corresponde a este código de validação.
            </div>
          </div>
        )}

        <div className="text-center pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-all"
          >
            Fechar Validador
          </button>
        </div>

      </div>
    </div>
  );
};
