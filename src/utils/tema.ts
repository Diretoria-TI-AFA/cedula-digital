import { Esquadrao } from '../types';

export interface TemaEsquadrao {
  nomeCor: string;
  gradiente: string; // Para textos e backgrounds
  texto: string;     // Texto padrão
  textoClaro: string; // Texto de destaque
  borda: string;
  bg: string;
  bgHover: string;
  botaoAtivo: string;
  sombra: string;
  coresGrafico: string[]; // Hex codes para o gráfico
}

export const obterTema = (esquadrao: Esquadrao): TemaEsquadrao => {
  const anoAtualFull = new Date().getFullYear();
  const anoAtual = parseInt(anoAtualFull.toString().slice(-2));

  // Determina o offset do ano baseado no esquadrão
  let offset = 0;
  switch (esquadrao) {
    case Esquadrao.PRIMEIRO: offset = 0; break;
    case Esquadrao.SEGUNDO: offset = -1; break;
    case Esquadrao.TERCEIRO: offset = -2; break;
    case Esquadrao.QUARTO: offset = -3; break;
    default: offset = 0;
  }

  const prefixoTurma = anoAtual + offset;

  // --- EXCEÇÃO: TURMA DE 2023 (Amarelo/Ouro) ---
  if (prefixoTurma === 23) {
    return {
      nomeCor: 'Jaguar (23)',
      gradiente: 'from-amber-300 via-yellow-400 to-amber-500',
      texto: 'text-amber-400',
      textoClaro: 'text-yellow-200',
      borda: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      bgHover: 'hover:border-amber-300/50',
      botaoAtivo: 'bg-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.4)]',
      sombra: 'shadow-amber-900/20',
      coresGrafico: ['#fcd34d', '#fbbf24', '#d97706', '#92400e']
    };
  }
  
  // Cálculo do Módulo para definir a cor da turma baseada no ano de entrada
  // Regra Padrão: 
  // 1º Esq (Blue), 2º Esq (Red), 3º Esq (Black), 4º Esq (Green)
  // Baseado no resto da divisão por 4.
  const mod = ((prefixoTurma % 4) + 4) % 4;

  switch (mod) {
    case 1: // AZUL (1º Esquadrão no ano base 2025)
      return {
        nomeCor: 'Azul',
        gradiente: 'from-cyan-300 via-blue-400 to-blue-600',
        texto: 'text-cyan-400',
        textoClaro: 'text-cyan-200',
        borda: 'border-blue-500/30',
        bg: 'bg-blue-500/10',
        bgHover: 'hover:border-blue-300/50',
        botaoAtivo: 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]',
        sombra: 'shadow-blue-900/20',
        coresGrafico: ['#67e8f9', '#22d3ee', '#3b82f6', '#1e40af']
      };
    case 0: // VERMELHO (2º Esquadrão no ano base 2025)
      return {
        nomeCor: 'Vermelho',
        gradiente: 'from-red-300 via-rose-400 to-red-600',
        texto: 'text-rose-400',
        textoClaro: 'text-rose-200',
        borda: 'border-red-500/30',
        bg: 'bg-red-500/10',
        bgHover: 'hover:border-red-300/50',
        botaoAtivo: 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]',
        sombra: 'shadow-red-900/20',
        coresGrafico: ['#fca5a5', '#f87171', '#ef4444', '#991b1b']
      };
    case 3: // PRETO (3º Esquadrão no ano base 2025)
      return {
        nomeCor: 'Preto',
        gradiente: 'from-zinc-200 via-zinc-400 to-zinc-600',
        texto: 'text-zinc-400',
        textoClaro: 'text-zinc-100',
        borda: 'border-zinc-500/30',
        bg: 'bg-zinc-700/20',
        bgHover: 'hover:border-zinc-300/50',
        botaoAtivo: 'bg-zinc-200 text-black shadow-[0_0_20px_rgba(228,228,231,0.3)]',
        sombra: 'shadow-zinc-900/40',
        coresGrafico: ['#e4e4e7', '#a1a1aa', '#52525b', '#27272a']
      };
    case 2: // VERDE (4º Esquadrão no ano base 2025)
      return {
        nomeCor: 'Verde',
        gradiente: 'from-emerald-300 via-green-400 to-emerald-600',
        texto: 'text-emerald-400',
        textoClaro: 'text-emerald-200',
        borda: 'border-emerald-500/30',
        bg: 'bg-emerald-500/10',
        bgHover: 'hover:border-emerald-300/50',
        botaoAtivo: 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]',
        sombra: 'shadow-emerald-900/20',
        coresGrafico: ['#6ee7b7', '#34d399', '#10b981', '#065f46']
      };
    default:
      // Fallback genérico (não deve acontecer com lógica correta)
      return {
        nomeCor: 'Desconhecido',
        gradiente: 'from-gray-200 to-gray-400',
        texto: 'text-gray-400',
        textoClaro: 'text-gray-200',
        borda: 'border-gray-500/30',
        bg: 'bg-gray-500/10',
        bgHover: 'hover:border-gray-200/50',
        botaoAtivo: 'bg-gray-500 text-white',
        sombra: 'shadow-none',
        coresGrafico: ['#d1d5db', '#9ca3af', '#6b7280', '#374151']
      };
  }
};
