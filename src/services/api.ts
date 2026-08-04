import { Esquadrao } from '../types';
import type { Cadete, LinhaPlanilha } from '../types';

// ---------------------------------------------------------------------------
// CONFIGURAÇÃO APPS SCRIPT WEB APP
// ---------------------------------------------------------------------------
const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbxSHYfpoMtF6pecS7bPUOvN3GPna5W5glUYsb_4bGaSrbQRZCkme9JBTD2GedvuGzFAVg/exec';

const CACHE_KEY = 'cedula_dados_cache_v2';
const CACHE_TIME_KEY = 'cedula_timestamp_v2';

// Função para limpar e converter valores monetários (ex: "34,00" -> 34.00, "176.29" -> 176.29)
const limparValor = (valor: string | number): number => {
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
  if (!valor) return 0;
  
  let str = valor.toString().replace('R$', '').trim();
  if (!str) return 0;

  // Trata separadores monetários brasileiros vs americanos
  if (str.includes('.') && str.includes(',')) {
    // Formato PT-BR com milhar (ex: "1.234,56")
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    // Formato PT-BR simples (ex: "1234,56" ou "34,50")
    str = str.replace(',', '.');
  }
  // Formato padrão com ponto decimal (ex: "176.29") é mantido intacto

  const res = parseFloat(str);
  return isNaN(res) ? 0 : res;
};

/**
 * Determina o esquadrão com base no ano de entrada da matrícula (Ex: "23/001" -> Ano 23)
 */
const identificarEsquadraoPorNumero = (numero: string): Esquadrao | null => {
  const n = numero.toString().replace(/\D/g, '').trim();
  if (n.length < 2) return null;

  // Extrai os 2 primeiros dígitos do ano de ingresso (ex: "23" em "23001" ou "23/001")
  const anoIngresso = parseInt(n.substring(0, 2), 10);
  if (isNaN(anoIngresso)) return null;

  const anoAtualFull = new Date().getFullYear();
  const anoAtual2Digitos = parseInt(anoAtualFull.toString().slice(-2), 10);

  // Anos decorridos desde o ingresso
  const anosDeCurso = anoAtual2Digitos - anoIngresso;

  switch (anosDeCurso) {
    case 0: return Esquadrao.PRIMEIRO;
    case 1: return Esquadrao.SEGUNDO;
    case 2: return Esquadrao.TERCEIRO;
    case 3: return Esquadrao.QUARTO;
    default:
      // Fallback para mapeamento direto por ano fixo se o relógio estiver desajustado
      if (anoIngresso === 23) return Esquadrao.QUARTO;
      if (anoIngresso === 24) return Esquadrao.TERCEIRO;
      if (anoIngresso === 25) return Esquadrao.SEGUNDO;
      if (anoIngresso === 26) return Esquadrao.PRIMEIRO;
      return null; 
  }
};

export const recuperarCache = (): Cadete[] | null => {
  try {
    const cacheJson = localStorage.getItem(CACHE_KEY);
    if (cacheJson) {
      return JSON.parse(cacheJson);
    }
  } catch (e) {
    console.error("Erro ao ler cache", e);
  }
  return null;
};

export const recuperarTimestampCache = (): number | null => {
  try {
    const time = localStorage.getItem(CACHE_TIME_KEY);
    return time ? parseInt(time, 10) : null;
  } catch (e) {
    return null;
  }
};

export const buscarDadosRede = async (): Promise<Cadete[]> => {
  try {
    console.log("Iniciando busca no Google Apps Script...");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(URL_WEB_APP, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Falha HTTP Apps Script: ${response.status}`);
    
    const json = await response.json();
    
    if (json.status !== 'sucesso') {
      throw new Error(`Erro na API: ${json.mensagem || 'Erro desconhecido'}`);
    }

    const dadosBrutos: LinhaPlanilha[] = json.dados;
    if (!dadosBrutos || dadosBrutos.length === 0) throw new Error("Nenhum dado encontrado na planilha.");

    const mapaCadetes = new Map<string, Cadete>();

    dadosBrutos.forEach((linha, index) => {
      // Normaliza chaves da planilha para busca insensível a acentos/caixa
      const chaves = Object.keys(linha);

      const encontrarChave = (opcoes: string[]) => {
        return chaves.find(k => {
          const kNorm = k.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return opcoes.some(opt => kNorm === opt || kNorm.includes(opt));
        });
      };

      const chaveNumero = encontrarChave(['numero', 'num', 'nº', 'matricula']);
      const chaveNome = encontrarChave(['nome', 'cadete', 'guerra']);
      const chaveValor = encontrarChave(['valor', 'preco', 'quantia']);
      const chaveClube = encontrarChave(['clube', 'categoria', 'tipo']);
      const chaveObs = encontrarChave(['observacao', 'obs', 'descricao']);

      const numeroRaw = chaveNumero ? String(linha[chaveNumero] || '').trim() : '';
      const numeroNormalizado = numeroRaw.replace(/\D/g, '');
      const esquadraoDetectado = identificarEsquadraoPorNumero(numeroRaw);

      if (!esquadraoDetectado) {
        return;
      }

      // Usa a numeração normalizada como ID Único para agrupar todas as compras do cadete mesmo se o formato na planilha variar (ex: "23/001" vs "23001")
      const idUnico = numeroNormalizado || `unknown-${index}`;
      const nome = chaveNome ? String(linha[chaveNome] || 'Desconhecido').trim() : 'Desconhecido';
      const valor = limparValor(chaveValor ? linha[chaveValor] : 0);
      const clube = chaveClube ? String(linha[chaveClube] || 'Geral').trim() : 'Geral';
      const obs = chaveObs ? String(linha[chaveObs] || '').trim() : '';

      if (!mapaCadetes.has(idUnico)) {
        mapaCadetes.set(idUnico, {
          id: idUnico,
          numero: numeroRaw || numeroNormalizado,
          nome: nome, 
          esquadrao: esquadraoDetectado,
          itens: []
        });
      }

      const cadete = mapaCadetes.get(idUnico)!;
      
      if (cadete.nome === 'Desconhecido' && nome !== 'Desconhecido') {
        cadete.nome = nome;
      }

      cadete.itens.push({
        id: `item-${index}`,
        descricao: obs || 'Sem descrição',
        valor: valor,
        categoria: clube,
        data: new Date().toISOString()
      });
    });

    const cadetesFormatados = Array.from(mapaCadetes.values());

    cadetesFormatados.sort((a, b) => {
      return a.numero.localeCompare(b.numero, undefined, { numeric: true });
    });

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cadetesFormatados));
      localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    } catch (e) {
      console.error("Erro ao salvar cache", e);
    }

    return cadetesFormatados;

  } catch (erro) {
    console.error("Erro ao buscar dados da rede:", erro);
    throw erro;
  }
};

export const buscarDados = async (forcarAtualizacao = false): Promise<Cadete[]> => {
  if (!forcarAtualizacao) {
    const cache = recuperarCache();
    if (cache) return cache;
  }
  return buscarDadosRede();
};

