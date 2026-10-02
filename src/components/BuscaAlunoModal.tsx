import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Search, X, AlertTriangle, GraduationCap, ClipboardList, Briefcase, Gavel, Wallet } from 'lucide-react';

interface BuscaAlunoModalProps {
  onClose: () => void;
}

export const BuscaAlunoModal: React.FC<BuscaAlunoModalProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const turmasAll = useLiveQuery(() => db.turmas.toArray()) || [];
  const turmasAtivas = turmasAll.filter(t => !t.arquivado);
  const alunosAll = useLiveQuery(() => db.alunos.toArray()) || [];
  const cursosAll = useLiveQuery(() => db.cursos.toArray()) || [];
  const disciplinasAll = useLiveQuery(() => db.disciplinas.toArray()) || [];
  const notasAll = useLiveQuery(() => db.notas.toArray()) || [];
  const avaliacoesAll = useLiveQuery(() => db.avaliacoes_finais.toArray()) || [];
  const ocorrenciasAll = useLiveQuery(() => db.ocorrencias.toArray()) || [];
  const estagiosAll = useLiveQuery(() => db.estagios.toArray()) || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
  };

  const alunosFiltrados = alunosAll.filter(a => {
    if (!hasSearched) return false;
    const matchName = a.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTurma = selectedTurmaId ? a.turmaId === Number(selectedTurmaId) : true;
    return matchName && matchTurma;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600" />
            Busca de Aluno (Raio-X)
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Form */}
        <div className="p-6 border-b border-gray-100">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Nome do Aluno</label>
              <input 
                type="text" 
                required
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Digite o nome do aluno..."
              />
            </div>
            <div className="w-64">
              <label className="block text-xs font-medium text-gray-700 mb-1">Turma (Opcional)</label>
              <select 
                value={selectedTurmaId}
                onChange={e => setSelectedTurmaId(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Todas as turmas</option>
                {turmasAtivas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome} ({t.codigo})</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 h-[42px]">
                <Search className="w-4 h-4" />
                Pesquisar
              </button>
            </div>
          </form>
        </div>

        {/* Results Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
          {!hasSearched ? (
            <div className="text-center py-12 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Digite o nome do aluno e clique em pesquisar.</p>
            </div>
          ) : alunosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Nenhum aluno encontrado com esses filtros.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {alunosFiltrados.map(aluno => {
                const turma = turmasAll.find(t => t.id === aluno.turmaId);
                const curso = cursosAll.find(c => c.id === turma?.cursoId);
                const disciplinas = disciplinasAll.filter(d => d.turmaId === aluno.turmaId);
                const ocorrenciasDoAluno = ocorrenciasAll.filter(o => o.alunoId === aluno.id);
                const estagio = estagiosAll.find(e => e.alunoId === aluno.id);
                const isSubsequente = curso?.modalidade?.includes('Subsequente');
                const numEtapas = isSubsequente ? 2 : 4;
                
                let somaMediasGlobais = 0;
                let countDisciplinasAvaliadas = 0;
                let pendenciasCount = 0;
                let hasRiscoFaltas = false;
                let totalCargaHoraria = 0;
                let totalFaltasGlobal = 0;

                const boletim = disciplinas.map(disc => {
                  const limiteFaltas = Math.floor(disc.chRelogio * 0.25);
                  const notasDisc = notasAll.filter(n => n.alunoId === aluno.id && n.disciplinaId === disc.id);
                  const af = avaliacoesAll.find(a => a.alunoId === aluno.id && a.disciplinaId === disc.id);
                  
                  let faltas = 0;
                  const notasEtapas: (number | null)[] = Array(numEtapas).fill(null);
                  let notasPreenchidas = 0;
                  let somaNotas = 0;

                  for (let i = 1; i <= numEtapas; i++) {
                    const n = notasDisc.find(x => x.etapa === i);
                    if (n) {
                      faltas += n.faltas || 0;
                      if (n.nota !== undefined && n.nota !== null && String(n.nota) !== '') {
                        notasEtapas[i - 1] = Number(n.nota);
                        somaNotas += Number(n.nota);
                        notasPreenchidas++;
                      }
                    }
                  }

                  totalCargaHoraria += disc.chRelogio;
                  totalFaltasGlobal += faltas;

                  let mediaAtual = notasPreenchidas > 0 ? (somaNotas / (notasPreenchidas === numEtapas ? numEtapas : notasPreenchidas)) : null;
                  let mediaFinal = mediaAtual;
                  
                  if (af?.provaFinal !== undefined && af.provaFinal !== null && mediaAtual !== null) {
                    mediaFinal = (mediaAtual + Number(af.provaFinal)) / 2;
                  }

                  let mediaFinalOrig = mediaFinal;
                  let isAprovadoConselho = false;
                  const isFinishedTemp = notasPreenchidas === numEtapas;
                  if (isFinishedTemp && (af?.statusConselho === 'aprovado' || af?.aprovadoConselho)) {
                    mediaFinal = 5.0;
                    isAprovadoConselho = true;
                  }

                  if (mediaFinal !== null) {
                    somaMediasGlobais += mediaFinal;
                    countDisciplinasAvaliadas++;
                  }

                  // Risco de faltas agora é avaliado globalmente fora do loop

                  let situacao = 'Cursando';
                  const isFinished = notasPreenchidas === numEtapas;

                  if (isFinished) {
                    if (af?.statusConselho) situacao = af.statusConselho === 'aprovado' ? 'Aprovado (Conselho)' : 'Reprovado (Conselho)';
                    else if (af?.aprovadoConselho) situacao = 'Aprovado (Conselho)';
                    else if (mediaFinal! >= 6.0) situacao = 'Aprovado';
                    else situacao = 'Reprovado';
                  }

                  const faltasExcedidas = faltas > limiteFaltas;

                  if (situacao.includes('Reprovado')) {
                    pendenciasCount++;
                  }

                  return { disc, notasEtapas, faltas, limiteFaltas, mediaFinal, mediaFinalOrig, isAprovadoConselho, situacao, af, faltasExcedidas };
                });

                const mediaGeral = countDisciplinasAvaliadas > 0 ? (somaMediasGlobais / countDisciplinasAvaliadas).toFixed(1) : '-';
                
                const freqGlobal = totalCargaHoraria > 0 ? ((totalCargaHoraria - totalFaltasGlobal) / totalCargaHoraria) * 100 : 100;
                const isPeDeMeiaApto = freqGlobal >= 80;
                hasRiscoFaltas = totalCargaHoraria > 0 && totalFaltasGlobal > (totalCargaHoraria * 0.25);
                
                // Determina situação no conselho
                let conselhoGlobal = null;
                const disciplinasEmConselho = boletim.filter(b => b.af?.statusConselho || b.af?.aprovadoConselho);
                if (disciplinasEmConselho.length > 0) {
                  const hasReprovacao = disciplinasEmConselho.some(b => b.af?.statusConselho === 'reprovado' || (b.af?.statusConselho === undefined && !b.af?.aprovadoConselho && b.situacao.includes('Reprovado (Conselho)')));
                  conselhoGlobal = hasReprovacao ? 'Reprovado pelo Conselho' : 'Aprovado pelo Conselho';
                }

                return (
                  <div key={aluno.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    
                    {/* Card Header */}
                    <div className="bg-indigo-50/50 p-6 border-b border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <GraduationCap className="w-6 h-6 text-indigo-600" />
                            {aluno.nome}
                          </h3>
                          <div className="mt-2 text-sm text-gray-600 flex flex-wrap md:flex-nowrap items-center gap-3 sm:gap-4">
                            <span className="whitespace-nowrap"><strong>Turma:</strong> {turma?.nome}</span>
                            <span className="whitespace-nowrap"><strong>Curso:</strong> {curso?.nome}</span>
                            {turma?.anoLetivo && <span className="whitespace-nowrap"><strong>Ano Letivo:</strong> {turma.anoLetivo}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="text-center px-3 py-1.5 bg-white rounded-lg shadow-sm border border-gray-100">
                            <div className="text-[10px] font-bold text-gray-500 uppercase">Média Geral</div>
                            <div className="text-xl font-bold text-indigo-600">{mediaGeral}</div>
                          </div>
                          <div className="text-center px-3 py-1.5 bg-white rounded-lg shadow-sm border border-gray-100">
                            <div className="text-[10px] font-bold text-gray-500 uppercase">Pendências</div>
                            <div className={`text-xl font-bold ${pendenciasCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {pendenciasCount}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {hasRiscoFaltas && (
                        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-red-700 bg-red-100 p-3 rounded-lg border border-red-200">
                          <AlertTriangle className="w-5 h-5" />
                          Alerta: Este aluno ultrapassou o limite global de faltas (25% da carga horária total).
                        </div>
                      )}
                    </div>

                    {/* Boletim Table */}
                    <div className="p-0 overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-xs">
                          <tr>
                            <th className="px-6 py-4">Disciplina</th>
                            {[...Array(numEtapas)].map((_, i) => (
                              <th key={i} className="px-4 py-4 text-center">Etapa {i + 1}</th>
                            ))}
                            <th className="px-4 py-4 text-center">Final</th>
                            <th className="px-4 py-4 text-center">Média</th>
                            <th className="px-4 py-4 text-center">Faltas</th>
                            <th className="px-6 py-4">Situação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {boletim.map((b, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-6 py-3 font-medium text-gray-800">{b.disc.nome}</td>
                              {b.notasEtapas.map((n, idx) => (
                                <td key={idx} className="px-4 py-3 text-center text-gray-600">
                                  {n !== null ? n.toFixed(1) : '-'}
                                </td>
                              ))}
                              <td className="px-4 py-3 text-center text-gray-600">
                                {b.af?.provaFinal !== undefined && b.af.provaFinal !== null ? Number(b.af.provaFinal).toFixed(1) : '-'}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-gray-800">
                                {b.mediaFinal !== null ? (
                                   b.isAprovadoConselho ? (
                                      <div className="flex flex-col items-center justify-center">
                                         <span className="text-blue-600 font-semibold">{b.mediaFinal.toFixed(1)}</span>
                                         <span className="text-xs text-gray-500 font-normal">({b.mediaFinalOrig?.toFixed(1)})</span>
                                      </div>
                                   ) : (
                                      <span>{b.mediaFinal.toFixed(1)}</span>
                                   )
                                ) : '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`${b.faltas >= b.limiteFaltas ? 'text-red-600 font-bold' : b.faltas >= b.limiteFaltas * 0.8 ? 'text-amber-600 font-bold' : 'text-gray-600'}`}>
                                  {b.faltas}
                                </span>
                              </td>
                              <td className="px-6 py-3">
                                <div className="flex flex-col items-center justify-center text-center">
                                  <span className={`px-2 py-1 rounded text-xs font-bold inline-block
                                    ${b.situacao === 'Cursando' ? 'bg-blue-100 text-blue-800' : 
                                      b.situacao.includes('Aprovado') ? 'bg-emerald-100 text-emerald-800' : 
                                      'bg-red-100 text-red-800'}`}>
                                    {b.situacao}
                                  </span>
                                  {b.faltasExcedidas && (
                                    <span className="text-xs text-red-600 mt-1 font-bold">Faltas acima do limite</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Estágio, Conselho e Pé de Meia */}
                    <div className="bg-white border-t border-gray-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Estágio */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="text-md font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-indigo-600" />
                          Estágio
                        </h4>
                        {estagio ? (
                          <div className="text-sm space-y-2">
                            <p><strong>Empresa:</strong> {estagio.dadosEmpresa.nome}</p>
                            <p><strong>Status:</strong> <span className={`font-semibold ${estagio.status === 'Finalizado' ? 'text-emerald-600' : estagio.status === 'Não Finalizado' ? 'text-orange-600' : 'text-blue-600'}`}>{estagio.status}</span></p>
                            <p><strong>Início:</strong> {new Date(estagio.dadosEstagio.inicio + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                            {estagio.dadosFinalizacao?.termino && (
                              <p><strong>Término:</strong> {new Date(estagio.dadosFinalizacao.termino + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Nenhum estágio cadastrado.</p>
                        )}
                      </div>

                      {/* Conselho de Classe */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="text-md font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <Gavel className="w-5 h-5 text-indigo-600" />
                          Conselho de Classe
                        </h4>
                        {conselhoGlobal ? (
                          <div className={`text-sm font-semibold p-3 rounded-lg border ${conselhoGlobal.includes('Aprovado') ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                            {conselhoGlobal}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">O aluno não passou por decisão de conselho.</p>
                        )}
                      </div>

                      {/* Programa Pé de Meia */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="text-md font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <Wallet className="w-5 h-5 text-emerald-600" />
                          Programa Pé de Meia
                        </h4>
                        <div className={`text-sm font-semibold p-3 rounded-lg border ${isPeDeMeiaApto ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                          {isPeDeMeiaApto ? '✅ Habilitado' : '❌ Não Habilitado'} ({freqGlobal.toFixed(1)}%)
                        </div>
                      </div>
                    </div>

                    {/* Ocorrências Section */}
                    <div className="bg-gray-50 border-t border-gray-200 p-6">
                      <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-gray-600" />
                        Histórico de Ocorrências
                      </h4>
                      {ocorrenciasDoAluno.length === 0 ? (
                        <p className="text-gray-500 text-sm">Nenhuma ocorrência registrada para este aluno.</p>
                      ) : (
                        <div className="space-y-4">
                          {ocorrenciasDoAluno.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map(oc => {
                            const isAlerta = oc.tipo.toLowerCase().includes('suspensão') || oc.tipo.toLowerCase().includes('indisciplina') || oc.tipo.toLowerCase().includes('advertência');
                            const badgeColor = isAlerta ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
                            
                            return (
                              <div key={oc.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2 py-1 rounded font-bold ${badgeColor}`}>
                                      {oc.tipo}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium">
                                      {new Date(oc.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                  {oc.anexoDados && oc.anexoNome && (
                                    <button
                                      onClick={() => {
                                        if (typeof oc.anexoDados === 'string') {
                                          const newWindow = window.open();
                                          if (newWindow) {
                                            if (oc.anexoDados.startsWith('data:application/pdf')) {
                                                newWindow.document.write(`<iframe src="${oc.anexoDados}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                            } else {
                                                newWindow.document.write(`<img src="${oc.anexoDados}" style="max-width: 100%; max-height: 100%;" />`);
                                            }
                                          } else {
                                            const a = document.createElement('a');
                                            a.href = oc.anexoDados;
                                            a.download = oc.anexoNome || 'anexo';
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                          }
                                        }
                                      }}
                                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded transition-colors"
                                    >
                                      📎 Ver Anexo
                                    </button>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{oc.descricao}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
