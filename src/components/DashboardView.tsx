import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Turma } from '../db/database';
import { LayoutDashboard, Users, BookOpen, FolderOpen, AlertTriangle, ChevronRight, CheckCircle2, Search } from 'lucide-react';
import type { TabId } from './MainLayout';
import { BuscaAlunoModal } from './BuscaAlunoModal';

interface DashboardProps {
  setActiveTab: (tab: TabId) => void;
}

export const DashboardView: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const [showBuscaAluno, setShowBuscaAluno] = React.useState(false);

  const dashboardData = useLiveQuery(async () => {
    const turmasAll = await db.turmas.toArray();
    const turmasAtivas = turmasAll.filter(t => !t.arquivado);
    
    const disciplinasAll = await db.disciplinas.toArray();
    const disciplinasAtivas = disciplinasAll.filter(d => !d.arquivado);
    
    const cursos = await db.cursos.toArray();
    const notas = await db.notas.toArray();
    const avaliacoes = await db.avaliacoes_finais.toArray();
    
    const turmasIds = turmasAtivas.map(t => t.id!);
    const alunosAtivos = await db.alunos.where('turmaId').anyOf(turmasIds).toArray();

    const alertasConselho: { turma: Turma, count: number }[] = [];
    const alertasEvasao: { alunoNome: string, turmaNome: string, disciplinaNome: string }[] = [];
    let diariosPendentesCount = 0;

    // Lógica de Pendências do Conselho
    for (const turma of turmasAtivas) {
      const curso = cursos.find(c => c.id === turma.cursoId);
      const isSubsequente = curso?.modalidade === 'Técnico Subsequente';
      const numEtapas = isSubsequente ? 2 : 4;

      const alunosTurma = alunosAtivos.filter(a => a.turmaId === turma.id);
      const disciplinasTurma = disciplinasAtivas.filter(d => d.turmaId === turma.id);
      
      let aguardandoConselhoCount = 0;

      for (const disc of disciplinasTurma) {
        const limiteFaltas = Math.floor(disc.chRelogio * 0.25);
        const discNotas = notas.filter(n => n.disciplinaId === disc.id);
        
        let maxEtapa = 0;
        for (const n of discNotas) {
          if (n.nota !== undefined && n.nota !== null && String(n.nota) !== '') {
            if (n.etapa > maxEtapa) maxEtapa = n.etapa;
          }
        }

        let temPendenciaNesteDiario = false;

        for (const aluno of alunosTurma) {
          const alunoDiscNotas = discNotas.filter(n => n.alunoId === aluno.id);
          let faltasTot = 0;
          for (const n of alunoDiscNotas) {
             faltasTot += n.faltas || 0;
          }

          if (faltasTot >= limiteFaltas * 0.8) {
            alertasEvasao.push({
               alunoNome: aluno.nome,
               turmaNome: turma.nome,
               disciplinaNome: disc.nome
            });
          }

          for (let i = 1; i <= maxEtapa; i++) {
            const n = alunoDiscNotas.find(x => x.etapa === i);
            if (!n || n.nota === undefined || n.nota === null || String(n.nota) === '') {
              temPendenciaNesteDiario = true;
            }
          }
        }

        if (temPendenciaNesteDiario) {
          diariosPendentesCount++;
        }
      }

      for (const aluno of alunosTurma) {
        let qtdReprovacoes = 0;
        let pendencias: { eligible: boolean }[] = [];
        let hasReprovacaoPorFalta = false;
        let cursandoCount = 0;
        let conselhoDecision: string | null = null;

        for (const disc of disciplinasTurma) {
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

          if (notasPreenchidas.length === 0) {
            cursandoCount++;
            continue;
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

          if (!todasNotasDigitadas) continue;

          if (faltasTot > limiteFaltas) {
            hasReprovacaoPorFalta = true;
            continue;
          }

          if (av?.statusConselho) {
             conselhoDecision = av.statusConselho;
          } else if (av?.aprovadoConselho) {
             conselhoDecision = 'aprovado';
          }

          if (finalMediaOrig < 6.0) {
            qtdReprovacoes++;
            pendencias.push({ eligible: finalMediaOrig >= 4.0 });
          }
        }

        const isEligible = cursandoCount === 0 && !hasReprovacaoPorFalta && qtdReprovacoes > 0 && qtdReprovacoes <= 2 && pendencias.every(p => p.eligible);
        
        if (isEligible && !conselhoDecision) {
          aguardandoConselhoCount++;
        }
      }

      if (aguardandoConselhoCount > 0) {
        alertasConselho.push({ turma, count: aguardandoConselhoCount });
      }
    }

    // Ordenar turmas por último acesso (decrescente) e pegar as 3 primeiras
    const turmasRecentes = [...turmasAtivas]
      .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))
      .slice(0, 3);

    return {
      turmas: turmasRecentes,
      totalTurmas: turmasAtivas.length,
      totalDisciplinas: disciplinasAtivas.length,
      totalAlunos: alunosAtivos.length,
      alertasConselho,
      alertasEvasao,
      diariosPendentesCount,
      cursos
    };
  }) || { turmas: [], totalTurmas: 0, totalDisciplinas: 0, totalAlunos: 0, alertasConselho: [], alertasEvasao: [], diariosPendentesCount: 0, cursos: [] };

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-sm">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Centro de Comando</h2>
              <p className="text-gray-500 text-sm">Visão geral e pendências operacionais</p>
            </div>
          </div>
          <button 
            onClick={() => setShowBuscaAluno(true)}
            className="bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-200 shadow-sm font-semibold py-2.5 px-6 rounded-xl transition-all flex items-center gap-2 hover:shadow-md hover:border-indigo-300"
          >
            <Search className="w-5 h-5" />
            Buscar Aluno
          </button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-blue-50 p-4 rounded-xl text-blue-600">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total de Alunos</p>
              <h3 className="text-3xl font-bold text-gray-800">{dashboardData.totalAlunos}</h3>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-indigo-50 p-4 rounded-xl text-indigo-600">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Turmas Ativas</p>
              <h3 className="text-3xl font-bold text-gray-800">{dashboardData.totalTurmas}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-emerald-50 p-4 rounded-xl text-emerald-600">
              <FolderOpen className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Disciplinas</p>
              <h3 className="text-3xl font-bold text-gray-800">{dashboardData.totalDisciplinas}</h3>
            </div>
          </div>
        </div>

        {/* Seção de Pendências */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Pendências e Alertas
            </h3>
          </div>
          <div className="p-6">
            {dashboardData.alertasConselho.length === 0 && dashboardData.diariosPendentesCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-emerald-600">
                <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-200" />
                <p className="font-semibold">Tudo limpo!</p>
                <p className="text-sm text-emerald-600/70">Nenhuma pendência operacional no momento.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {dashboardData.diariosPendentesCount > 0 && (
                  <li className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0" />
                      <span>
                        ℹ️ Faltam lançamentos (notas em branco em etapas passadas) em <strong>{dashboardData.diariosPendentesCount} diário(s)</strong>.
                      </span>
                    </div>
                    <button 
                      onClick={() => setActiveTab('turmas')}
                      className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded-lg text-sm transition-colors whitespace-nowrap"
                    >
                      Ver Turmas
                    </button>
                  </li>
                )}
                {dashboardData.alertasConselho.map((alerta, idx) => (
                  <li key={`conselho-${idx}`} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>
                        ⚠️ Você tem <strong>{alerta.count} aluno(s)</strong> aguardando decisão de Conselho na turma <strong>{alerta.turma.nome} ({alerta.turma.codigo})</strong>.
                      </span>
                    </div>
                    <button 
                      onClick={() => setActiveTab('consolidacao')}
                      className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold rounded-lg text-sm transition-colors whitespace-nowrap"
                    >
                      Resolver
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Alerta Crítico de Faltas Global */}
        {dashboardData.alertasEvasao.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-red-100 bg-red-50/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Risco Global de Evasão/Faltas
              </h3>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                {dashboardData.alertasEvasao.map((alerta, idx) => (
                  <li key={`evasao-${idx}`} className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 text-red-800 rounded-xl text-sm">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      O aluno <strong>{alerta.alunoNome}</strong> (Turma {alerta.turmaNome}) está no limite de faltas em <strong>{alerta.disciplinaNome}</strong>.
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Acesso Rápido às Turmas */}
        <div>
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-lg font-bold text-gray-800">Acesso Rápido</h3>
            <button 
              onClick={() => setActiveTab('turmas')}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold flex items-center gap-1"
            >
              Ver todas <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardData.turmas.map(t => {
              const curso = dashboardData.cursos.find(c => c.id === t.cursoId);
              return (
                <div 
                  key={t.id} 
                  onClick={async () => { 
                    await db.turmas.update(t.id!, { lastAccessed: Date.now() });
                    setActiveTab('turmas'); 
                  }}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-indigo-50 p-3 rounded-lg group-hover:bg-indigo-100 transition-colors">
                      <Users className="w-6 h-6 text-indigo-600" />
                    </div>
                    <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-1 rounded-full">
                      {t.codigo}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{t.nome}</h3>
                  <p className="text-sm text-gray-500">{curso?.nome || 'Curso Desconhecido'}</p>
                </div>
              );
            })}
            
            {dashboardData.turmas.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                Nenhuma turma ativa cadastrada.
              </div>
            )}
          </div>
        </div>

      </main>

      {showBuscaAluno && (
        <BuscaAlunoModal onClose={() => setShowBuscaAluno(false)} />
      )}
    </div>
  );
};
