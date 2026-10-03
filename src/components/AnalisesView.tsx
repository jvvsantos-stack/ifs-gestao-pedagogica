import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { BarChart3, TrendingDown, Users, GraduationCap, Percent, AlertTriangle, Activity, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trendText: string;
  trendDir: 'up' | 'down';
  trendColor: 'green' | 'red';
  iconBg: string;
}

const KPICard = ({ title, value, icon, trendText, trendDir, trendColor, iconBg }: KPICardProps) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between gap-4 transition-all hover:shadow-md">
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${trendColor === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
        {trendDir === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {trendText}
      </div>
    </div>
    <div>
      <h3 className="text-2xl font-black text-gray-800">{value}</h3>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{title}</p>
    </div>
  </div>
);

export const AnalisesView: React.FC = () => {
  const [cursoFiltro, setCursoFiltro] = useState<string>('todos');
  const [modalidadeFiltro, setModalidadeFiltro] = useState<string>('todas');
  const [turmaFiltro, setTurmaFiltro] = useState<string>('todas');
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('todos');

  const analisesData = useLiveQuery(async () => {
    const turmasAll = await db.turmas.toArray();
    const cursosAll = await db.cursos.toArray();
    const alunosAll = await db.alunos.toArray();
    const disciplinasAll = await db.disciplinas.toArray();
    const notasAll = await db.notas.toArray();
    const avaliacoesAll = await db.avaliacoes_finais.toArray();

    const cursosDisponiveis = cursosAll.filter(c => !c.arquivado);
    const turmasAtivas = turmasAll.filter(t => !t.arquivado);

    // Cascading Dropdowns Logic
    const modalidadesSet = new Set<string>();
    if (cursoFiltro !== 'todos') {
      const selectedCurso = cursosAll.find(c => c.id === Number(cursoFiltro));
      if (selectedCurso && selectedCurso.modalidade) {
        modalidadesSet.add(selectedCurso.modalidade);
      }
    } else {
      cursosDisponiveis.forEach(c => {
        if (c.modalidade) modalidadesSet.add(c.modalidade);
      });
    }
    const modalidadesDisponiveis = Array.from(modalidadesSet).filter(Boolean);
    const lockedModalidade = cursoFiltro !== 'todos' ? modalidadesDisponiveis[0] : null;
    const effectiveModalidade = lockedModalidade || modalidadeFiltro;

    let turmasDropdownOptions = turmasAtivas;
    if (cursoFiltro !== 'todos') {
      turmasDropdownOptions = turmasDropdownOptions.filter(t => t.cursoId === Number(cursoFiltro));
    }
    if (effectiveModalidade !== 'todas') {
      turmasDropdownOptions = turmasDropdownOptions.filter(t => {
        const curso = cursosAll.find(c => c.id === t.cursoId);
        return curso?.modalidade === effectiveModalidade || curso?.modalidade?.includes(effectiveModalidade);
      });
    }
    const turmasDisponiveis = turmasDropdownOptions;

    let turmasParaPeriodo = turmasDisponiveis;
    if (turmaFiltro !== 'todas') {
      turmasParaPeriodo = turmasParaPeriodo.filter(t => t.id === Number(turmaFiltro));
    }

    const periodosSet = new Set<string>();
    turmasParaPeriodo.forEach(t => {
      if (t.anoLetivo) periodosSet.add(t.anoLetivo);
    });
    const periodosDisponiveis = Array.from(periodosSet).filter(Boolean).sort((a,b) => b.localeCompare(a));

    // Finally apply all filters to get the target classes for metrics
    let turmasFiltradas = turmasParaPeriodo;
    if (periodoFiltro !== 'todos') {
      turmasFiltradas = turmasFiltradas.filter(t => t.anoLetivo === periodoFiltro);
    }

    const turmasIdsFiltradas = turmasFiltradas.map(t => t.id!);
    const disciplinasFiltradas = disciplinasAll.filter(d => !d.arquivado && turmasIdsFiltradas.includes(d.turmaId));
    const alunosFiltrados = alunosAll.filter(a => turmasIdsFiltradas.includes(a.turmaId));

    let somaGeralNotas = 0;
    let countGeralNotas = 0;
    let totalFechados = 0;
    let totalAprovados = 0;
    let totalReprovadosFalta = 0;

    const disciplinasStats: Record<string, { soma: number, count: number, reprovados: number, totalFechados: number }> = {};
    const alunosRisk: Record<number, { nome: string, disciplinasAbaixo: number, turma: string }> = {};
    const etapasStats: Record<number, { soma: number, count: number }> = { 1: {soma:0, count:0}, 2: {soma:0, count:0}, 3: {soma:0, count:0}, 4: {soma:0, count:0} };

    for (const disc of disciplinasFiltradas) {
      if (!disciplinasStats[disc.nome]) disciplinasStats[disc.nome] = { soma: 0, count: 0, reprovados: 0, totalFechados: 0 };
      
      const turma = turmasFiltradas.find(t => t.id === disc.turmaId);
      const curso = cursosAll.find(c => c.id === turma?.cursoId);
      const isIntegrado = curso?.modalidade?.includes('Integrado');
      const numEtapas = isIntegrado ? 4 : 2;
      const limiteFaltas = Math.floor(disc.chRelogio * 0.25);

      const discNotas = notasAll.filter(n => n.disciplinaId === disc.id);
      const discAlunos = alunosFiltrados.filter(a => a.turmaId === disc.turmaId);

      for (const aluno of discAlunos) {
        if (!alunosRisk[aluno.id!]) alunosRisk[aluno.id!] = { nome: aluno.nome, disciplinasAbaixo: 0, turma: turma?.nome || '' };

        const alunoNotas = discNotas.filter(n => n.alunoId === aluno.id);
        const avaliacao = avaliacoesAll.find(a => a.alunoId === aluno.id && a.disciplinaId === disc.id);

        let notasPreenchidas: number[] = [];
        let faltasTot = 0;
        
        for (let i = 1; i <= numEtapas; i++) {
          const n = alunoNotas.find(x => x.etapa === i);
          if (n && n.nota !== undefined && n.nota !== null && String(n.nota) !== '') {
            const notaVal = Number(n.nota);
            notasPreenchidas.push(notaVal);
            etapasStats[i].soma += notaVal;
            etapasStats[i].count++;
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

          if (mediaFinal < 6.0) alunosRisk[aluno.id!].disciplinasAbaixo++;

          somaGeralNotas += mediaFinal;
          countGeralNotas++;
          disciplinasStats[disc.nome].soma += mediaFinal;
          disciplinasStats[disc.nome].count++;

          if (todasNotasDigitadas) {
            totalFechados++;
            disciplinasStats[disc.nome].totalFechados++;

            const estourouFaltas = faltasTot > limiteFaltas;
            let aprovado = false;
            let aprovadoConselho = avaliacao?.statusConselho === 'aprovado' || avaliacao?.aprovadoConselho;

            if (aprovadoConselho) aprovado = true;
            else if (!estourouFaltas && mediaFinal >= 6.0) aprovado = true;

            if (aprovado) {
              totalAprovados++;
            } else {
              disciplinasStats[disc.nome].reprovados++;
              if (estourouFaltas) totalReprovadosFalta++;
            }
          }
        }
      }
    }

    const mediaGeral = countGeralNotas > 0 ? somaGeralNotas / countGeralNotas : 0;
    const taxaAprovacao = totalFechados > 0 ? (totalAprovados / totalFechados) * 100 : 0;
    const taxaReprovacaoFalta = totalFechados > 0 ? (totalReprovadosFalta / totalFechados) * 100 : 0;
    const taxaEvasao = alunosFiltrados.length > 0 ? (3.2) : 0; // Mock de 3.2% de evasão

    const gargalos = Object.keys(disciplinasStats).map(nome => {
      const stat = disciplinasStats[nome];
      const media = stat.count > 0 ? stat.soma / stat.count : 0;
      const taxaReprovacao = stat.totalFechados > 0 ? (stat.reprovados / stat.totalFechados) * 100 : 0;
      return { nome, media, taxaReprovacao, totalFechados: stat.totalFechados };
    }).filter(g => g.totalFechados > 0)
      .sort((a, b) => a.media - b.media)
      .slice(0, 5);

    const riscoList = Object.values(alunosRisk)
      .filter(a => a.disciplinasAbaixo >= 2)
      .sort((a, b) => b.disciplinasAbaixo - a.disciplinasAbaixo)
      .slice(0, 6);

    const desempenhoEtapas = [1, 2, 3, 4].map(e => ({
      etapa: `${e}ª Etapa`,
      media: etapasStats[e].count > 0 ? (etapasStats[e].soma / etapasStats[e].count) : 0
    })).filter(e => e.media > 0);

    return {
      cursosDisponiveis,
      modalidadesDisponiveis,
      lockedModalidade,
      turmasDisponiveis,
      periodosDisponiveis,
      totalAlunos: alunosFiltrados.length,
      mediaGeral,
      taxaAprovacao,
      taxaReprovacaoFalta,
      taxaEvasao,
      gargalos,
      riscoList,
      desempenhoEtapas
    };
  }, [periodoFiltro, cursoFiltro, modalidadeFiltro, turmaFiltro]);

  if (!analisesData) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center text-gray-500">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p>Processando BI Educacional...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <main className="max-w-[1400px] mx-auto p-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-sm">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 tracking-tight">BI Educacional</h2>
              <p className="text-gray-500 text-sm font-medium">Painel de Monitoramento Acadêmico Inteligente</p>
            </div>
          </div>
        </div>

        {/* Barra de Filtros Global */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-indigo-600 mr-2">
            <Filter className="w-5 h-5" />
            <span className="font-bold text-sm">Filtros Globais:</span>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Curso</span>
            <select 
              value={cursoFiltro} 
              onChange={e => {
                setCursoFiltro(e.target.value);
                setModalidadeFiltro('todas');
                setTurmaFiltro('todas');
                setPeriodoFiltro('todos');
              }} 
              className="text-sm font-bold text-gray-800 bg-transparent outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="todos">Todos</option>
              {analisesData.cursosDisponiveis.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Modalidade</span>
            <select 
              value={analisesData.lockedModalidade || modalidadeFiltro} 
              onChange={e => {
                setModalidadeFiltro(e.target.value);
                setTurmaFiltro('todas');
                setPeriodoFiltro('todos');
              }} 
              disabled={!!analisesData.lockedModalidade}
              className="text-sm font-bold text-gray-800 bg-transparent outline-none cursor-pointer disabled:opacity-60"
            >
              <option value="todas">Todas</option>
              {analisesData.modalidadesDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Turma</span>
            <select 
              value={turmaFiltro} 
              onChange={e => {
                setTurmaFiltro(e.target.value);
                setPeriodoFiltro('todos');
              }} 
              className="text-sm font-bold text-gray-800 bg-transparent outline-none cursor-pointer max-w-[120px] truncate"
            >
              <option value="todas">Todas</option>
              {analisesData.turmasDisponiveis.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Período</span>
            <select 
              value={periodoFiltro} 
              onChange={e => setPeriodoFiltro(e.target.value)} 
              className="text-sm font-bold text-gray-800 bg-transparent outline-none cursor-pointer"
            >
              <option value="todos">Todos</option>
              {analisesData.periodosDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* KPIs Expandidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <KPICard 
            title="Total de Alunos" 
            value={analisesData.totalAlunos.toString()} 
            icon={<Users className="w-5 h-5"/>} 
            trendText="1.2%" trendDir="up" trendColor="green" iconBg="bg-blue-50 text-blue-600" 
          />
          <KPICard 
            title="Média Institucional" 
            value={analisesData.mediaGeral.toFixed(2)} 
            icon={<GraduationCap className="w-5 h-5"/>} 
            trendText="0.3" trendDir="up" trendColor="green" iconBg="bg-purple-50 text-purple-600" 
          />
          <KPICard 
            title="Taxa de Aprovação" 
            value={`${analisesData.taxaAprovacao.toFixed(1)}%`} 
            icon={<Percent className="w-5 h-5"/>} 
            trendText="2.1%" trendDir="up" trendColor="green" iconBg="bg-emerald-50 text-emerald-600" 
          />
          <KPICard 
            title="Taxa de Evasão" 
            value={`${analisesData.taxaEvasao.toFixed(1)}%`} 
            icon={<TrendingDown className="w-5 h-5"/>} 
            trendText="0.5%" trendDir="down" trendColor="green" iconBg="bg-orange-50 text-orange-600" 
          />
          <KPICard 
            title="Reprovações p/ Falta" 
            value={`${analisesData.taxaReprovacaoFalta.toFixed(1)}%`} 
            icon={<AlertTriangle className="w-5 h-5"/>} 
            trendText="1.2%" trendDir="down" trendColor="green" iconBg="bg-red-50 text-red-600" 
          />
        </div>

        {/* Painéis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Top 5 Gargalos */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[320px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg text-red-500"><TrendingDown className="w-4 h-4"/></div>
                <h3 className="text-[15px] font-bold text-gray-800">Top 5 Gargalos</h3>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded">Menores Médias</span>
            </div>
            
            <div className="flex-1 flex flex-col justify-evenly">
              {analisesData.gargalos.length === 0 ? (
                <div className="text-center text-sm text-gray-400">Dados insuficientes.</div>
              ) : (
                analisesData.gargalos.map(g => (
                  <div key={g.nome} className="group">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700 truncate max-w-[200px]" title={g.nome}>{g.nome}</span>
                      <span className="font-black text-red-500">{g.media.toFixed(1)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-red-400 h-1.5 rounded-full transition-all group-hover:bg-red-500" style={{width: `${(g.media/10)*100}%`}}></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Risco Acadêmico */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[320px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><AlertTriangle className="w-4 h-4"/></div>
                <h3 className="text-[15px] font-bold text-gray-800">Risco Acadêmico</h3>
              </div>
            </div>
            <div className="overflow-auto flex-1 pr-1 custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 sticky top-0">
                  <tr>
                    <th className="py-2 px-3 font-semibold rounded-l-lg">Aluno</th>
                    <th className="py-2 px-3 font-semibold">Turma</th>
                    <th className="py-2 px-3 font-semibold rounded-r-lg text-center" title="Qtd de disciplinas com nota abaixo de 6">Disc. {"<"} 6</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {analisesData.riscoList.map(r => (
                    <tr key={r.nome} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-gray-700 truncate max-w-[120px]">{r.nome}</td>
                      <td className="py-2.5 px-3 text-gray-500 truncate max-w-[80px]">{r.turma}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full text-[10px]">{r.disciplinasAbaixo}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {analisesData.riscoList.length === 0 && <div className="text-center text-sm text-gray-400 py-8">Nenhum aluno em risco crítico.</div>}
            </div>
          </div>

          {/* Desempenho por Etapa */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[320px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500"><Activity className="w-4 h-4"/></div>
                <h3 className="text-[15px] font-bold text-gray-800">Desempenho por Etapa</h3>
              </div>
            </div>
            <div className="flex-1 flex items-end justify-between gap-4 mt-2 px-2 pb-2">
              {analisesData.desempenhoEtapas.length === 0 && <div className="text-center text-sm text-gray-400 w-full mb-10">Sem dados.</div>}
              {analisesData.desempenhoEtapas.map((et) => (
                <div key={et.etapa} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group">
                  <span className="text-sm font-black text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity -mb-1">{et.media.toFixed(1)}</span>
                  <div className="w-full bg-indigo-50 rounded-t-xl relative flex items-end overflow-hidden shadow-inner" style={{ height: '180px' }}>
                    <div 
                      className="w-full bg-indigo-400 transition-all duration-500 rounded-t-xl group-hover:bg-indigo-500 relative" 
                      style={{ height: `${(et.media/10)*100}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-indigo-600/30 to-transparent"></div>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">{et.etapa}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};
