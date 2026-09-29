import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Turma, Disciplina } from '../db/database';
import { ArrowLeft, Users, Scale, Activity, BarChart2, AlertTriangle, Award } from 'lucide-react';

export const ConsolidacaoView: React.FC = () => {
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);

  const turmas = useLiveQuery(async () => {
    const all = await db.turmas.toArray();
    return all.filter(t => !t.arquivado);
  }) || [];

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden">
      {selectedTurma ? (
        <DashboardTurma turma={selectedTurma} onBack={() => setSelectedTurma(null)} />
      ) : (
        <div className="p-8 h-full overflow-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Painel de Inteligência Acadêmica
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {turmas.map(turma => (
              <div 
                key={turma.id} 
                onClick={() => setSelectedTurma(turma)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-bold">
                    {turma.codigo}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">{turma.nome}</h3>
                <p className="text-sm text-gray-500 font-medium">Acessar Painel</p>
              </div>
            ))}
            {turmas.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                Nenhuma turma ativa encontrada.
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
  
  const curso = useLiveQuery(() => db.cursos.get(turma.cursoId));
  const isSubsequente = curso?.modalidade === 'Técnico Subsequente';
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
      statusText = 'Retido (Reprov. por Faltas)';
    } else if (qtdReprovacoes > 2) {
      statusText = 'Retido (Mais de 2 rep.)';
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
    if (!window.confirm(`Deseja confirmar a decisão: ${decisao.toUpperCase()} para este aluno?`)) return;
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
  };

  const handleDesfazerDecisao = async (alunoId: number, pendencias: { disc: Disciplina }[]) => {
    if (!window.confirm('Deseja desfazer a decisão do conselho?')) return;
    await Promise.all(pendencias.map(async (p) => {
      const existing = await db.avaliacoes_finais.where({ alunoId, disciplinaId: p.disc.id! }).first();
      if (existing && existing.id) {
        await db.avaliacoes_finais.update(existing.id, { statusConselho: null, aprovadoConselho: false });
      }
    }));
  };

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-gray-200 px-6 pt-4 flex flex-col gap-4 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-gray-800 font-semibold text-lg">Painel de Inteligência Acadêmica</h1>
          <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded font-bold ml-2">
            {turma.codigo}
          </span>
        </div>
        
        <div className="flex gap-6 border-b border-gray-200 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('mapa')} 
            className={`whitespace-nowrap px-2 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'mapa' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Mapa Global
          </button>
          <button 
            onClick={() => setActiveTab('conselho')} 
            className={`whitespace-nowrap px-2 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'conselho' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Conselho de Classe
          </button>
          <button 
            onClick={() => setActiveTab('estatisticas')} 
            className={`whitespace-nowrap px-2 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'estatisticas' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Estatísticas
          </button>
          <button 
            onClick={() => setActiveTab('risco')} 
            className={`whitespace-nowrap px-2 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'risco' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Alerta de Risco
          </button>
          <button 
            onClick={() => setActiveTab('monitoria')} 
            className={`whitespace-nowrap px-2 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'monitoria' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Ranking de Monitoria
          </button>
          <button 
            onClick={() => setActiveTab('ranking')} 
            className={`whitespace-nowrap px-2 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'ranking' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Ranking Geral
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        {activeTab === 'mapa' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 border-r min-w-[200px] sticky left-0 bg-gray-100 z-20">
                    Aluno
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200 border-r min-w-[150px] sticky left-[200px] bg-gray-100 z-20">
                    Status Pé de Meia
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200 border-r min-w-[150px] sticky left-[350px] bg-gray-100 z-20">
                    Situação
                  </th>
                  {disciplinas.map(d => (
                    <th key={d.id} className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200 min-w-[120px]">
                      <div className="truncate max-w-[150px]" title={d.nome}>{d.nome}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alunosProcessed.map(item => (
                  <tr key={item.aluno.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 align-middle border-r sticky left-0 bg-white group-hover:bg-gray-50">
                      {item.aluno.nome}
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r sticky left-[200px] bg-white group-hover:bg-gray-50 font-bold">
                      <span className={`px-2 py-1 rounded text-xs font-bold inline-block ${item.isPeDeMeiaApto ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {item.isPeDeMeiaApto ? 'Apto' : 'Não Apto'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r sticky left-[350px] bg-white group-hover:bg-gray-50 font-bold">
                      <span className={`px-2 py-1 rounded text-xs font-bold inline-block
                        ${item.statusText.includes('Aprovado') ? 'bg-emerald-100 text-emerald-800' :
                          item.statusText.includes('Retido') || item.statusText.includes('Reprovado') ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
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
                              <span className="text-xs text-gray-500 font-normal">({notaOrig?.toFixed(1)})</span>
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
                    <td colSpan={disciplinas.length + 1} className="py-12 text-center text-gray-500">
                      Nenhum dado para exibir.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'conselho' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 w-1/4">
                    Aluno
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 w-1/3">
                    Disciplinas Pendentes
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200 w-1/5">
                    Status no Conselho
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {conselhoAlunos.map(item => (
                  <tr key={item.aluno.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 align-middle">
                      {item.aluno.nome}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {item.pendencias.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {item.pendencias.map(p => (
                            <div key={p.disc.id} className="flex justify-between items-center text-sm bg-gray-50 border border-gray-100 rounded px-2 py-1">
                              <span className="text-gray-600 truncate mr-2">{p.disc.nome}</span>
                              <span className={`font-bold ${p.eligible ? 'text-gray-700' : 'text-red-500'}`}>{p.mediaStr}</span>
                            </div>
                          ))}
                        </div>
                      ) : item.hasReprovacaoPorFalta ? (
                        <span className="text-red-500 font-medium">Reprovação por Faltas</span>
                      ) : item.cursandoCount > 0 ? (
                        <span className="text-gray-400 italic">Diários em andamento...</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-center align-middle font-medium">
                      {item.statusText === 'Aguardando Decisão' && <span className="text-amber-600 font-bold">{item.statusText}</span>}
                      {item.statusText === 'Aprovado no Conselho' && <span className="text-green-600 font-bold">{item.statusText}</span>}
                      {item.statusText === 'Reprovado no Conselho' && <span className="text-red-600 font-bold">{item.statusText}</span>}
                      {item.statusText.startsWith('Retido') && <span className="text-red-600">{item.statusText}</span>}
                      {item.statusText === 'Aguardando Fechamento' && <span className="text-gray-500">{item.statusText}</span>}
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
                          className="text-gray-500 hover:text-gray-700 font-medium py-1.5 px-3 rounded-lg text-sm transition-colors flex items-center gap-1 mx-auto"
                        >
                          Desfazer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {conselhoAlunos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500">
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-center items-center text-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-gray-500 font-medium text-sm mb-1">Total de Alunos</h3>
              <p className="text-3xl font-bold text-gray-800">{alunos.length}</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-center items-center text-center">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
                <BarChart2 className="w-6 h-6" />
              </div>
              <h3 className="text-gray-500 font-medium text-sm mb-1">Taxa de Sucesso (Notas Azuis)</h3>
              <p className="text-3xl font-bold text-gray-800">
                {taxaSucesso.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">Das notas fechadas</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-center items-center text-center">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-gray-500 font-medium text-sm mb-1">Disciplina Crítica</h3>
              <p className="text-xl font-bold text-gray-800 line-clamp-2">
                {discCriticaName}
              </p>
              <p className="text-xs text-gray-400 mt-1">Menor média da turma</p>
            </div>
          </div>
        )}

        {activeTab === 'risco' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 w-1/4">
                    Aluno
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">
                    Disciplinas em Situação de Risco
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200 w-1/5">
                    Nível de Risco Global
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alunosRisco.map(item => (
                  <tr key={item.aluno.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 align-middle">
                      {item.aluno.nome}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col gap-1">
                        {item.disciplinasRisco.map(d => (
                          <div key={d.disc.id} className="flex justify-between items-center text-sm bg-red-50 border border-red-100 rounded px-2 py-1">
                            <span className="text-red-800 truncate mr-2 font-medium">{d.disc.nome}</span>
                            <span className={`font-bold ${d.percent >= 1.0 ? 'text-red-700' : 'text-red-500'}`}>
                              {d.faltasTot} / {d.limite} faltas
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
                        <span className="text-orange-600 bg-orange-100 px-3 py-1 rounded-full flex items-center justify-center gap-1 w-fit mx-auto">
                          <AlertTriangle className="w-4 h-4" /> Alto
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {alunosRisco.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-gray-500">
                      Nenhum aluno em situação crítica de faltas simultâneas nesta turma.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'monitoria' && (
          <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-gray-700 font-semibold">Ranking de Desempenho</span>
              <select
                value={monitoriaDiscId}
                onChange={e => setMonitoriaDiscId(e.target.value ? Number(e.target.value) : '')}
                className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border"
              >
                <option value="">-- Selecione uma Disciplina --</option>
                {disciplinas.map(d => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-auto">
              {!monitoriaDiscId ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 p-12">
                  <Award className="w-16 h-16 text-gray-300" />
                  <p className="text-lg">Selecione uma disciplina acima para gerar o ranking.</p>
                </div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-100 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <tr>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200 w-24">
                        Colocação
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">
                        Aluno
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200 w-1/4">
                        Média Obtida
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200 w-1/4">
                        Faltas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rankingMonitoria.map((item, index) => (
                      <tr key={item.aluno.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-center align-middle">
                          {index === 0 ? (
                            <span className="flex items-center justify-center text-yellow-500 font-bold">
                              <Award className="w-5 h-5 mr-1" /> 1º
                            </span>
                          ) : (
                            <span className="font-bold text-gray-500">{index + 1}º</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 align-middle">
                          {item.aluno.nome}
                        </td>
                        <td className="px-4 py-3 text-center align-middle font-bold text-green-600">
                          {item.nota.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-center align-middle text-gray-600">
                          {item.faltas}
                        </td>
                      </tr>
                    ))}
                    {rankingMonitoria.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-500">
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
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <tr>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200 w-24">
                    Posição
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">
                    Aluno
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200 w-1/4">
                    Média Geral
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200 w-1/4">
                    Disciplinas Contabilizadas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rankingGeral.map((item, index) => (
                  <tr key={item.aluno.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-center align-middle">
                      {item.mediaGeral !== null ? (
                        index === 0 ? (
                          <span className="flex items-center justify-center text-yellow-500 font-bold">
                            <Award className="w-5 h-5 mr-1" /> 1º
                          </span>
                        ) : index === 1 ? (
                          <span className="flex items-center justify-center text-gray-400 font-bold">
                            <Award className="w-5 h-5 mr-1" /> 2º
                          </span>
                        ) : index === 2 ? (
                          <span className="flex items-center justify-center text-amber-600 font-bold">
                            <Award className="w-5 h-5 mr-1" /> 3º
                          </span>
                        ) : (
                          <span className="font-bold text-gray-500">{index + 1}º</span>
                        )
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 align-middle">
                      {item.aluno.nome}
                    </td>
                    <td className="px-4 py-3 text-center align-middle font-bold text-indigo-600">
                      {item.mediaGeral !== null ? item.mediaGeral.toFixed(2) : (
                        <span className="text-gray-400 font-normal italic text-xs">Sem notas registradas</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center align-middle text-gray-600">
                      {item.qtdDisciplinasValidas} de {disciplinas.length}
                    </td>
                  </tr>
                ))}
                {rankingGeral.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500">
                      Nenhum aluno registrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};
