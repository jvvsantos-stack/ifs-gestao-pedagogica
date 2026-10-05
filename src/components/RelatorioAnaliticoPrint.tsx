import { forwardRef } from 'react';
import logoIFS from '../assets/logo-ifs.png';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface RelatorioAnaliticoPrintProps {
  filtros: {
    curso: string;
    modalidade: string;
    periodo: string;
    turma: string;
  };
  kpis: {
    totalAlunos: number;
    mediaGeral: number;
    taxaAprovacao: number;
    taxaEvasao: number;
  };
  parecerTexto: string;
  analisesData: any;
}

export const RelatorioAnaliticoPrint = forwardRef<HTMLDivElement, RelatorioAnaliticoPrintProps>(
  ({ filtros, kpis, parecerTexto, analisesData }, ref) => {
    const dataHoraEmissao = new Date().toLocaleString('pt-BR');

    // Tentar classificar os parágrafos para distribuí-los no layout
    const paragrafos = parecerTexto.split('\n').filter(p => p.trim() !== '');
    const textoGargalo = paragrafos.find(p => p.toLowerCase().includes('gargalo') || p.toLowerCase().includes('menor rendimento')) || '';
    const textoDestaque = paragrafos.find(p => p.toLowerCase().includes('destaque') || p.toLowerCase().includes('maior média')) || '';
    const textoDistribuicao = paragrafos.find(p => p.toLowerCase().includes('crítica') || p.toLowerCase().includes('atenção redobrada')) || '';
    const textoSaude = paragrafos.find(p => p.toLowerCase().includes('regularizada') || p.toLowerCase().includes('aprovados')) || '';
    
    const classificados = [textoGargalo, textoDestaque, textoDistribuicao, textoSaude];
    const outrosTextos = paragrafos.filter(p => !classificados.includes(p)).join('\n\n');

    return (
      <div ref={ref} className="p-12 bg-white text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* CSS para Impressão */}
        <style type="text/css" media="print">
          {`
            @page { size: A4; margin: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; }
          `}
        </style>

        {/* Cabeçalho */}
        <div className="flex flex-col items-center border-b-4 border-emerald-600 pb-4 mb-6 print:break-inside-avoid">
          <img src={logoIFS} alt="Logo IFS" className="w-56 mb-4" />
          <h1 className="text-2xl font-extrabold uppercase text-center text-gray-900 tracking-tight">
            Relatório Executivo de Desempenho
          </h1>
          <p className="text-sm text-gray-500 font-bold mt-1">Inteligência Pedagógica e Monitoramento Acadêmico</p>
        </div>

        {/* Filtros Ativos */}
        <div className="mb-6 flex justify-between bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs uppercase font-bold text-gray-700 print:break-inside-avoid shadow-sm">
          <span><span className="text-gray-400">Curso:</span> {filtros.curso}</span>
          <span><span className="text-gray-400">Modalidade:</span> {filtros.modalidade}</span>
          <span><span className="text-gray-400">Período:</span> {filtros.periodo}</span>
          <span><span className="text-gray-400">Turma:</span> {filtros.turma}</span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-8 print:break-inside-avoid">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center shadow-sm">
            <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Total de Alunos</p>
            <p className="text-3xl font-black text-emerald-600">{kpis.totalAlunos}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center shadow-sm">
            <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Média Institucional</p>
            <p className="text-3xl font-black text-blue-600">{kpis.mediaGeral.toFixed(2)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center shadow-sm">
            <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Taxa de Aprovação</p>
            <p className="text-3xl font-black text-indigo-600">{kpis.taxaAprovacao.toFixed(1)}%</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center shadow-sm">
            <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Taxa de Evasão</p>
            <p className="text-3xl font-black text-orange-500">{kpis.taxaEvasao.toFixed(1)}%</p>
          </div>
        </div>

        {/* Seção 1: Distribuição e Saúde */}
        <div className="grid grid-cols-2 gap-6 mb-8 print:break-inside-avoid">
          <div className="border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase text-gray-800 mb-4 border-b border-gray-100 pb-2">Distribuição de Notas</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analisesData.dadosDistribuicao} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Bar dataKey="value" isAnimationActive={false} radius={[4, 4, 0, 0]}>
                    {analisesData.dadosDistribuicao.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {textoSaude && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 shadow-sm h-full flex items-center">
                <p className="text-sm text-indigo-900 font-medium leading-relaxed">{textoSaude}</p>
              </div>
            )}
            {textoDistribuicao && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-5 shadow-sm h-full flex items-center">
                <p className="text-sm text-red-900 font-medium leading-relaxed">{textoDistribuicao}</p>
              </div>
            )}
          </div>
        </div>

        {/* Seção 2: Desempenho por Etapa e Gargalos */}
        <div className="grid grid-cols-2 gap-6 mb-8 print:break-inside-avoid">
          <div className="border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase text-gray-800 mb-4 border-b border-gray-100 pb-2">Desempenho por Etapa</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analisesData.desempenhoEtapas} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="etapa" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                  <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Line type="monotone" dataKey="media" isAnimationActive={false} stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="border border-slate-200 rounded-xl p-4 shadow-sm flex-1">
              <h3 className="text-sm font-bold uppercase text-gray-800 mb-3 border-b border-gray-100 pb-2">Top Gargalos Acadêmicos</h3>
              <div className="flex flex-col justify-between h-[120px]">
                {analisesData.gargalos.slice(0, 3).map((g: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-700 truncate max-w-[200px]">{g.nome}</span>
                    <span className="font-black text-red-600">{g.media.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
            {textoGargalo && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 shadow-sm">
                <p className="text-sm text-orange-900 font-medium leading-relaxed">{textoGargalo}</p>
              </div>
            )}
          </div>
        </div>

        {/* Considerações Finais / Outros Textos (se houver e não classificado ou Destaque) */}
        {(textoDestaque || outrosTextos) && (
          <div className="mb-8 p-5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm print:break-inside-avoid">
            <h3 className="text-sm font-bold uppercase text-gray-800 mb-3 border-b border-gray-200 pb-2">Considerações Complementares</h3>
            {textoDestaque && <p className="text-sm text-emerald-900 font-medium mb-2 leading-relaxed">{textoDestaque}</p>}
            {outrosTextos && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{outrosTextos}</p>}
          </div>
        )}

        {/* Assinaturas */}
        <div className="mt-20 pt-8 print:break-inside-avoid">
          <div className="flex justify-center items-center gap-16 text-center">
            <div className="flex-1 max-w-xs">
              <div className="border-t border-gray-400 w-full mb-2"></div>
              <p className="font-bold text-sm text-gray-800">Equipe Pedagógica / Coordenação</p>
              <p className="text-xs text-gray-500">Responsável pela Análise</p>
            </div>
          </div>
          <div className="text-center mt-16 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            Documento gerado pelo Sistema de Inteligência Pedagógica em {dataHoraEmissao}
          </div>
        </div>

      </div>
    );
  }
);
