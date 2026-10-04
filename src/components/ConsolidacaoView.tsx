import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Turma, Disciplina } from '../db/database';
import { ArrowLeft, Users, Scale, Activity, BarChart2, AlertTriangle, Award } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export const ConsolidacaoView: React.FC = () => {
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [selectedCursoId, setSelectedCursoId] = useState<string>('');
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('');

  const turmasAll = useLiveQuery(async () => {
    const all = await db.turmas.toArray();
    return all.filter(t => !t.arquivado);
  }) || [];

  const cursos = useLiveQuery(() => db.cursos.toArray()) || [];
  const todosAlunos = useLiveQuery(() => db.alunos.toArray()) || [];
  const todasDisciplinas = useLiveQuery(() => db.disciplinas.toArray()) || [];

  const cursosUnicosIds = Array.from(new Set(turmasAll.map(t => t.cursoId)));
  const cursosDisponiveis = cursos.filter(c => cursosUnicosIds.includes(c.id!));

  let periodosDisponiveis: string[] = [];
  if (selectedCursoId) {
    const turmasDoCurso = turmasAll.filter(t => t.cursoId === Number(selectedCursoId));
    periodosDisponiveis = Array.from(new Set(turmasDoCurso.map(t => t.anoLetivo || ''))).filter(Boolean);
    periodosDisponiveis.sort();
  }

  const turmasFiltradas = turmasAll.filter(t => {
    if (selectedCursoId && t.cursoId !== Number(selectedCursoId)) return false;
    if (selectedPeriodo && t.anoLetivo !== selectedPeriodo) return false;
    return true;
  });

  return (
    <div className="flex-1 bg-gray-50 dark:bg-slate-900 flex flex-col h-full overflow-hidden">
      {selectedTurma ? (
        <DashboardTurma turma={selectedTurma} onBack={() => setSelectedTurma(null)} />
      ) : (
        <div className="p-8 h-full overflow-auto">
          {/* Cabeçalho */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 rounded-xl shadow-sm">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 tracking-tight">Painel de Inteligência Acadêmica</h2>
                <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Selecione uma turma para acessar o painel de consolidação</p>
              </div>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 mb-8 flex flex-wrap gap-4 items-end dark:text-slate-100">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Curso</label>
              <select
                value={selectedCursoId}
                onChange={e => {
                  setSelectedCursoId(e.target.value);
                  setSelectedPeriodo('');
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Todos os Cursos</option>
                {cursosDisponiveis.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Período Letivo</label>
              <select
                value={selectedPeriodo}
                onChange={e => setSelectedPeriodo(e.target.value)}
                disabled={!selectedCursoId}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:dark:bg-slate-800 dark:bg-slate-800 disabled:text-gray-400 disabled:dark:text-slate-500 dark:text-slate-500 disabled:cursor-not-allowed"
              >
                <option value="">Todos os Períodos</option>
                {periodosDisponiveis.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {turmasFiltradas.map(turma => {
              const curso = cursos.find(c => c.id === turma.cursoId);
              const qtdAlunos = todosAlunos.filter(a => a.turmaId === turma.id).length;
              const qtdDisciplinas = todasDisciplinas.filter(d => d.turmaId === turma.id).length;
              
              return (
                <div 
                  key={turma.id} 
                  onClick={() => setSelectedTurma(turma)}
                  className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col h-full dark:text-slate-100"
                >
                  {/* Top Row */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2.5 rounded-lg shrink-0 group-hover:bg-indigo-200 transition-colors">
                        <Users className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 leading-tight">{turma.nome}</h3>
                      </div>
                    </div>
                    <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 border border-indigo-100">
                      {turma.anoLetivo || 'Sem Período'}
                    </span>
                  </div>
                  
                  {/* Course Name - Full Width */}
                  <div className="w-full text-sm text-gray-500 dark:text-slate-400 mb-4">
                    {curso?.nome || 'Curso Desconhecido'}
                  </div>
                  
                  {/* Middle Row */}
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-[140px] flex justify-center bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs px-2 py-1 rounded font-medium border border-gray-200 dark:border-slate-700">
                        Cód: {turma.codigo}
                      </span>
                      <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-xs px-2 py-1 rounded flex items-center gap-1 font-medium border border-blue-100">
                        👥 {qtdAlunos} Alunos
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-[140px] flex justify-center bg-purple-50 text-purple-600 text-xs px-2 py-1 rounded items-center gap-1 font-medium border border-purple-100">
                        📚 {qtdDisciplinas} Disciplinas
                      </span>
                    </div>
                  </div>
                  
                  {/* Footer Button */}
                  <div className="mt-auto pt-3 border-t border-gray-100">
                    <div className="w-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 group-hover:bg-indigo-100 dark:bg-indigo-900/40 font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm border border-indigo-100">
                      <Activity className="w-4 h-4" />
                      Acessar Painel
                    </div>
                  </div>
                </div>
              );
            })}
            {turmasFiltradas.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-600">
                Nenhuma turma encontrada para os filtros selecionados.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardTurma: React.FC<{ turma: Turma; onBack: () => void }> = ({ turma, onBack }) => {
  const [activeTab, setActiveTab] = useState<'mapa' | 'conselho' | 'estatisticas' | 'risco' | 'monitoria' | 'ranking'>('mapa');
  const [monitoriaDiscId, setMonitoriaDiscId] = useState<number | ''>('');
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  const curso = useLiveQuery(() => db.cursos.get(turma.cursoId));
  const isSubsequente = curso?.modalidade?.includes('Subsequente');
  const numEtapas = isSubsequente ? 2 : 4;

  const alunos = useLiveQuery(() => db.alunos.where('turmaId').equals(turma.id!).toArray()) || [];
  const disciplinas = useLiveQuery(() => db.disciplinas.where('turmaId').equals(turma.id!).toArray()) || [];
  
  const notas = useLiveQuery(() => {
    if (disciplinas.length === 0) return [];
    const ids = disciplinas.map(d => d.id!);
    return db.notas.where('disciplinaId').anyOf(ids).toArray();
  }, [disciplinas]) || [];

  const avaliacoes = useLiveQuery(() => {
    if (disciplinas.length === 0) return [];
    const ids = disciplinas.map(d => d.id!);
    return db.avaliacoes_finais.where('disciplinaId').anyOf(ids).toArray();
  }, [disciplinas]) || [];

  const alunosProcessed = alunos.map(aluno => {
    let qtdReprovacoes = 0;
    let pendencias: { disc: Disciplina, mediaStr: string, eligible: boolean }[] = [];
    let cursandoCount = 0;
    let conselhoDecision: 'aprovado' | 'reprovado' | null = null;
    let gradesByDisc: Record<number, number | null> = {};
    let gradesOrigByDisc: Record<number, number | null> = {};
    let isConselhoAprovadoByDisc: Record<number, boolean> = {};
    let disciplinasRisco: { disc: Disciplina, faltasTot: number, limite: number, percent: number }[] = [];

    let cargaHorariaTotal = 0;
    let faltasGlobaisTotais = 0;

    disciplinas.forEach(disc => {
      cargaHorariaTotal += disc.chRelogio;
      const limiteFaltas = Math.floor(disc.chRelogio * 0.25);
      const discNotas = notas.filter(n => n.alunoId === aluno.id && n.disciplinaId === disc.id);
      const av = avaliacoes.find(a => a.alunoId === aluno.id && a.disciplinaId === disc.id);

      let notasPreenchidas = [];
      let faltasTot = 0;
      
      for (let i = 1; i <= numEtapas; i++) {
        const notaObj = discNotas.find(n => n.etapa === i);
        if (notaObj && notaObj.nota !== undefined && notaObj.nota !== null && String(notaObj.nota) !== '') {
          notasPreenchidas.push(Number(notaObj.nota));
        }
        faltasTot += (notaObj?.faltas || 0);
      }

      faltasGlobaisTotais += faltasTot;

      if (faltasTot > 0) {
        const percent = faltasTot / limiteFaltas;
        if (percent >= 0.8) {
           disciplinasRisco.push({ disc, faltasTot, limite: limiteFaltas, percent });
        }
      }

      if (notasPreenchidas.length === 0) {
        gradesByDisc[disc.id!] = null;
        gradesOrigByDisc[disc.id!] = null;
        isConselhoAprovadoByDisc[disc.id!] = false;
        cursandoCount++;
        return;
      }

      const todasNotasDigitadas = notasPreenchidas.length === numEtapas;
      if (!todasNotasDigitadas) {
        cursandoCount++;
      }

      const somaNotas = notasPreenchidas.reduce((a, b) => a + b, 0);
      const mediaParcialNum = somaNotas / (todasNotasDigitadas ? numEtapas : notasPreenchidas.length);
      
      let finalMediaOrig = mediaParcialNum;
      const notaProvaFinal = av?.provaFinal;
      if (notaProvaFinal !== undefined && notaProvaFinal !== null && String(notaProvaFinal) !== '') {
          finalMediaOrig = (mediaParcialNum + Number(notaProvaFinal)) / 2;
      }

      let finalMedia = finalMediaOrig;
      let isConselho = false;
      if (av?.statusConselho === 'aprovado' || av?.aprovadoConselho) {
         finalMedia = 5.0;
         isConselho = true;
      }

      gradesByDisc[disc.id!] = finalMedia;
      gradesOrigByDisc[disc.id!] = finalMediaOrig;
      isConselhoAprovadoByDisc[disc.id!] = isConselho;

      if (!todasNotasDigitadas) {
        return; // não calcula retenções se não fechou
      }

      if (av?.statusConselho) {
         conselhoDecision = av.statusConselho;
      } else if (av?.aprovadoConselho) {
         conselhoDecision = 'aprovado';
      }

      if (finalMediaOrig < 6.0) {
        qtdReprovacoes++;
        pendencias.push({
          disc,
          mediaStr: finalMediaOrig.toFixed(1),
          eligible: true
        });
      }
    });

    const limiteFaltasGlobal = Math.floor(cargaHorariaTotal * 0.25);
    const hasReprovacaoPorFalta = faltasGlobaisTotais > limiteFaltasGlobal;

    const isEligible = cursandoCount === 0 && !hasReprovacaoPorFalta && qtdReprovacoes > 0 && qtdReprovacoes <= 2;

    let statusText = '';
    if (cursandoCount > 0) {
      statusText = 'Aguardando Fechamento';
    } else if (hasReprovacaoPorFalta) {
      statusText = 'Reprovado por Faltas';
    } else if (qtdReprovacoes > 2) {
      statusText = 'Reprovado';
    } else if (qtdReprovacoes > 0 && !isEligible) {
      statusText = 'Retido (Critérios não atingidos)';
    } else if (isEligible) {
      if (conselhoDecision === 'aprovado') {
        statusText = 'Aprovado no Conselho';
      } else if (conselhoDecision === 'reprovado') {
        statusText = 'Reprovado no Conselho';
      } else {
        statusText = 'Aguardando Decisão';
      }
    } else if (qtdReprovacoes === 0 && !hasReprovacaoPorFalta) {
      statusText = 'Aprovado';
    }

    const freqGlobal = cargaHorariaTotal > 0 ? ((cargaHorariaTotal - faltasGlobaisTotais) / cargaHorariaTotal) * 100 : 100;
    const isPeDeMeiaApto = freqGlobal >= 80;

    return {
      aluno,
      qtdReprovacoes,
      hasReprovacaoPorFalta,
      cursandoCount,
      pendencias,
      isEligible,
      statusText,
      conselhoDecision,
      alreadyApprovedAll: qtdReprovacoes === 0 && cursandoCount === 0 && !hasReprovacaoPorFalta,
      gradesByDisc,
      gradesOrigByDisc,
      isConselhoAprovadoByDisc,
      disciplinasRisco,
      isPeDeMeiaApto,
      freqGlobal
    };
  });

  const conselhoAlunos = alunosProcessed.filter(a => !a.alreadyApprovedAll);

  const alunosRisco = alunosProcessed.filter(a => a.disciplinasRisco.length >= 2).map(a => {
     const isMuitoAlto = a.disciplinasRisco.some(d => d.percent >= 1.0);
     return { ...a, nivelRisco: isMuitoAlto ? 'Muito Alto' : 'Alto' };
  }).sort((a) => (a.nivelRisco === 'Muito Alto' ? -1 : 1));

  const rankingMonitoria = monitoriaDiscId 
    ? [...alunosProcessed]
        .filter(a => a.gradesByDisc[monitoriaDiscId] !== null && a.gradesByDisc[monitoriaDiscId] !== undefined)
        .map(a => {
          const discNotas = notas.filter(n => n.alunoId === a.aluno.id && n.disciplinaId === monitoriaDiscId);
          let faltasTot = 0;
          for (let i = 1; i <= numEtapas; i++) {
             faltasTot += discNotas.find(n => n.etapa === i)?.faltas || 0;
          }
          return {
            aluno: a.aluno,
            nota: a.gradesByDisc[monitoriaDiscId] as number,
            faltas: faltasTot
          };
        })
        .sort((a, b) => b.nota - a.nota)
        .slice(0, 5)
    : [];

  const rankingGeral = alunosProcessed.map(a => {
    let somaGlobal = 0;
    let qtdDisciplinasValidas = 0;
    disciplinas.forEach(d => {
        const nota = a.gradesByDisc[d.id!];
        if (nota !== null && nota !== undefined) {
            somaGlobal += nota;
            qtdDisciplinasValidas++;
        }
    });
    const mediaGeral = qtdDisciplinasValidas > 0 ? somaGlobal / qtdDisciplinasValidas : null;
    return {
        aluno: a.aluno,
        mediaGeral,
        qtdDisciplinasValidas
    };
  }).sort((a, b) => {
    if (a.mediaGeral === null && b.mediaGeral === null) return 0;
    if (a.mediaGeral === null) return 1;
    if (b.mediaGeral === null) return -1;
    return b.mediaGeral - a.mediaGeral;
  });

  // Estatísticas
  let totalNotasFechadas = 0;
  let totalNotasAzuis = 0;
  const disciplinaSomas: Record<number, { sum: number, count: number }> = {};

  alunosProcessed.forEach(ap => {
    disciplinas.forEach(d => {
      const val = ap.gradesByDisc[d.id!];
      if (val !== null) {
        totalNotasFechadas++;
        if (val >= 6.0) totalNotasAzuis++;
        
        if (!disciplinaSomas[d.id!]) disciplinaSomas[d.id!] = { sum: 0, count: 0 };
        disciplinaSomas[d.id!].sum += val;
        disciplinaSomas[d.id!].count++;
      }
    });
  });

  const taxaSucesso = totalNotasFechadas === 0 ? 0 : (totalNotasAzuis / totalNotasFechadas) * 100;

  let discCriticaName = 'Nenhuma';
  let minMediaGeral = Infinity;
  disciplinas.forEach(d => {
     const stats = disciplinaSomas[d.id!];
     if (stats && stats.count > 0) {
        const avg = stats.sum / stats.count;
        if (avg < minMediaGeral) {
           minMediaGeral = avg;
           discCriticaName = d.nome;
        }
     }
  });

  const handleDecisaoConselho = async (alunoId: number, pendencias: { disc: Disciplina }[], decisao: 'aprovado' | 'reprovado') => {
    setConfirmModal({
      isOpen: true,
      title: 'Decisão do Conselho',
      message: `Deseja confirmar a decisão: ${decisao.toUpperCase()} para este aluno?`,
      onConfirm: async () => {
        await Promise.all(pendencias.map(async (p) => {
          const existing = await db.avaliacoes_finais.where({ alunoId, disciplinaId: p.disc.id! }).first();
          if (existing && existing.id) {
            await db.avaliacoes_finais.update(existing.id, { statusConselho: decisao, aprovadoConselho: decisao === 'aprovado' });
          } else {
            await db.avaliacoes_finais.add({
              alunoId,
              disciplinaId: p.disc.id!,
              statusConselho: decisao,
              aprovadoConselho: decisao === 'aprovado'
            });
          }
        }));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDesfazerDecisao = async (alunoId: number, pendencias: { disc: Disciplina }[]) => {
    setConfirmModal({
      isOpen: true,
      title: 'Desfazer Decisão',
      message: 'Deseja desfazer a decisão do conselho?',
      onConfirm: async () => {
        await Promise.all(pendencias.map(async (p) => {
          const existing = await db.avaliacoes_finais.where({ alunoId, disciplinaId: p.disc.id! }).first();
          if (existing && existing.id) {
            await db.avaliacoes_finais.update(existing.id, { statusConselho: null, aprovadoConselho: false });
          }
        }));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 pt-4 flex flex-col gap-4 shadow-sm shrink-0 dark:text-slate-100">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-slate-300 hover:text-indigo-600 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-gray-800 dark:text-slate-100 font-semibold text-lg">Painel de Inteligência Acadêmica</h1>
          <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 text-xs px-2 py-1 rounded font-bold ml-2">
            {turma.codigo}
          </span>
        </div>
        
        <div className="flex gap-6 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('mapa')} 
            className={`whitespace-nowrap px-2 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'mapa' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:border-slate-600'}`}
          >
            Mapa Global
          </button>
          <button 
            onClick={() => setActiveTab('conselho')} 
            className={`whitespace-nowrap px-2 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'conselho' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:border-slate-600'}`}
          >
            Conselho de Classe
          </button>
          <button 
            onClick={() => setActiveTab('estatisticas')} 
            className={`whitespace-nowrap px-2 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'estatisticas' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:border-slate-600'}`}
          >
            Estatísticas
          </button>
          <button 
            onClick={() => setActiveTab('risco')} 
            className={`whitespace-nowrap px-2 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'risco' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:border-slate-600'}`}
          >
            Alerta de Risco
          </button>
          <button 
            onClick={() => setActiveTab('monitoria')} 
            className={`whitespace-nowrap px-2 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'monitoria' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:border-slate-600'}`}
          >
            Ranking de Monitoria
          </button>
          <button 
            onClick={() => setActiveTab('ranking')} 
            className={`whitespace-nowrap px-2 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'ranking' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:border-slate-600'}`}
          >
            Ranking Geral
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        {activeTab === 'mapa' && (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm flex-1 overflow-auto dark:text-slate-100">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 dark:bg-slate-800 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700 border-r min-w-[200px] sticky left-0 bg-gray-100 dark:bg-slate-800 z-20">
                    Aluno
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700 border-r min-w-[150px] sticky left-[200px] bg-gray-100 dark:bg-slate-800 z-20">
                    Status Pé de Meia
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700 border-r min-w-[150px] sticky left-[350px] bg-gray-100 dark:bg-slate-800 z-20">
                    Situação
                  </th>
                  {disciplinas.map(d => (
                    <th key={d.id} className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700 min-w-[120px]">
                      <div className="truncate max-w-[150px]" title={d.nome}>{d.nome}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alunosProcessed.map(item => (
                  <tr key={item.aluno.id} className="hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-100 align-middle border-r sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-gray-50 dark:hover:bg-slate-900">
                      {item.aluno.nome}
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r sticky left-[200px] bg-white dark:bg-slate-800 group-hover:bg-gray-50 dark:hover:bg-slate-900 font-bold dark:text-slate-100">
                      <span className={`px-2 py-1 rounded text-xs font-bold inline-block ${item.isPeDeMeiaApto ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {item.isPeDeMeiaApto ? 'Apto' : 'Não Apto'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r sticky left-[350px] bg-white dark:bg-slate-800 group-hover:bg-gray-50 dark:hover:bg-slate-900 font-bold dark:text-slate-100">
                      <span className={`px-2 py-1 rounded text-xs font-bold inline-block
                        ${item.statusText.includes('Aprovado') ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800' :
                          item.statusText.includes('Retido') || item.statusText.includes('Reprovado') ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100'
                        }`}>
                        {item.statusText}
                      </span>
                    </td>
                    {disciplinas.map(d => {
                      const nota = item.gradesByDisc[d.id!];
                      const isConselho = item.isConselhoAprovadoByDisc[d.id!];
                      const notaOrig = item.gradesOrigByDisc[d.id!];
                      return (
                        <td key={d.id} className="px-4 py-3 text-center align-middle font-bold">
                          {nota === null || nota === undefined ? (
                            <span className="text-gray-300">-</span>
                          ) : isConselho ? (
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-blue-600 font-semibold">{nota.toFixed(1)}</span>
                              <span className="text-xs text-gray-500 dark:text-slate-400 font-normal">({notaOrig?.toFixed(1)})</span>
                            </div>
                          ) : (
                            <span className={nota >= 6.0 ? 'text-green-600' : 'text-red-600'}>
                              {nota.toFixed(1)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {alunosProcessed.length === 0 && (
                  <tr>
                    <td colSpan={disciplinas.length + 1} className="py-12 text-center text-gray-500 dark:text-slate-400">
                      Nenhum dado para exibir.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'conselho' && (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm flex-1 overflow-auto dark:text-slate-100">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 dark:bg-slate-800 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700 w-1/4">
                    Aluno
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700 w-1/3">
                    Disciplinas Pendentes
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700 w-1/5">
                    Status no Conselho
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {conselhoAlunos.map(item => (
                  <tr key={item.aluno.id} className="hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-100 align-middle">
                      {item.aluno.nome}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {item.pendencias.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {item.pendencias.map(p => (
                            <div key={p.disc.id} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-slate-900 border border-gray-100 rounded px-2 py-1">
                              <span className="text-gray-600 dark:text-slate-300 truncate mr-2">{p.disc.nome}</span>
                              <span className={`font-bold ${p.eligible ? 'text-gray-700 dark:text-slate-300' : 'text-red-500'}`}>{p.mediaStr}</span>
                            </div>
                          ))}
                        </div>
                      ) : item.hasReprovacaoPorFalta ? (
                        <span className="text-red-500 font-medium">Reprovação por Faltas</span>
                      ) : item.cursandoCount > 0 ? (
                        <span className="text-gray-400 dark:text-slate-500 italic">Diários em andamento...</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-center align-middle font-medium">
                      {item.statusText === 'Aguardando Decisão' && <span className="text-amber-600 font-bold">{item.statusText}</span>}
                      {item.statusText === 'Aprovado no Conselho' && <span className="text-green-600 font-bold">{item.statusText}</span>}
                      {item.statusText === 'Reprovado no Conselho' && <span className="text-red-600 font-bold">{item.statusText}</span>}
                      {(item.statusText.startsWith('Retido') || item.statusText.startsWith('Reprovado por') || item.statusText === 'Reprovado') && <span className="text-red-600">{item.statusText}</span>}
                      {item.statusText === 'Aguardando Fechamento' && <span className="text-gray-500 dark:text-slate-400">{item.statusText}</span>}
                    </td>
                    <td className="px-4 py-3 text-center align-middle">
                      {item.isEligible && item.conselhoDecision === null && (
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleDecisaoConselho(item.aluno.id!, item.pendencias, 'aprovado')}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 rounded-lg text-sm shadow-sm transition-colors"
                          >
                            Aprovar
                          </button>
                          <button 
                            onClick={() => handleDecisaoConselho(item.aluno.id!, item.pendencias, 'reprovado')}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded-lg text-sm shadow-sm transition-colors"
                          >
                            Reprovar
                          </button>
                        </div>
                      )}
                      {item.isEligible && item.conselhoDecision !== null && (
                        <button 
                          onClick={() => handleDesfazerDecisao(item.aluno.id!, item.pendencias)}
                          className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 font-medium py-1.5 px-3 rounded-lg text-sm transition-colors flex items-center gap-1 mx-auto"
                        >
                          Desfazer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {conselhoAlunos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500 dark:text-slate-400">
                      Nenhum aluno em dependência nesta turma.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'estatisticas' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 flex flex-col justify-center items-center text-center dark:text-slate-100">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-gray-500 dark:text-slate-400 font-medium text-sm mb-1">Total de Alunos</h3>
              <p className="text-3xl font-bold text-gray-800 dark:text-slate-100">{alunos.length}</p>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 flex flex-col justify-center items-center text-center dark:text-slate-100">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-full flex items-center justify-center mb-4">
                <BarChart2 className="w-6 h-6" />
              </div>
              <h3 className="text-gray-500 dark:text-slate-400 font-medium text-sm mb-1">Taxa de Sucesso (Notas Azuis)</h3>
              <p className="text-3xl font-bold text-gray-800 dark:text-slate-100">
                {taxaSucesso.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Das notas fechadas</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 flex flex-col justify-center items-center text-center dark:text-slate-100">
              <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-gray-500 dark:text-slate-400 font-medium text-sm mb-1">Disciplina Crítica</h3>
              <p className="text-xl font-bold text-gray-800 dark:text-slate-100 line-clamp-2">
                {discCriticaName}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Menor média da turma</p>
            </div>
          </div>
        )}

        {activeTab === 'risco' && (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm flex-1 overflow-auto dark:text-slate-100">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 dark:bg-slate-800 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700 w-1/4">
                    Aluno
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                    Disciplinas em Situação de Risco
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700 w-1/5">
                    Nível de Risco Global
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alunosRisco.map(item => (
                  <tr key={item.aluno.id} className="hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-100 align-middle">
                      {item.aluno.nome}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col gap-1">
                        {item.disciplinasRisco.map(d => (
                          <div key={d.disc.id} className="flex justify-between items-center text-sm bg-red-50 dark:bg-red-900/20 border border-red-100 rounded px-2 py-1">
                            <span className="text-red-800 truncate mr-2 font-medium">{d.disc.nome}</span>
                            <span className={`font-bold ${d.percent >= 1.0 ? 'text-red-700' : 'text-red-500'}`}>
                              {d.faltasTot} faltas
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center align-middle font-bold">
                      {item.nivelRisco === 'Muito Alto' ? (
                        <span className="text-red-600 bg-red-100 px-3 py-1 rounded-full flex items-center justify-center gap-1 w-fit mx-auto">
                          <AlertTriangle className="w-4 h-4" /> Muito Alto
                        </span>
                      ) : (
                        <span className="text-orange-600 bg-orange-100 dark:bg-orange-900/40 px-3 py-1 rounded-full flex items-center justify-center gap-1 w-fit mx-auto">
                          <AlertTriangle className="w-4 h-4" /> Alto
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {alunosRisco.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-gray-500 dark:text-slate-400">
                      Nenhum aluno em situação crítica de faltas simultâneas nesta turma.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'monitoria' && (
          <div className="flex flex-col h-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden dark:text-slate-100">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex items-center justify-between">
              <span className="text-gray-700 dark:text-slate-300 font-semibold">Ranking de Desempenho</span>
              <select
                value={monitoriaDiscId}
                onChange={e => setMonitoriaDiscId(e.target.value ? Number(e.target.value) : '')}
                className="block w-64 rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border"
              >
                <option value="">-- Selecione uma Disciplina --</option>
                {disciplinas.map(d => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-auto">
              {!monitoriaDiscId ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-slate-400 space-y-4 p-12">
                  <Award className="w-16 h-16 text-gray-300" />
                  <p className="text-lg">Selecione uma disciplina acima para gerar o ranking.</p>
                </div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-100 dark:bg-slate-800 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <tr>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700 w-24">
                        Colocação
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                        Aluno
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700 w-1/4">
                        Média Obtida
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700 w-1/4">
                        Faltas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rankingMonitoria.map((item, index) => (
                      <tr key={item.aluno.id} className="hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
                        <td className="px-4 py-3 text-center align-middle">
                          {index === 0 ? (
                            <span className="flex items-center justify-center text-yellow-500 font-bold">
                              <Award className="w-5 h-5 mr-1" /> 1º
                            </span>
                          ) : (
                            <span className="font-bold text-gray-500 dark:text-slate-400">{index + 1}º</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-100 align-middle">
                          {item.aluno.nome}
                        </td>
                        <td className="px-4 py-3 text-center align-middle font-bold text-green-600">
                          {item.nota.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-center align-middle text-gray-600 dark:text-slate-300">
                          {item.faltas}
                        </td>
                      </tr>
                    ))}
                    {rankingMonitoria.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-500 dark:text-slate-400">
                          Nenhum dado registrado para esta disciplina.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm flex-1 overflow-auto dark:text-slate-100">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 dark:bg-slate-800 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <tr>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700 w-24">
                    Posição
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                    Aluno
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700 w-1/4">
                    Média Geral
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700 w-1/4">
                    Disciplinas Contabilizadas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rankingGeral.map((item, index) => (
                  <tr key={item.aluno.id} className="hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
                    <td className="px-4 py-3 text-center align-middle">
                      {item.mediaGeral !== null ? (
                        index === 0 ? (
                          <span className="flex items-center justify-center text-yellow-500 font-bold">
                            <Award className="w-5 h-5 mr-1" /> 1º
                          </span>
                        ) : index === 1 ? (
                          <span className="flex items-center justify-center text-gray-400 dark:text-slate-500 font-bold">
                            <Award className="w-5 h-5 mr-1" /> 2º
                          </span>
                        ) : index === 2 ? (
                          <span className="flex items-center justify-center text-amber-600 font-bold">
                            <Award className="w-5 h-5 mr-1" /> 3º
                          </span>
                        ) : (
                          <span className="font-bold text-gray-500 dark:text-slate-400">{index + 1}º</span>
                        )
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-100 align-middle">
                      {item.aluno.nome}
                    </td>
                    <td className="px-4 py-3 text-center align-middle font-bold text-indigo-600">
                      {item.mediaGeral !== null ? item.mediaGeral.toFixed(2) : (
                        <span className="text-gray-400 dark:text-slate-500 font-normal italic text-xs">Sem notas registradas</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center align-middle text-gray-600 dark:text-slate-300">
                      {item.qtdDisciplinasValidas} de {disciplinas.length}
                    </td>
                  </tr>
                ))}
                {rankingGeral.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500 dark:text-slate-400">
                      Nenhum aluno registrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
