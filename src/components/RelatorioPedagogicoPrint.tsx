import React from 'react';
import logoIFS from '../assets/logo-ifs.png';

export interface RelatorioPedagogicoPrintProps {
  aluno: any;
  turma: any;
  curso: any;
  boletim: any[];
  estagio: any;
  ocorrencias: any[];
  mediaGeral: string | number;
  pendenciasCount: number;
  hasRiscoFaltas: boolean;
  isPeDeMeiaApto: boolean;
  freqGlobal: number;
  conselhoGlobal: string | null;
  numEtapas: number;
  responsavelNome: string;
}

export const RelatorioPedagogicoPrint = React.forwardRef<HTMLDivElement, RelatorioPedagogicoPrintProps>(
  (
    {
      aluno,
      turma,
      curso,
      boletim,
      estagio,
      ocorrencias,
      mediaGeral,
      pendenciasCount,
      hasRiscoFaltas,
      isPeDeMeiaApto,
      freqGlobal,
      conselhoGlobal,
      numEtapas,
      responsavelNome
    },
    ref
  ) => {
    const dataHoraEmissao = new Date().toLocaleString('pt-BR');

    return (
      <div ref={ref} className="print-container bg-white text-black" style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
        <style type="text/css" media="print">
          {`
            @page { 
              size: A4; 
              margin: 0mm; /* Hide browser headers/footers */
            }
            body { 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
              background-color: white !important; 
            }
            .print-container { 
              background-color: white !important; 
              color: black !important; 
              padding: 15mm; 
            }
            .badge-aprovado { background-color: #dcfce7 !important; color: black !important; border: 1px solid #bbf7d0 !important; }
            .badge-reprovado { background-color: #fee2e2 !important; color: black !important; border: 1px solid #fecaca !important; }
            .badge-cursando { background-color: #eff6ff !important; color: black !important; border: 1px solid #dbeafe !important; }
            .badge-alerta { background-color: #fef3c7 !important; color: black !important; border: 1px solid #fde68a !important; }
            
            table { border-collapse: collapse; width: 100%; table-layout: fixed; }
            th, td { border: 1px solid #d1d5db; padding: 2px 4px; text-align: center; font-size: 10px; word-wrap: break-word; }
            th { background-color: #f3f4f6 !important; font-weight: bold; }
            tr { display: table-row !important; page-break-inside: avoid; }
            tr:nth-child(even) { background-color: #f8fafc !important; }
            .text-left { text-align: left; }
          `}
        </style>

        {/* Cabeçalho */}
        <div className="flex flex-col items-center gap-4 pb-4 mb-6 border-b-4 border-black">
          <img src={logoIFS} alt="Logo IFS" className="w-48 object-contain" />
          <div className="text-center w-full">
            <h1 className="text-2xl font-extrabold uppercase text-center" style={{ color: 'black' }}>RELATÓRIO PEDAGÓGICO</h1>
            {curso && <p className="text-sm font-semibold mt-1 text-center" style={{ color: 'black' }}>Curso: {curso.nome}</p>}
          </div>
        </div>

        {/* Informações do Aluno */}
        <div className="mb-6 p-4 border border-gray-300 rounded bg-slate-50">
          <h3 className="text-lg font-bold mb-3 uppercase border-b border-gray-300 pb-1" style={{ color: 'black' }}>Dados do Aluno</h3>
          <div className="grid grid-cols-2 gap-4 text-sm mb-3 text-black">
            <p><strong>Nome:</strong> {aluno.nome}</p>
            <p><strong>Turma:</strong> {turma?.nome}</p>
            <p><strong>Matrícula/ID:</strong> {aluno.id}</p>
            <p><strong>Ano Letivo:</strong> {turma?.anoLetivo}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm pt-3 border-t border-gray-200 text-black">
            <p><strong>Média Geral:</strong> {mediaGeral}</p>
            <p><strong>Pendências:</strong> <span className={pendenciasCount > 0 ? "text-red-700 font-bold" : ""}>{pendenciasCount}</span></p>
            <p><strong>Freq. Global:</strong> {freqGlobal.toFixed(1)}%</p>
          </div>
          {hasRiscoFaltas && (
             <div className="mt-3 p-2 border border-red-500 bg-red-50 text-red-800 text-sm font-bold text-center rounded badge-reprovado">
                ALERTA: Aluno com Risco Global de Faltas (Ultrapassou 25%)
             </div>
          )}
        </div>

        <hr className="my-6 border-slate-300" />

        {/* Boletim */}
        <div className="mb-6">
          <h3 className="text-md font-bold mb-2 uppercase" style={{ color: 'black' }}>Desempenho Acadêmico</h3>
          <table>
            <thead>
              <tr>
                <th className="text-left" style={{ width: '30%' }}>Disciplina</th>
                {[...Array(numEtapas)].map((_, i) => (
                  <th key={i}>Etapa {i + 1}</th>
                ))}
                <th>Final</th>
                <th>Média</th>
                <th>Faltas</th>
                <th style={{ width: '15%' }}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {[...boletim].sort((a, b) => a.disc.nome.localeCompare(b.disc.nome, 'pt-BR')).map((b, i) => (
                <tr key={i} className="break-inside-avoid print:break-inside-avoid">
                  <td className="text-left font-medium text-black">{b.disc.nome}</td>
                  {b.notasEtapas.map((n: number | null, idx: number) => (
                    <td key={idx} className="text-black">{(n !== null && n !== undefined && String(n).trim() !== '') ? Number(n).toFixed(1) : '-'}</td>
                  ))}
                  <td className="text-black">{(b.af?.provaFinal !== undefined && b.af.provaFinal !== null && String(b.af.provaFinal).trim() !== '') ? Number(b.af.provaFinal).toFixed(1) : '-'}</td>
                  <td className="font-bold text-black">
                    {b.mediaFinal !== null ? (
                       b.isAprovadoConselho ? (
                          <div>
                             <span>{b.mediaFinal.toFixed(1)}</span>
                             <br />
                             <span style={{ fontSize: '9px', fontWeight: 'normal' }}>({b.mediaFinalOrig?.toFixed(1)})</span>
                          </div>
                       ) : (
                          <span>{b.mediaFinal.toFixed(1)}</span>
                       )
                    ) : '-'}
                  </td>
                  <td className={b.faltasExcedidas ? "font-bold text-red-700" : "text-black"}>{b.faltas}</td>
                  <td className="whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-black ${
                      b.situacao === 'Cursando' ? 'badge-cursando' : 
                      b.situacao.includes('Aprovado') ? 'badge-aprovado' : 
                      'badge-reprovado'
                    }`}>
                      {b.situacao}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <hr className="my-6 border-slate-300" />

        {/* Resumo Estágio e Conselho */}
        <div className="grid grid-cols-2 gap-4 mb-6 print:break-inside-avoid">
          <div className="p-3 border border-gray-300 rounded text-sm text-black break-inside-avoid print:break-inside-avoid">
            <h4 className="font-bold mb-2 uppercase" style={{ color: 'black' }}>Estágio</h4>
            {estagio ? (
              <div>
                <p><strong>Empresa:</strong> {estagio.dadosEmpresa.nome}</p>
                <p><strong>Status:</strong> {estagio.status}</p>
                <p><strong>Início:</strong> {new Date(estagio.dadosEstagio.inicio + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
            ) : (
              <p>Nenhum estágio registrado.</p>
            )}
          </div>
          <div className="p-3 border border-gray-300 rounded text-sm text-black break-inside-avoid print:break-inside-avoid">
            <h4 className="font-bold mb-2 uppercase" style={{ color: 'black' }}>Conselho de Classe</h4>
            {conselhoGlobal ? (
              <p className="font-bold">{conselhoGlobal}</p>
            ) : (
              <p>Sem decisão de conselho.</p>
            )}
            
            <h4 className="font-bold mt-3 mb-1 uppercase" style={{ color: 'black' }}>Pé de Meia</h4>
            <p className={isPeDeMeiaApto ? "font-bold text-green-700" : "font-bold text-red-700"}>
              {isPeDeMeiaApto ? 'Habilitado' : 'Não Habilitado'}
            </p>
          </div>
        </div>

        {/* Ocorrências */}
        {ocorrencias.length > 0 && (
          <div className="print:break-inside-avoid">
            <hr className="my-6 border-slate-300" />
            <div className="mb-6">
              <h3 className="text-md font-bold mb-2 uppercase" style={{ color: 'black' }}>Histórico de Ocorrências</h3>
              <div className="space-y-2">
                {ocorrencias.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map(oc => (
                  <div key={oc.id} className="p-3 border border-gray-300 rounded text-sm text-black break-inside-avoid print:break-inside-avoid">
                    <div className="flex justify-between font-bold mb-1">
                      <span>{oc.tipo}</span>
                      <span>{new Date(oc.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{oc.descricao}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Assinaturas */}
        <div className="mt-16 pt-8 break-inside-avoid print:break-inside-avoid">
          <div className="flex justify-center items-center gap-16 text-center">
            <div className="flex-1 max-w-xs">
              <div className="border-t-2 border-black w-full mb-2"></div>
              <p className="font-bold text-sm" style={{ color: 'black' }}>{responsavelNome}</p>
              <p className="text-xs" style={{ color: 'black' }}>Responsável pelo Relatório</p>
            </div>
            <div className="flex-1 max-w-xs">
              <div className="border-t-2 border-black w-full mb-2"></div>
              <p className="font-bold text-sm" style={{ color: 'black' }}>Ciente do Responsável / Aluno</p>
              <p className="text-xs" style={{ color: 'black' }}>Assinatura</p>
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
