import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { BarChart3, TrendingDown, Users, GraduationCap, Percent, BookOpen, History, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';

export const AnalisesView: React.FC = () => {
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('todos');

  const analisesData = useLiveQuery(async () => {
    const turmasAll = await db.turmas.toArray();
    const periodosSet = new Set<string>();
    turmasAll.forEach(t => {
      const match = t.codigo.match(/(20\d{2}\.[12]|20\d{2})/) || t.nome.match(/(20\d{2}\.[12]|20\d{2})/);
      if (match) periodosSet.add(match[1]);
    });
    const periodosDisponiveis = Array.from(periodosSet).sort((a,b) => b.localeCompare(a));

    const turmasAtivas = turmasAll.filter(t => !t.arquivado);
    const turmasFiltradas = periodoFiltro === 'todos' 
      ? turmasAtivas 
      : turmasAtivas.filter(t => {
          const match = t.codigo.match(/(20\d{2}\.[12]|20\d{2})/) || t.nome.match(/(20\d{2}\.[12]|20\d{2})/);
          return match && match[1] === periodoFiltro;
        });

    const turmasIdsTodas = turmasAtivas.map(t => t.id!);
    const turmasIdsFiltradas = turmasFiltradas.map(t => t.id!);

    const cursosAll = await db.cursos.toArray();
    const disciplinasAll = await db.disciplinas.toArray();
    const disciplinasAtivas = disciplinasAll.filter(d => !d.arquivado && turmasIdsTodas.includes(d.turmaId));

    const alunosAtivos = await db.alunos.where('turmaId').anyOf(turmasIdsTodas).toArray();
    const alunosAtivosFiltrados = alunosAtivos.filter(a => turmasIdsFiltradas.includes(a.turmaId));

    const notasAll = await db.notas.toArray();
    const avaliacoesAll = await db.avaliacoes_finais.toArray();

    let somaGeralNotas = 0;
    let countGeralNotas = 0;
    let totalFechados = 0;
    let totalAprovados = 0;

    const disciplinasStats: Record<string, { soma: number, count: number, reprovados: number, totalFechados: number }> = {};
    const modalityStats: Record<string, { soma: number, count: number, reprovados: number, totalFechados: number, alunos: Set<number> }> = {
      'Técnico Integrado': { soma: 0, count: 0, reprovados: 0, totalFechados: 0, alunos: new Set() },
      'Técnico Subsequente': { soma: 0, count: 0, reprovados: 0, totalFechados: 0, alunos: new Set() }
    };
    const historicoData: Record<string, { soma: number, count: number, reprovados: number, totalFechados: number }> = {};

    for (const disc of disciplinasAtivas) {
      const turma = turmasAtivas.find(t => t.id === disc.turmaId);
      const isFiltered = turma ? turmasIdsFiltradas.includes(turma.id!) : false;
      
      const anoLetivoMatch = turma ? (turma.codigo.match(/(20\d{2})/) || turma.nome.match(/(20\d{2})/)) : null;
      const anoLetivo = anoLetivoMatch ? anoLetivoMatch[1] : 'Outros';

      if (!historicoData[anoLetivo]) {
        historicoData[anoLetivo] = { soma: 0, count: 0, reprovados: 0, totalFechados: 0 };
      }

      if (isFiltered && !disciplinasStats[disc.nome]) {
        disciplinasStats[disc.nome] = { soma: 0, count: 0, reprovados: 0, totalFechados: 0 };
      }

      const curso = turma ? cursosAll.find(c => c.id === turma.cursoId) : null;
      const isIntegrado = curso?.modalidade?.includes('Integrado');
      const modalidade = isIntegrado ? 'Técnico Integrado' : (curso.modalidade?.includes('Subsequente') ? 'Técnico Subsequente' : curso.modalidade);
      const numEtapas = isIntegrado ? 4 : 2;
      const limiteFaltas = Math.floor(disc.chRelogio * 0.25);

      const discNotas = notasAll.filter(n => n.disciplinaId === disc.id);
      const discAlunos = alunosAtivos.filter(a => a.turmaId === disc.turmaId);

      for (const aluno of discAlunos) {
        if (isFiltered) modalityStats[modalidade].alunos.add(aluno.id!);

        const alunoNotas = discNotas.filter(n => n.alunoId === aluno.id);
        const avaliacao = avaliacoesAll.find(a => a.alunoId === aluno.id && a.disciplinaId === disc.id);

        let notasPreenchidas: number[] = [];
        let faltasTot = 0;
        
        for (let i = 1; i <= numEtapas; i++) {
          const n = alunoNotas.find(x => x.etapa === i);
          if (n && n.nota !== undefined && n.nota !== null && String(n.nota) !== '') {
            notasPreenchidas.push(Number(n.nota));
          }
          faltasTot += n?.faltas || 0;
        }

        if (notasPreenchidas.length > 0) {
          const somaNotas = notasPreenchidas.reduce((a, b) => a + b, 0);
          const todasNotasDigitadas = notasPreenchidas.length === numEtapas;
          const mediaParcial = somaNotas / (todasNotasDigitadas ? numEtapas : notasPreenchidas.length);
          
          let mediaFinal = mediaParcial;
          if (avaliacao?.provaFinal !== undefined && avaliacao?.provaFinal !== null && String(avaliacao.provaFinal) !== '') {
            mediaFinal = (mediaParcial + Number(avaliacao.provaFinal)) / 2;
          }

          // Accumulate for historico
          historicoData[anoLetivo].soma += mediaFinal;
          historicoData[anoLetivo].count++;

          if (isFiltered) {
            somaGeralNotas += mediaFinal;
            countGeralNotas++;
            disciplinasStats[disc.nome].soma += mediaFinal;
            disciplinasStats[disc.nome].count++;
            modalityStats[modalidade].soma += mediaFinal;
            modalityStats[modalidade].count++;
          }

          if (todasNotasDigitadas) {
            let aprovado = false;
            let aprovadoConselho = false;
            if (avaliacao?.statusConselho === 'aprovado' || avaliacao?.aprovadoConselho) {
              aprovadoConselho = true;
            }

            const estourouFaltas = faltasTot > limiteFaltas;
            
            if (aprovadoConselho) {
              aprovado = true;
            } else if (!estourouFaltas && mediaFinal >= 6.0) {
              aprovado = true;
            }

            historicoData[anoLetivo].totalFechados++;
            if (!aprovado) {
              historicoData[anoLetivo].reprovados++;
            }

            if (isFiltered) {
              totalFechados++;
              disciplinasStats[disc.nome].totalFechados++;
              modalityStats[modalidade].totalFechados++;

              if (aprovado) {
                totalAprovados++;
              } else {
                disciplinasStats[disc.nome].reprovados++;
                modalityStats[modalidade].reprovados++;
              }
            }
          }
        }
      }
    }

    const mediaGeral = countGeralNotas > 0 ? somaGeralNotas / countGeralNotas : 0;
    const taxaAprovacao = totalFechados > 0 ? (totalAprovados / totalFechados) * 100 : 0;

    const gargalos = Object.keys(disciplinasStats).map(nome => {
      const stat = disciplinasStats[nome];
      const media = stat.count > 0 ? stat.soma / stat.count : 0;
      const taxaReprovacao = stat.totalFechados > 0 ? (stat.reprovados / stat.totalFechados) * 100 : 0;
      return { nome, media, taxaReprovacao, totalFechados: stat.totalFechados };
    }).filter(g => g.totalFechados > 0)
      .sort((a, b) => a.media - b.media)
      .slice(0, 5);

    const evolucaoHistorica = Object.keys(historicoData).filter(ano => ano !== 'Outros').sort().map(ano => {
      const stat = historicoData[ano];
      const media = stat.count > 0 ? stat.soma / stat.count : 0;
      const aprovados = stat.totalFechados - stat.reprovados;
      const taxaAprovacao = stat.totalFechados > 0 ? (aprovados / stat.totalFechados) * 100 : 0;
      return { ano, media, taxaAprovacao };
    });

    return {
      periodosDisponiveis,
      totalAlunos: alunosAtivosFiltrados.length,
      mediaGeral,
      taxaAprovacao,
      gargalos,
      modalityStats,
      evolucaoHistorica
    };
  }, [periodoFiltro]);

  if (!analisesData) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center text-gray-500">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p>Analisando dados globais...</p>
        </div>
      </div>
    );
  }

  const renderModalityCard = (nome: string, stat: { soma: number, count: number, reprovados: number, totalFechados: number, alunos: Set<number> }) => {
    const media = stat.count > 0 ? stat.soma / stat.count : 0;
    const aprovados = stat.totalFechados - stat.reprovados;
    const taxaAprovacao = stat.totalFechados > 0 ? (aprovados / stat.totalFechados) * 100 : 0;

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1">
        <h4 className="text-lg font-bold text-gray-800 mb-4">{nome}</h4>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Total de Alunos</span>
            <span className="text-base font-bold text-gray-800">{stat.alunos.size}</span>
          </div>
          
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Média Geral</span>
            <span className={`text-base font-bold ${media < 6 ? 'text-red-600' : 'text-emerald-600'}`}>
              {media.toFixed(1)}
            </span>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm font-medium text-gray-600 mb-1">
              <span>Taxa de Aprovação</span>
              <span>{taxaAprovacao.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${taxaAprovacao >= 60 ? 'bg-emerald-500' : 'bg-red-500'}`}
                style={{ width: `${taxaAprovacao}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <main className="max-w-6xl mx-auto p-6 space-y-8">
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600 rounded-xl shadow-sm">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Análises</h2>
              <p className="text-gray-500 text-sm">Dashboard Institucional de Desempenho e Gargalos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Período Letivo:</span>
            <select 
              value={periodoFiltro}
              onChange={e => setPeriodoFiltro(e.target.value)}
              className="text-sm border-none bg-transparent font-semibold text-indigo-700 focus:ring-0 cursor-pointer outline-none"
            >
              <option value="todos">Histórico Completo</option>
              {analisesData.periodosDisponiveis.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Seção 1: KPIs Globais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-blue-50 p-4 rounded-xl text-blue-600">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total de Alunos</p>
              <h3 className="text-3xl font-bold text-gray-800">{analisesData.totalAlunos}</h3>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-purple-50 p-4 rounded-xl text-purple-600">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Média Institucional</p>
              <h3 className="text-3xl font-bold text-gray-800">{analisesData.mediaGeral.toFixed(2)}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-emerald-50 p-4 rounded-xl text-emerald-600">
              <Percent className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Taxa de Aprovação</p>
              <h3 className="text-3xl font-bold text-gray-800">{analisesData.taxaAprovacao.toFixed(1)}%</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Seção 2: Gargalos de Aprendizagem */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-bold text-gray-800">Top 5 Gargalos de Aprendizagem</h3>
            </div>
            <div className="p-6 flex-1">
              {analisesData.gargalos.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                  Dados insuficientes para análise de gargalos.
                </div>
              ) : (
                <ul className="space-y-6">
                  {analisesData.gargalos.map((g, idx) => (
                    <li key={idx}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-800">{g.nome}</span>
                        <span className="text-sm font-bold text-gray-600">Média: <span className="text-red-500">{g.media.toFixed(1)}</span></span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Taxa de Reprovação</span>
                        <span>{g.taxaReprovacao.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ width: `${g.taxaReprovacao}%` }}
                        ></div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Seção 3: Comparativo Multiturmas */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <h3 className="text-lg font-bold text-gray-800">Comparativo por Modalidade</h3>
            </div>
            <div className="p-6 flex-1 flex flex-col sm:flex-row gap-6">
              {renderModalityCard('Curso Integrado', analisesData.modalityStats['Técnico Integrado'])}
              {renderModalityCard('Curso Subsequente', analisesData.modalityStats['Técnico Subsequente'])}
            </div>
          </div>
        </div>

        {/* Seção 4: Evolução Histórica (Linha do Tempo) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <History className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-gray-800">Evolução Histórica (Anos Letivos)</h3>
          </div>
          <div className="p-6">
            {analisesData.evolucaoHistorica.length === 0 ? (
              <div className="flex items-center justify-center text-gray-500 text-sm h-24">
                Dados insuficientes para análise histórica.
              </div>
            ) : (
              <div className="space-y-6">
                {analisesData.evolucaoHistorica.map((item, idx) => {
                  const itemAnterior = idx > 0 ? analisesData.evolucaoHistorica[idx - 1] : null;
                  const diferencaMedia = itemAnterior ? item.media - itemAnterior.media : 0;
                  const diferencaAprovacao = itemAnterior ? item.taxaAprovacao - itemAnterior.taxaAprovacao : 0;

                  return (
                    <div key={item.ano} className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex flex-col md:flex-row md:items-center gap-6">
                      <div className="w-24 shrink-0">
                        <span className="text-2xl font-black text-gray-800">{item.ano}</span>
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-semibold text-gray-600">Média Geral</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-800">{item.media.toFixed(2)}</span>
                              {itemAnterior && (
                                <span className={`flex items-center text-xs font-medium ${diferencaMedia > 0 ? 'text-emerald-600' : diferencaMedia < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                  {diferencaMedia > 0 ? <ArrowUpRight className="w-3 h-3" /> : diferencaMedia < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                                  {diferencaMedia !== 0 && Math.abs(diferencaMedia).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${item.media >= 6 ? 'bg-indigo-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min((item.media / 10) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-semibold text-gray-600">Taxa de Aprovação</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-800">{item.taxaAprovacao.toFixed(1)}%</span>
                              {itemAnterior && (
                                <span className={`flex items-center text-xs font-medium ${diferencaAprovacao > 0 ? 'text-emerald-600' : diferencaAprovacao < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                  {diferencaAprovacao > 0 ? <ArrowUpRight className="w-3 h-3" /> : diferencaAprovacao < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                                  {diferencaAprovacao !== 0 && `${Math.abs(diferencaAprovacao).toFixed(1)}%`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${item.taxaAprovacao >= 60 ? 'bg-emerald-500' : 'bg-red-500'}`}
                              style={{ width: `${item.taxaAprovacao}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};
