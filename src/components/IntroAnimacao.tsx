import React, { useEffect, useState, useMemo } from 'react';
import { obterTema } from '../utils/tema';
import { Esquadrao } from '../types';

interface IntroAnimacaoProps {
  carregando: boolean;
  aoFinalizar: () => void;
}

const IntroAnimacao: React.FC<IntroAnimacaoProps> = ({ carregando, aoFinalizar }) => {
  const [sair, setSair] = useState(false);
  const [erroTimeout, setErroTimeout] = useState(false);
  const [imgErro, setImgErro] = useState(false);
  const tema = useMemo(() => obterTema(Esquadrao.QUARTO), []);
  const corPrimaria = tema.coresGrafico[2];

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let finishTimerId: ReturnType<typeof setTimeout>;

    if (!carregando && !erroTimeout) {
      timeoutId = setTimeout(() => {
        setSair(true);
        finishTimerId = setTimeout(aoFinalizar, 800);
      }, 1500); 
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (finishTimerId) clearTimeout(finishTimerId);
    };
  }, [carregando, aoFinalizar, erroTimeout]);

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (carregando) {
        setErroTimeout(true);
      }
    }, 20000);

    return () => clearTimeout(safetyTimer);
  }, [carregando]);

  return (
    <div 
      className={`
        fixed inset-0 z-50 flex flex-col items-center justify-center 
        bg-black transition-opacity duration-1000 ease-in-out
        ${sair ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      `}
    >
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center opacity-20">
        <div className={`absolute w-[300px] h-[300px] border ${tema.borda} rounded-full animate-[ping_3s_linear_infinite]`}></div>
        <div className={`absolute w-[500px] h-[500px] border ${tema.borda} rounded-full animate-[ping_3s_linear_infinite_1s]`}></div>
        <div className={`absolute w-[700px] h-[700px] border ${tema.borda} rounded-full animate-[ping_3s_linear_infinite_2s]`}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-4">
        
        <div className={`mb-6 transform transition-all duration-1000 ${sair ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`}>
          <div className="relative flex justify-center items-center">
            <div 
                className="absolute inset-0 blur-3xl opacity-20 animate-pulse"
                style={{ backgroundColor: corPrimaria }}
            ></div>
            {!imgErro ? (
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/4/4b/Sabre_alado.png" 
                alt="Gládio Alado"
                onError={() => setImgErro(true)}
                className="h-32 w-auto object-contain transition-all duration-500"
                style={{ 
                    filter: `invert(1) drop-shadow(0 0 15px ${corPrimaria}cc)` 
                }}
              />
            ) : (
              /* Fallback SVG para o Gládio Alado */
              <svg className="h-32 w-32 text-zinc-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15 9H13V18H11V9H9L12 2Z" />
                <path d="M7 10C5 10 3 12 3 14C3 16 5 17 8 17V15C6 15 5 14.5 5 14C5 13.5 6 12 7 12V10Z" />
                <path d="M17 10C19 10 21 12 21 14C21 16 19 17 16 17V15C18 15 19 14.5 19 14C19 13.5 18 12 17 12V10Z" />
              </svg>
            )}
          </div>
        </div>


        {/* Título com efeito de Reveal */}
        <div className="overflow-hidden mb-2">
          <h1 className={`
            text-4xl md:text-6xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-b ${tema.gradiente}
            transform transition-all duration-1000 delay-300
            ${sair ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100 animate-fade-in-up'}
          `}>
            Cédula Digital
          </h1>
        </div>

        {/* Linha Divisória */}
        <div 
          className={`
            h-0.5 transition-all duration-1000 delay-500
            ${sair ? 'w-0 opacity-0' : 'w-32 md:w-64 opacity-100'}
          `}
          style={{ 
            background: `linear-gradient(90deg, transparent, ${corPrimaria}80, transparent)` 
          }}
        ></div>

        {/* Subtítulo ou Mensagem de Erro */}
        <div className="overflow-hidden mt-3 min-h-[40px]">
          {erroTimeout ? (
             <div className="text-red-400 font-bold bg-red-900/20 px-4 py-2 rounded border border-red-500/30 animate-pulse">
                Erro: Tempo limite excedido.<br/>Verifique sua conexão.
             </div>
          ) : (
            <p className={`
              text-sm md:text-lg ${tema.texto} opacity-80 font-medium tracking-[0.2em] uppercase
              transform transition-all duration-1000 delay-700
              ${sair ? 'translate-y-5 opacity-0' : 'translate-y-0 opacity-100'}
            `}>
              Dos cadetes, para os cadetes
            </p>
          )}
        </div>

      </div>

      {/* Footer / Loader */}
      {!erroTimeout && (
        <div className={`absolute bottom-8 flex flex-col items-center gap-3 transition-opacity duration-500 ${sair ? 'opacity-0' : 'opacity-100'}`}>
           <div className="flex flex-col items-center gap-1">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Carregando Sistema</p>
              <div className={`w-32 h-0.5 bg-zinc-900 rounded-full overflow-hidden border ${tema.borda}`}>
                  <div 
                    className="h-full animate-[progress_2s_ease-in-out_infinite]"
                    style={{ 
                        backgroundColor: corPrimaria,
                        boxShadow: `0 0 10px ${corPrimaria}80`
                    }}
                  ></div>
              </div>
           </div>
           
           {/* Créditos do Desenvolvedor */}
           <p className="text-[10px] text-zinc-600 font-mono mt-2">
             Desenvolvido por Cad Felipe
           </p>
        </div>
      )}

      {erroTimeout && (
         <button 
           onClick={() => window.location.reload()}
           className="absolute bottom-10 px-6 py-2 bg-zinc-800 text-white rounded border border-zinc-600 hover:bg-zinc-700"
         >
           Tentar Novamente
         </button>
      )}

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default IntroAnimacao;
