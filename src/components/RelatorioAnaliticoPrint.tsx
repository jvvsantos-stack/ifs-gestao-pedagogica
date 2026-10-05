import { forwardRef } from 'react';
import logoIFS from '../assets/logo-ifs.png';

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
}

export const RelatorioAnaliticoPrint = forwardRef<HTMLDivElement, RelatorioAnaliticoPrintProps>(
  ({ filtros, kpis, parecerTexto }, ref) => {
    const dataHoraEmissao = new Date().toLocaleString('pt-BR');

    return (
      <div ref={ref} className="p-8 bg-white" style={{ color: 'black', fontFamily: 'Arial, sans-serif' }}>
        {/* CSS para Impressão */}
        <style type="text/css" media="print">
          {`
            @page { size: A4; margin: 20mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; }
          `}
        </style>

        {/* Cabeçalho */}
        <div className="flex flex-col items-center border-b-2 border-black pb-4 mb-6">
          <img src={logoIFS} alt="Logo IFS" className="w-48 mb-4" />
          <h1 className="text-2xl font-extrabold uppercase text-center" style={{ color: 'black' }}>
            RELATÓRIO ANALÍTICO DE DESEMPENHO
          </h1>
        </div>

        {/* Filtros Ativos */}
        <div className="mb-6 p-4 border border-gray-300 rounded bg-slate-50">
          <h3 className="text-lg font-bold mb-3 uppercase border-b border-gray-300 pb-1" style={{ color: 'black' }}>Recorte de Dados</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-black">
            <p><strong>Curso:</strong> {filtros.curso}</p>
            <p><strong>Modalidade:</strong> {filtros.modalidade}</p>
            <p><strong>Período:</strong> {filtros.periodo}</p>
            <p><strong>Turma:</strong> {filtros.turma}</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-6 p-4 border border-gray-300 rounded bg-slate-50 break-inside-avoid print:break-inside-avoid">
          <h3 className="text-lg font-bold mb-3 uppercase border-b border-gray-300 pb-1" style={{ color: 'black' }}>Indicadores Principais</h3>
          <div className="grid grid-cols-4 gap-2 text-sm text-center text-black">
            <div>
              <p className="text-xs uppercase font-bold text-gray-500">Total de Alunos</p>
              <p className="text-xl font-black">{kpis.totalAlunos}</p>
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-gray-500">Média Institucional</p>
              <p className="text-xl font-black">{kpis.mediaGeral.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-gray-500">Taxa de Aprovação</p>
              <p className="text-xl font-black">{kpis.taxaAprovacao.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-gray-500">Taxa de Evasão</p>
              <p className="text-xl font-black">{kpis.taxaEvasao.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Parecer Pedagógico */}
        <div className="mb-6 break-inside-avoid print:break-inside-avoid">
          <h3 className="text-lg font-bold mb-3 uppercase border-b-2 border-black pb-1" style={{ color: 'black' }}>Parecer Pedagógico Automatizado</h3>
          <div className="text-sm text-justify whitespace-pre-wrap leading-relaxed" style={{ color: 'black' }}>
            {parecerTexto}
          </div>
        </div>

        {/* Assinaturas */}
        <div className="mt-16 pt-8 break-inside-avoid print:break-inside-avoid">
          <div className="flex justify-center items-center gap-16 text-center">
            <div className="flex-1 max-w-xs">
              <div className="border-t-2 border-black w-full mb-2"></div>
              <p className="font-bold text-sm" style={{ color: 'black' }}>Equipe Pedagógica / Coordenação</p>
              <p className="text-xs" style={{ color: 'black' }}>Responsável pela Análise</p>
            </div>
          </div>
          <div className="text-center mt-12 text-xs text-gray-500">
            Documento gerado em {dataHoraEmissao}
          </div>
        </div>

      </div>
    );
  }
);
