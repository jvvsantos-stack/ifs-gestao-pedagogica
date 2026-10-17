import { forwardRef } from 'react';
import logoIFS from '../assets/logo-ifs.png';
import type { Disciplina } from '../db/database';

interface AlunoRisco {
  aluno: { id?: number; nome: string; matricula?: string; isRepetente?: boolean };
  disciplinasRisco: {
    disc: Disciplina;
    faltasTot: number;
    limite: number;
    percent: number;
    isRiscoFalta?: boolean;
    isRiscoMedia?: boolean;
    media?: number;
  }[];
  nivelRisco: string;
  isPeDeMeiaApto: boolean;
  freqGlobal: number;
}

interface RelatorioRiscoPrintProps {
  filtros: {
    curso: string;
    modalidade: string;
    periodo: string;
    turma: string;
  };
  alunosRisco: AlunoRisco[];
}

export const RelatorioRiscoPrint = forwardRef<HTMLDivElement, RelatorioRiscoPrintProps>(
  ({ filtros, alunosRisco }, ref) => {
    const dataHoraEmissao = new Date().toLocaleString('pt-BR');

    const alunosOrdenados = [...alunosRisco].sort((a, b) =>
      a.aluno.nome.localeCompare(b.aluno.nome, 'pt-BR')
    );

    return (
      <div ref={ref} className="bg-white text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* CSS para Impressão */}
        <style type="text/css" media="print">
          {`
            @page {
              size: A4 portrait;
              margin-top: 1.5cm;
              margin-bottom: 1.5cm;
              margin-left: 1cm;
              margin-right: 1cm;
            }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; }
            .break-after-page { page-break-after: always; break-after: page; }
          `}
        </style>

        {alunosOrdenados.length === 0 ? (
          <div className="p-12 print:p-0 flex flex-col justify-between box-border">
            <div>
              {/* Cabeçalho */}
              <div className="flex flex-col items-center border-b-4 border-indigo-600 pb-4 mb-6 print:break-inside-avoid">
                <img src={logoIFS} alt="Logo IFS" className="w-56 mb-4" />
                <h1 className="text-2xl font-extrabold uppercase text-center text-gray-900 tracking-tight">
                  Relatório de Alerta de Risco Acadêmico e Evasão
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

              <div className="text-center text-gray-500 py-16 font-medium">
                Nenhum aluno em situação de risco nesta turma.
              </div>
            </div>

            {/* Assinaturas */}
            <div className="mt-16 pt-8 print:break-inside-avoid">
              <div className="flex justify-center items-center text-center">
                <div className="max-w-xs w-full">
                  <div className="border-t border-gray-400 w-full mb-2"></div>
                  <p className="font-bold text-sm text-gray-800">Equipe Pedagógica / Coordenação</p>
                </div>
              </div>
              <div className="text-center mt-12 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                Documento gerado pelo Sistema de Inteligência Pedagógica em {dataHoraEmissao}
              </div>
              <div className="text-center mt-6 pt-3 border-t border-gray-200 text-[9px] italic text-gray-400">
                Propriedade Intelectual: Sistema concebido e desenvolvido pelo Prof. MsC. José Valter Alves Santos e pelo Técnico em Assuntos Educacionais Iracildes Silva Oliveira. Todos os direitos reservados. © 2026.
              </div>
            </div>
          </div>
        ) : (
          alunosOrdenados.map((item, index) => {
            const isLast = index === alunosOrdenados.length - 1;
            return (
              <div
                key={item.aluno.id || index}
                className={`p-12 print:p-0 flex flex-col justify-between box-border ${
                  !isLast ? 'break-after-page print:break-after-page' : ''
                }`}
                style={{
                  pageBreakAfter: isLast ? 'auto' : 'always',
                  breakAfter: isLast ? 'auto' : 'page',
                }}
              >
                <div>
                  {/* Cabeçalho */}
                  <div className="flex flex-col items-center border-b-4 border-indigo-600 pb-4 mb-6 print:break-inside-avoid">
                    <img src={logoIFS} alt="Logo IFS" className="w-56 mb-4" />
                    <h1 className="text-2xl font-extrabold uppercase text-center text-gray-900 tracking-tight">
                      Relatório de Alerta de Risco Acadêmico e Evasão
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

                  {/* Listagem do Aluno */}
                  <table className="w-full text-sm border-collapse border border-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 w-1/3">
                          Aluno
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">
                          <div className="flex items-center gap-3 px-3">
                            <span className="flex-1">Disciplinas em Situação de Risco</span>
                            <span className="w-28 text-center shrink-0 text-xs uppercase font-bold text-gray-600">Faltas</span>
                            <span className="w-28 text-center shrink-0 text-xs uppercase font-bold text-gray-600">Média</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr className="print:break-inside-avoid">
                        <td className="px-4 py-3 align-top border-r border-gray-100">
                          <div className="font-bold text-gray-800 mb-2">
                            {item.aluno.nome}
                            {item.aluno.isRepetente && <span className="text-red-600 font-bold ml-1 print:text-red-600">(REPT)</span>}
                          </div>
                          
                          {/* Badge Pé de Meia */}
                          <div className="inline-block">
                            {item.freqGlobal < 80 ? (
                              <span className="bg-red-100 text-red-800 text-[10px] uppercase font-bold px-2 py-1 rounded border border-red-200">
                                Pé de Meia: Perdido
                              </span>
                            ) : item.freqGlobal <= 85 ? (
                              <span className="bg-yellow-100 text-yellow-800 text-[10px] uppercase font-bold px-2 py-1 rounded border border-yellow-200">
                                Pé de Meia: Risco
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold px-2 py-1 rounded border border-emerald-200">
                                Pé de Meia: Apto
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-xs font-semibold text-gray-500">
                            Nível de Risco: <span className={item.nivelRisco === 'Muito Alto' ? 'text-red-600' : 'text-orange-600'}>{item.nivelRisco}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col gap-2">
                            {[...item.disciplinasRisco]
                              .sort((a, b) => a.disc.nome.localeCompare(b.disc.nome, 'pt-BR'))
                              .map(d => (
                                <div key={d.disc.id} className="flex items-center gap-3 text-sm bg-gray-50 border border-gray-200 rounded px-3 py-2">
                                  <span className="flex-1 text-gray-800 font-medium truncate" title={d.disc.nome}>{d.disc.nome}</span>
                                  <div className="w-28 shrink-0 flex justify-center items-center">
                                    {d.faltasTot && d.faltasTot > 0 ? (
                                      <span className={`px-2 py-0.5 rounded font-bold text-xs text-center w-full max-w-[100px] truncate ${
                                        d.isRiscoFalta
                                          ? (d.percent && d.percent >= 1.0 ? 'bg-red-200 text-red-800 print:text-red-800' : 'bg-red-100 text-red-700 print:text-red-700')
                                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                                      }`}>
                                        {d.faltasTot} {d.faltasTot === 1 ? 'falta' : 'faltas'}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 font-bold text-sm">-</span>
                                    )}
                                  </div>
                                  <div className="w-28 shrink-0 flex justify-center items-center">
                                    {d.media !== undefined && d.media !== null && !isNaN(d.media) ? (
                                      <span className={`px-2 py-0.5 rounded font-bold text-xs text-center w-full max-w-[100px] truncate ${
                                        d.isRiscoMedia
                                          ? (d.media < 4.0 ? 'bg-red-200 text-red-800 print:text-red-800' : 'bg-orange-100 text-orange-700 print:text-orange-700')
                                          : 'bg-emerald-100 text-emerald-800'
                                      }`}>
                                        Média: {d.media.toFixed(1)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 font-bold text-sm">-</span>
                                    )}
                                  </div>
                                </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Assinaturas */}
                <div className="mt-16 pt-8 print:break-inside-avoid">
                  <div className="flex justify-center items-center gap-16 text-center">
                    <div className="flex-1 max-w-xs">
                      <div className="border-t border-gray-400 w-full mb-2"></div>
                      <p className="font-bold text-sm text-gray-800">Equipe Pedagógica / Coordenação</p>
                    </div>
                    <div className="flex-1 max-w-xs">
                      <div className="border-t border-gray-400 w-full mb-2"></div>
                      <p className="font-bold text-sm text-gray-800">Ciente do Responsável / Aluno</p>
                    </div>
                  </div>
                  <div className="text-center mt-12 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                    Documento gerado pelo Sistema de Inteligência Pedagógica em {dataHoraEmissao}
                  </div>
                  <div className="text-center mt-6 pt-3 border-t border-gray-200 text-[9px] italic text-gray-400">
                    Propriedade Intelectual: Sistema concebido e desenvolvido pelo Prof. MsC. José Valter Alves Santos e pelo Técnico em Assuntos Educacionais Iracildes Silva Oliveira. Todos os direitos reservados. © 2026.
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }
);

export default RelatorioRiscoPrint;
