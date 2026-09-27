import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Search, X, AlertTriangle, GraduationCap, ClipboardList } from 'lucide-react';

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
                const isSubsequente = curso?.modalidade === 'Técnico Subsequente';
                const numEtapas = isSubsequente ? 2 : 4;
                
                let somaMediasGlobais = 0;
                let countDisciplinasAvaliadas = 0;
                let pendenciasCount = 0;
                let hasRiscoFaltas = false;

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

                  let mediaAtual = notasPreenchidas > 0 ? (somaNotas / (notasPreenchidas === numEtapas ? numEtapas : notasPreenchidas)) : null;
                  let mediaFinal = mediaAtual;
                  
                  if (af?.provaFinal !== undefined && af.provaFinal !== null && mediaAtual !== null) {
                    mediaFinal = (mediaAtual + Number(af.provaFinal)) / 2;
                  }

                  if (mediaFinal !== null) {
                    somaMediasGlobais += mediaFinal;
                    countDisciplinasAvaliadas++;
                  }

                  if (faltas > limiteFaltas) {
                    hasRiscoFaltas = true;
                  } else if (faltas >= limiteFaltas * 0.8) {
                    hasRiscoFaltas = true;
                  }

                  let situacao = 'Cursando';
                  const isFinished = notasPreenchidas === numEtapas;

                  if (isFinished) {
                    if (faltas > limiteFaltas) situacao = 'Reprovado por Faltas';
                    else if (af?.statusConselho) situacao = af.statusConselho === 'aprovado' ? 'Aprovado (Conselho)' : 'Reprovado (Conselho)';
                    else if (af?.aprovadoConselho) situacao = 'Aprovado (Conselho)';
                    else if (mediaFinal! >= 6.0) situacao = 'Aprovado';
                    else situacao = 'Reprovado';
                  }

                  if (situacao.includes('Reprovado')) {
                    pendenciasCount++;
                  }

                  return { disc, notasEtapas, faltas, limiteFaltas, mediaFinal, situacao, af };
                });

                const mediaGeral = countDisciplinasAvaliadas > 0 ? (somaMediasGlobais / countDisciplinasAvaliadas).toFixed(1) : '-';

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
                          <div className="mt-2 text-sm text-gray-600 flex items-center gap-4">
                            <span><strong>Turma:</strong> {turma?.nome} ({turma?.codigo})</span>
                            <span><strong>Curso:</strong> {curso?.nome} ({curso?.modalidade})</span>
                            {turma?.anoLetivo && <span><strong>Ano Letivo:</strong> {turma.anoLetivo}</span>}
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="text-center px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-100">
                            <div className="text-xs font-bold text-gray-500 uppercase">Média Geral</div>
                            <div className="text-2xl font-bold text-indigo-600">{mediaGeral}</div>
                          </div>
                          <div className="text-center px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-100">
                            <div className="text-xs font-bold text-gray-500 uppercase">Pendências</div>
                            <div className={`text-2xl font-bold ${pendenciasCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {pendenciasCount}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {hasRiscoFaltas && (
                        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-red-700 bg-red-100 p-3 rounded-lg border border-red-200">
                          <AlertTriangle className="w-5 h-5" />
                          Alerta: Este aluno possui disciplinas com risco de reprovação por faltas (≥ 80% do limite).
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
                              <th key={i} className="px-4 py-4 text-center">{i + 1}º Bi</th>
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
                                {b.mediaFinal !== null ? b.mediaFinal.toFixed(1) : '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`${b.faltas >= b.limiteFaltas ? 'text-red-600 font-bold' : b.faltas >= b.limiteFaltas * 0.8 ? 'text-amber-600 font-bold' : 'text-gray-600'}`}>
                                  {b.faltas} / {b.limiteFaltas}
                                </span>
                              </td>
                              <td className="px-6 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold inline-block
                                  ${b.situacao === 'Cursando' ? 'bg-blue-100 text-blue-800' : 
                                    b.situacao.includes('Aprovado') ? 'bg-emerald-100 text-emerald-800' : 
                                    'bg-red-100 text-red-800'}`}>
                                  {b.situacao}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
