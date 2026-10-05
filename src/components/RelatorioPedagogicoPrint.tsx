import React from 'react';

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
      <div ref={ref} className="print-container bg-white text-black p-8" style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
        <style type="text/css" media="print">
          {`
            @page { size: A4; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
            .print-container { background-color: white !important; color: black !important; }
            .badge-aprovado { background-color: #d1fae5 !important; color: #065f46 !important; border: 1px solid #059669 !important; }
            .badge-reprovado { background-color: #fee2e2 !important; color: #991b1b !important; border: 1px solid #dc2626 !important; }
            .badge-cursando { background-color: #dbeafe !important; color: #1e40af !important; border: 1px solid #2563eb !important; }
            .badge-alerta { background-color: #fef3c7 !important; color: #92400e !important; border: 1px solid #d97706 !important; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d1d5db; padding: 6px; text-align: center; font-size: 11px; }
            th { background-color: #f3f4f6 !important; font-weight: bold; }
            .text-left { text-align: left; }
          `}
        </style>

        {/* Cabeçalho */}
        <div className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold uppercase tracking-wider" style={{ color: 'black' }}>INSTITUTO FEDERAL DE SERGIPE</h1>
            <h2 className="text-lg font-semibold mt-1 uppercase" style={{ color: 'black' }}>Relatório Pedagógico</h2>
            {curso && <p className="text-sm font-medium mt-1" style={{ color: 'black' }}>Curso: {curso.nome}</p>}
          </div>
        </div>

        {/* Informações do Aluno */}
        <div className="mb-6 p-4 border border-gray-300 rounded bg-gray-50">
          <h3 className="text-lg font-bold mb-2 uppercase" style={{ color: 'black' }}>Dados do Aluno</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p><strong>Nome:</strong> {aluno.nome}</p>
            <p><strong>Matrícula/ID:</strong> {aluno.id}</p>
            <p><strong>Turma:</strong> {turma?.nome}</p>
            <p><strong>Ano Letivo:</strong> {turma?.anoLetivo}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm mt-3 pt-3 border-t border-gray-200">
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

        {/* Boletim */}
        <div className="mb-6">
          <h3 className="text-md font-bold mb-2 uppercase" style={{ color: 'black' }}>Desempenho Acadêmico</h3>
          <table>
            <thead>
              <tr>
                <th className="text-left">Disciplina</th>
                {[...Array(numEtapas)].map((_, i) => (
                  <th key={i}>Etapa {i + 1}</th>
                ))}
                <th>Final</th>
                <th>Média</th>
                <th>Faltas</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {boletim.map((b, i) => (
                <tr key={i}>
                  <td className="text-left font-medium">{b.disc.nome}</td>
                  {b.notasEtapas.map((n: number | null, idx: number) => (
                    <td key={idx}>{n !== null ? n.toFixed(1) : '-'}</td>
                  ))}
                  <td>{b.af?.provaFinal !== undefined && b.af.provaFinal !== null ? Number(b.af.provaFinal).toFixed(1) : '-'}</td>
                  <td className="font-bold">
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
                  <td className={b.faltasExcedidas ? "font-bold text-red-700" : ""}>{b.faltas}</td>
                  <td>
                    <span className={`px-2 py-1 rounded font-bold ${
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

        {/* Resumo Estágio e Conselho */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 border border-gray-300 rounded text-sm">
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
          <div className="p-3 border border-gray-300 rounded text-sm">
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
          <div className="mb-6">
            <h3 className="text-md font-bold mb-2 uppercase" style={{ color: 'black' }}>Histórico de Ocorrências</h3>
            <div className="space-y-2">
              {ocorrencias.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map(oc => (
                <div key={oc.id} className="p-3 border border-gray-300 rounded text-sm">
                  <div className="flex justify-between font-bold mb-1">
                    <span>{oc.tipo}</span>
                    <span>{new Date(oc.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{oc.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assinaturas */}
        <div className="mt-16 pt-8 break-inside-avoid">
          <div className="grid grid-cols-2 gap-8 text-center">
            <div>
              <div className="border-t border-black w-3/4 mx-auto mb-2"></div>
              <p className="font-bold text-sm">{responsavelNome}</p>
              <p className="text-xs">Responsável pelo Relatório</p>
            </div>
            <div>
              <div className="border-t border-black w-3/4 mx-auto mb-2"></div>
              <p className="font-bold text-sm">Ciente do Responsável / Aluno</p>
              <p className="text-xs">Assinatura</p>
            </div>
          </div>
          <div className="text-center mt-8 text-xs text-gray-500">
            Documento gerado em {dataHoraEmissao}
          </div>
        </div>
      </div>
    );
  }
);
