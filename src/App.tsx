import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Esquadrao } from './types';
import type { Cadete } from './types';
import { recuperarCache, recuperarTimestampCache, buscarDadosRede } from './services/api';
import CardVidro from './components/CardVidro';
import ResumoCedula from './components/ResumoCedula';
import IntroAnimacao from './components/IntroAnimacao';
import { obterTema } from './utils/tema';

const App: React.FC = () => {
  const [cadetes, setCadetes] = useState<Cadete[]>([]);
  // 'carregandoInicial' controla a Intro. 'atualizando' controla o spinner do Pull-to-refresh.
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [usandoCache, setUsandoCache] = useState(false);
  const [dataCache, setDataCache] = useState<string | null>(null);
  const [esquadraoSelecionado, setEsquadraoSelecionado] = useState<Esquadrao>(Esquadrao.QUARTO);
  const [termoBusca, setTermoBusca] = useState('');
  const [cadeteSelecionado, setCadeteSelecionado] = useState<Cadete | null>(null);
  
  // Controle da Intro
  const [mostrarIntro, setMostrarIntro] = useState(true);
  const aoFinalizarIntro = useCallback(() => setMostrarIntro(false), []);

  // Variáveis para Pull to Refresh
  const [pullY, setPullY] = useState(0);
  const touchStartRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 120; // Pixels para disparar o refresh

  // Calcula o tema do esquadrão selecionado
  const temaAtual = useMemo(() => obterTema(esquadraoSelecionado), [esquadraoSelecionado]);

  const atualizarFormatacaoDataCache = () => {
    const ts = recuperarTimestampCache();
    if (ts) {
      setDataCache(new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }
  };

  // Lógica principal de carregamento (Stale-While-Revalidate)
  useEffect(() => {
    const iniciarApp = async () => {
      // 1. Tenta carregar do cache imediatamente para performance instantânea
      const cache = recuperarCache();
      if (cache && cache.length > 0) {
        setCadetes(cache);
        setUsandoCache(true);
        atualizarFormatacaoDataCache();
        setCarregandoInicial(false); // Dados prontos, pode parar a intro
      }

      // 2. Busca na rede para atualizar (em background se já tiver cache)
      try {
        const dadosRede = await buscarDadosRede();
        setCadetes(dadosRede); // Atualiza com dados frescos
        setUsandoCache(false);
        atualizarFormatacaoDataCache();
        setErro(null);
      } catch (e: any) {
        console.error("Erro no carregamento de rede:", e);
        if (!cache || cache.length === 0) {
           setErro("Não foi possível conectar. Verifique sua internet.");
        } else {
           setErro("Conexão instável. Exibindo dados em cache.");
        }
      } finally {
        setCarregandoInicial(false);
      }
    };

    iniciarApp();
  }, []);

  const lidarComAtualizacaoManual = async () => {
    setAtualizando(true);
    try {
      const dados = await buscarDadosRede();
      setCadetes(dados);
      setUsandoCache(false);
      atualizarFormatacaoDataCache();
      setErro(null);
    } catch (e) {
      console.warn("Falha ao atualizar dados manualmente");
      setErro("Falha ao atualizar. Verifique sua conexão.");
    } finally {
      setAtualizando(false);
      setPullY(0);
    }
  };

  // --- Handlers do Pull to Refresh ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && !cadeteSelecionado) {
      touchStartRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchY = e.touches[0].clientY;
    const delta = touchY - touchStartRef.current;

    // Só permite puxar se estiver no topo e arrastando para baixo
    if (window.scrollY === 0 && delta > 0 && !cadeteSelecionado && !atualizando) {
      setPullY(delta * 0.4); // Coeficiente de resistência (0.4)
    }
  };

  const handleTouchEnd = () => {
    if (pullY > PULL_THRESHOLD) {
      lidarComAtualizacaoManual();
    } else {
      setPullY(0);
    }
  };
  // ------------------------------------

  // Filtrar cadetes com busca insensível a acentos
  const cadetesFiltrados = useMemo(() => {
    const termoNorm = termoBusca.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    return cadetes.filter(c => {
      const matchEsquadrao = c.esquadrao === esquadraoSelecionado;
      if (!matchEsquadrao) return false;
      if (!termoNorm) return true;

      const nomeNorm = c.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const matchNome = nomeNorm.includes(termoNorm);
      const matchNumero = c.numero && c.numero.toString().includes(termoNorm);
      return matchNome || matchNumero;
    });
  }, [cadetes, esquadraoSelecionado, termoBusca]);

  const calcularTotalDivida = (c: Cadete) => c.itens.reduce((acc, i) => acc + (i.valor || 0), 0);

  return (
    <div 
      className="min-h-screen relative overflow-hidden bg-black selection:bg-white/20 selection:text-white"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      ref={containerRef}
    >
      
      {/* Componente de Introdução */}
      {mostrarIntro && (
        <IntroAnimacao 
          carregando={carregandoInicial} 
          aoFinalizar={aoFinalizarIntro} 
        />
      )}


      {/* Indicador de Pull to Refresh */}
      <div 
        className="fixed top-0 left-0 w-full flex justify-center pointer-events-none z-40 transition-transform duration-200"
        style={{ transform: `translateY(${pullY > 0 ? pullY - 40 : -100}px)` }}
      >
        <div className={`
          bg-zinc-900/80 backdrop-blur border border-emerald-500/30 rounded-full p-2 shadow-lg flex items-center gap-2
          ${pullY > PULL_THRESHOLD ? 'text-emerald-400' : 'text-zinc-400'}
        `}>
          {atualizando ? (
             <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${pullY > PULL_THRESHOLD ? 'rotate-180 transition-transform' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
          <span className="text-xs font-bold uppercase tracking-wider">
             {atualizando ? 'Atualizando...' : (pullY > PULL_THRESHOLD ? 'Solte para Atualizar' : 'Puxe para Atualizar')}
          </span>
        </div>
      </div>

      {/* Background Decorativo Dinâmico */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 transition-colors duration-1000">
        <div className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse opacity-20 bg-gradient-to-br ${temaAtual.gradiente}`}></div>
        <div className={`absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 bg-gradient-to-tl ${temaAtual.gradiente}`}></div>
      </div>

      {/* Transformação do Container Principal durante o Pull */}
      <div 
        className="container mx-auto px-4 py-8 md:py-12 max-w-5xl transition-transform duration-200 ease-out"
        style={{ transform: `translateY(${pullY}px)` }}
      >
        {/* Cabeçalho */}
        <header className="mb-8 text-center relative">
          <h1 className={`text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${temaAtual.gradiente} mb-2 drop-shadow-lg transition-all duration-500`}>
            Cédula Digital
          </h1>
          <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm md:text-base">
            <span>Consulta de extratos e compras discriminadas</span>
            <button 
              onClick={lidarComAtualizacaoManual} 
              disabled={atualizando}
              className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Atualizar dados"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${atualizando ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          {dataCache && (
            <p className="text-xs text-zinc-500 mt-1">
              {usandoCache ? '⚡ Dados em cache off-line (' : '🟢 Atualizado às '}
              {dataCache}
              {usandoCache ? ')' : ''}
            </p>
          )}

          {erro && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200 text-sm inline-block animate-fade-in">
              {erro}
            </div>
          )}
        </header>

        {/* Conteúdo Principal */}
        {carregandoInicial && !cadetes.length ? (
           /* Estado de carregamento inicial é coberto pela IntroAnimacao, 
              mas mantemos um placeholder vazio para evitar layout shift se a intro sumir por erro */
           <div className="h-64"></div>
        ) : cadeteSelecionado ? (
          /* Visualização de Detalhe */
          <ResumoCedula 
            cadete={cadeteSelecionado} 
            aoVoltar={() => setCadeteSelecionado(null)} 
          />
        ) : (
          /* Visualização de Lista e Filtros */
          <div className="space-y-8 animate-fade-in-up">
            
            {/* Seletor de Esquadrão */}
            <nav className="flex flex-wrap justify-center gap-2 md:gap-4">
              {Object.values(Esquadrao).map((esq) => {
                const temaBotao = obterTema(esq);
                const isSelected = esquadraoSelecionado === esq;
                
                return (
                  <button
                    key={esq}
                    onClick={() => setEsquadraoSelecionado(esq)}
                    className={`
                      px-5 py-2.5 rounded-xl font-medium transition-all duration-300 text-sm md:text-base border
                      ${isSelected 
                        ? `${temaBotao.botaoAtivo} scale-105 border-transparent` 
                        : 'bg-zinc-900/40 text-zinc-400 border-white/10 hover:bg-white/5'}
                      ${isSelected ? '' : temaBotao.bgHover}
                    `}
                  >
                    {esq}
                  </button>
                );
              })}
            </nav>

            {/* Barra de Busca */}
            <div className="max-w-xl mx-auto relative group">
              <input
                type="text"
                placeholder="Pesquisar nome do cadete ou número..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className={`w-full bg-zinc-900/50 backdrop-blur border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 transition-all shadow-inner ${temaAtual.bgHover} focus:${temaAtual.borda}`}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 group-hover:text-zinc-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Lista de Resultados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cadetesFiltrados.length > 0 ? (
                cadetesFiltrados.map((cadete) => (
                  <CardVidro 
                    key={cadete.id} 
                    hoverEffect={true}
                    onClick={() => setCadeteSelecionado(cadete)}
                    className={`flex justify-between items-center group border-white/5 ${temaAtual.bgHover}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar com Gradiente do Esquadrão */}
                      <div className={`h-12 w-12 rounded-full bg-gradient-to-tr ${temaAtual.gradiente} flex items-center justify-center text-black font-bold text-lg shadow-lg shrink-0 opacity-90 group-hover:opacity-100`}>
                        {cadete.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className={`font-semibold text-lg transition-colors truncate ${temaAtual.textoClaro}`}>
                          {cadete.nome}
                        </h3>
                        <p className="text-zinc-500 text-sm">
                          {cadete.numero ? `#${cadete.numero} • ` : ''} {cadete.esquadrao}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-zinc-500 uppercase">Total</p>
                      <p className={`font-mono font-bold text-lg ${temaAtual.texto}`}>
                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calcularTotalDivida(cadete))}
                      </p>
                    </div>
                  </CardVidro>
                ))
              ) : (
                <div className="col-span-full text-center py-12 flex flex-col items-center">
                  <div className="p-4 rounded-full bg-zinc-900 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <p className="text-zinc-500 text-lg">
                    {termoBusca ? 'Nenhum cadete encontrado com este nome.' : 'Nenhum cadete encontrado neste esquadrão.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
