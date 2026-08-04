import React, { useMemo } from 'react';
import type { Cadete } from '../types';
import CardVidro from './CardVidro';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { obterTema } from '../utils/tema';

interface ResumoCedulaProps {
  cadete: Cadete;
  aoVoltar: () => void;
}

const formatarMoeda = (valor: number) => {
  const v = typeof valor === 'number' && !isNaN(valor) ? valor : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(v);
};


const ResumoCedula: React.FC<ResumoCedulaProps> = ({ cadete, aoVoltar }) => {
  // Obter o tema dinâmico baseado no esquadrão do cadete
  const tema = useMemo(() => obterTema(cadete.esquadrao), [cadete.esquadrao]);

  const total = useMemo(() => {
    return cadete.itens.reduce((acc, item) => acc + (item.valor || 0), 0);
  }, [cadete]);

  const dadosGrafico = useMemo(() => {
    const categorias: { [key: string]: number } = {};
    cadete.itens.forEach(item => {
      const cat = item.categoria || 'Geral';
      const val = item.valor || 0;
      if (!categorias[cat]) categorias[cat] = 0;
      categorias[cat] += val;
    });
    return Object.keys(categorias).map(key => ({
      name: key,
      value: categorias[key]
    }));
  }, [cadete]);


  return (
    <div className="space-y-6 animate-fade-in">
      <button 
        onClick={aoVoltar}
        className={`flex items-center text-zinc-400 transition-colors mb-4 hover:${tema.texto}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Voltar à lista
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cartão Principal - Total */}
        <CardVidro className={`md:col-span-2 flex flex-col justify-between relative overflow-hidden group ${tema.borda}`}>
          {/* Fundo Decorativo */}
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-32 w-32 ${tema.texto}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">{cadete.nome}</h2>
            <div className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase tracking-wider bg-white/10 ${tema.textoClaro} mb-6`}>
              {cadete.esquadrao}
            </div>
          </div>
          <div>
            <p className="text-sm text-zinc-500 uppercase tracking-wider">Total da Cédula</p>
            <div className={`text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${tema.gradiente}`}>
              {formatarMoeda(total)}
            </div>
          </div>
        </CardVidro>

        {/* Cartão Gráfico */}
        <CardVidro className={`flex flex-col items-center justify-center min-h-[250px] ${tema.borda}`}>
           <h3 className="text-lg font-medium text-white mb-2 self-start">Distribuição</h3>
           {cadete.itens.length > 0 ? (
             <div className="w-full h-48">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={dadosGrafico}
                     cx="50%"
                     cy="50%"
                     innerRadius={40}
                     outerRadius={60}
                     paddingAngle={5}
                     dataKey="value"
                     stroke="none"
                   >
                     {dadosGrafico.map((_, index) => (
                       <Cell key={`cell-${index}`} fill={tema.coresGrafico[index % tema.coresGrafico.length]} />
                     ))}

                   </Pie>
                   <Tooltip 
                      formatter={(value: any) => formatarMoeda(Number(value) || 0)}
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fefce8' }}
                      itemStyle={{ color: tema.coresGrafico[0] }}
                   />

                 </PieChart>
               </ResponsiveContainer>
             </div>
           ) : (
             <div className="text-zinc-500 text-sm">Sem dados para exibir</div>
           )}
        </CardVidro>
      </div>

      {/* Lista de Itens Discriminados */}
      <CardVidro className={tema.borda}>
        <h3 className="text-xl font-semibold text-white mb-6 border-b border-white/10 pb-4">Extrato Discriminado</h3>
        
        {cadete.itens.length === 0 ? (
          <div className="text-center py-10 text-zinc-500">
            Nenhum item lançado nesta cédula.
          </div>
        ) : (
          <>
            {/* --- VISUALIZAÇÃO MOBILE (Lista de Cards) --- */}
            <div className="md:hidden space-y-3">
              {cadete.itens.map((item) => (
                <div key={item.id} className={`p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2 ${tema.bgHover} transition-colors`}>
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-zinc-200 text-base leading-tight pr-2">{item.descricao}</span>
                    <span className={`font-mono font-bold text-lg whitespace-nowrap ${tema.texto}`}>
                      {formatarMoeda(item.valor)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1 pt-2 border-t border-white/5">
                    <span className="text-xs px-2 py-1 rounded bg-white/5 text-zinc-400 border border-white/5">
                      {item.categoria}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(item.data).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Rodapé Total Mobile */}
              <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-4 px-1">
                <span className="text-zinc-400 font-semibold uppercase text-sm">Total Geral</span>
                <span className={`font-bold text-xl ${tema.texto}`}>{formatarMoeda(total)}</span>
              </div>
            </div>

            {/* --- VISUALIZAÇÃO DESKTOP (Tabela) --- */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-zinc-500 text-sm border-b border-white/10">
                    <th className="pb-3 pl-2">Data</th>
                    <th className="pb-3">Descrição</th>
                    <th className="pb-3">Categoria</th>
                    <th className="pb-3 pr-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cadete.itens.map((item) => (
                    <tr key={item.id} className="text-zinc-300 hover:bg-white/5 transition-colors">
                      <td className="py-4 pl-2 text-sm text-zinc-500">
                        {new Date(item.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 font-medium">{item.descricao}</td>
                      <td className="py-4">
                        <span className={`
                          px-2 py-1 rounded-full text-xs font-medium bg-white/5 text-zinc-400
                        `}>
                          {item.categoria}
                        </span>
                      </td>
                      <td className={`py-4 pr-2 text-right font-mono ${tema.texto}`}>
                        {formatarMoeda(item.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/20">
                    <td colSpan={3} className="pt-4 text-right font-semibold text-white">Total</td>
                    <td className={`pt-4 pr-2 text-right font-bold text-xl ${tema.texto}`}>{formatarMoeda(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </CardVidro>
    </div>
  );
};

export default ResumoCedula;
