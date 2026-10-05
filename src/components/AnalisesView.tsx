import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { BarChart3, TrendingDown, TrendingUp, Users, GraduationCap, Percent, AlertTriangle, Activity, ArrowUpRight, ArrowDownRight, Filter, FileText, Printer, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { useReactToPrint } from 'react-to-print';
import { RelatorioAnaliticoPrint } from './RelatorioAnaliticoPrint';

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
  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between gap-4 transition-all hover:shadow-md dark:text-slate-100">
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${trendColor === 'green' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600'}`}>
        {trendDir === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {trendText}
      </div>
    </div>
    <div>
      <h3 className="text-2xl font-black text-gray-800 dark:text-slate-200">{value}</h3>
      <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{title}</p>
    </div>
  </div>
);

const generateAutomatedInsights = (analisesData: any) => {
  const paragrafos: string[] = [];

  // Regra 1 (Gargalo)
  if (analisesData.gargalos && analisesData.gargalos.length > 0) {
    const pior = analisesData.gargalos[0];
    paragrafos.push(`A disciplina ${pior.nome} apresenta o menor rendimento médio (${pior.media.toFixed(1)}), configurando o principal gargalo acadêmico deste recorte.`);
  }

  // Regra 2 (Saúde da Turma)
  if (analisesData.taxaAprovacao < 60) {
    paragrafos.push(`Atenção: Apenas ${analisesData.taxaAprovacao.toFixed(1)}% dos alunos estão com a situação regularizada (aprovados). Recomenda-se acompanhamento pedagógico imediato.`);
  } else if (analisesData.taxaAprovacao >= 80) {
    paragrafos.push(`O desempenho global é satisfatório, com ${analisesData.taxaAprovacao.toFixed(1)}% de alunos regularizados (aprovados).`);
  } else {
    paragrafos.push(`O percentual de aprovação atual é de ${analisesData.taxaAprovacao.toFixed(1)}%, indicando um cenário de regularidade com espaço para intervenções focais.`);
  }

  // Regra 3 (Destaque)
  if (analisesData.melhoresDisciplinas && analisesData.melhoresDisciplinas.length > 0) {
    const melhor = analisesData.melhoresDisciplinas[0];
    paragrafos.push(`O destaque positivo fica para a disciplina ${melhor.nome}, que atingiu a maior média consolidada (${melhor.media.toFixed(1)}).`);
  }

  // Complemento (Distribuição)
  const criticos = analisesData.dadosDistribuicao.find((d: any) => d.name === 'Crítico')?.value || 0;
  if (criticos > 0) {
    const percentCritico = analisesData.totalAlunos > 0 ? ((criticos / analisesData.totalAlunos) * 100).toFixed(1) : "0";
    paragrafos.push(`Há um grupo de ${criticos} alunos (${percentCritico}%) em situação crítica de notas (média global < 4.0), que demanda atenção redobrada do conselho de classe.`);
  }

  return paragrafos.join('\n\n');
};

export const AnalisesView: React.FC = () => {
  const [cursoFiltro, setCursoFiltro] = useState<string>('todos');
  const [modalidadeFiltro, setModalidadeFiltro] = useState<string>('todas');
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('todos');
  const [turmaFiltro, setTurmaFiltro] = useState<string>('todas');

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [parecerEditavel, setParecerEditavel] = useState('');

  const reportPrintRef = React.useRef<HTMLDivElement>(null);
  const handlePrintReport = useReactToPrint({
    content: () => reportPrintRef.current,
    documentTitle: 'Relatorio_Analise_Pedagogica',
  });

  const rawData = useLiveQuery(async () => {
    const turmasAll = await db.turmas.toArray();
    const cursosAll = await db.cursos.toArray();
    const alunosAll = await db.alunos.toArray();
    const disciplinasAll = await db.disciplinas.toArray();
    const notasAll = await db.notas.toArray();
    const avaliacoesAll = await db.avaliacoes_finais.toArray();

    return { turmasAll, cursosAll, alunosAll, disciplinasAll, notasAll, avaliacoesAll };
  });

  const analisesData = React.useMemo(() => {
    if (!rawData) return null;
    const { turmasAll, cursosAll, alunosAll, disciplinasAll, notasAll, avaliacoesAll } = rawData;

    const cursosDisponiveis = cursosAll.filter(c => !c.arquivado);
    const turmasAtivas = turmasAll.filter(t => !t.arquivado);

    // Cascading Dropdowns Logic
    // Nível 1: Curso -> Modalidade
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

    // Turmas filtradas pelo Nível 1
    let turmasBase = turmasAtivas;
    if (cursoFiltro !== 'todos') {
      turmasBase = turmasBase.filter(t => t.cursoId === Number(cursoFiltro));
    }
    if (effectiveModalidade !== 'todas') {
      turmasBase = turmasBase.filter(t => {
        const curso = cursosAll.find(c => c.id === t.cursoId);
        return curso?.modalidade === effectiveModalidade || curso?.modalidade?.includes(effectiveModalidade);
      });
    }

    // Nível 2: Período (Derivado do Nível 1)
    const periodosSet = new Set<string>();
    turmasBase.forEach(t => {
      if (t.anoLetivo) periodosSet.add(t.anoLetivo);
    });
    const periodosDisponiveis = Array.from(periodosSet).filter(Boolean).sort((a,b) => b.localeCompare(a));

    // Nível 3: Turma (Derivado do Nível 1 e Nível 2)
    let turmasDropdownOptions = turmasBase;
    if (periodoFiltro !== 'todos') {
      turmasDropdownOptions = turmasDropdownOptions.filter(t => t.anoLetivo === periodoFiltro);
    }
    const turmasDisponiveis = turmasDropdownOptions;

    // Aplicação final de todos os filtros para as métricas
    let turmasFiltradas = turmasDisponiveis;
    if (turmaFiltro !== 'todas') {
      turmasFiltradas = turmasFiltradas.filter(t => t.id === Number(turmaFiltro));
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
    const alunosGlobalStats: Record<number, { somaMedias: number, countMedias: number }> = {};

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

          if (!alunosGlobalStats[aluno.id!]) alunosGlobalStats[aluno.id!] = { somaMedias: 0, countMedias: 0 };
          alunosGlobalStats[aluno.id!].somaMedias += mediaFinal;
          alunosGlobalStats[aluno.id!].countMedias++;

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

    const distribuicaoNotas = { critico: 0, recuperacao: 0, naMedia: 0, excelente: 0 };
    Object.values(alunosGlobalStats).forEach(stat => {
      const globalAvg = stat.somaMedias / stat.countMedias;
      if (globalAvg < 4.0) distribuicaoNotas.critico++;
      else if (globalAvg < 6.0) distribuicaoNotas.recuperacao++;
      else if (globalAvg < 9.0) distribuicaoNotas.naMedia++;
      else distribuicaoNotas.excelente++;
    });

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

    const melhoresDisciplinas = Object.keys(disciplinasStats).map(nome => {
      const stat = disciplinasStats[nome];
      const media = stat.count > 0 ? stat.soma / stat.count : 0;
      const taxaReprovacao = stat.totalFechados > 0 ? (stat.reprovados / stat.totalFechados) * 100 : 0;
      return { nome, media, taxaReprovacao, totalFechados: stat.totalFechados };
    }).filter(g => g.totalFechados > 0)
      .sort((a, b) => b.media - a.media)
      .slice(0, 5);

    const riscoList = Object.values(alunosRisk)
      .filter(a => a.disciplinasAbaixo >= 2)
      .sort((a, b) => b.disciplinasAbaixo - a.disciplinasAbaixo)
      .slice(0, 6);

    const desempenhoEtapas = [1, 2, 3, 4].map(e => ({
      etapa: `${e}ª Etapa`,
      media: Number((etapasStats[e].count > 0 ? (etapasStats[e].soma / etapasStats[e].count) : 0).toFixed(1))
    })).filter(e => e.media > 0);

    const dadosDistribuicao = [
      { name: 'Crítico', value: distribuicaoNotas.critico, color: '#ef4444' },
      { name: 'Recup.', value: distribuicaoNotas.recuperacao, color: '#f59e0b' },
      { name: 'Na Média', value: distribuicaoNotas.naMedia, color: '#6366f1' },
      { name: 'Excelente', value: distribuicaoNotas.excelente, color: '#10b981' }
    ];

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
      melhoresDisciplinas,
      riscoList,
      desempenhoEtapas,
      dadosDistribuicao
    };
  }, [rawData, periodoFiltro, cursoFiltro, modalidadeFiltro, turmaFiltro]);

  if (!analisesData) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="flex flex-col items-center text-gray-500 dark:text-slate-400">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p>Processando Inteligência Pedagógica...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <main className="max-w-[1400px] mx-auto p-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-sm">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-200 tracking-tight">Inteligência Pedagógica</h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Painel de Monitoramento Acadêmico Inteligente</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setParecerEditavel(generateAutomatedInsights(analisesData));
              setIsReportModalOpen(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors"
          >
            <FileText className="w-4 h-4" />
            Gerar Relatório Executivo (PDF)
          </button>
        </div>

        {/* Barra de Filtros Global */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-wrap items-center gap-4 mb-6 dark:text-slate-100">
          <div className="flex items-center gap-2 text-indigo-600 mr-2">
            <Filter className="w-5 h-5" />
            <span className="font-bold text-sm">Filtros Globais:</span>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-indigo-300 transition-colors">
            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Curso</span>
            <select 
              value={cursoFiltro} 
              onChange={e => {
                setCursoFiltro(e.target.value);
                setModalidadeFiltro('todas');
                setPeriodoFiltro('todos');
                setTurmaFiltro('todas');
              }} 
              className="text-sm font-bold text-gray-800 dark:text-slate-100 bg-transparent dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-600 outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="todos">Todos</option>
              {analisesData.cursosDisponiveis.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-indigo-300 transition-colors">
            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Modalidade</span>
            <select 
              value={analisesData.lockedModalidade || modalidadeFiltro} 
              onChange={e => {
                setModalidadeFiltro(e.target.value);
                setPeriodoFiltro('todos');
                setTurmaFiltro('todas');
              }} 
              disabled={!!analisesData.lockedModalidade}
              className="text-sm font-bold text-gray-800 dark:text-slate-100 bg-transparent dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-600 outline-none cursor-pointer disabled:opacity-60"
            >
              <option value="todas">Todas</option>
              {analisesData.modalidadesDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-indigo-300 transition-colors">
            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Período</span>
            <select 
              value={periodoFiltro} 
              onChange={e => {
                setPeriodoFiltro(e.target.value);
                setTurmaFiltro('todas');
              }} 
              className="text-sm font-bold text-gray-800 dark:text-slate-100 bg-transparent dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-600 outline-none cursor-pointer"
            >
              <option value="todos">Todos</option>
              {analisesData.periodosDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-indigo-300 transition-colors">
            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Turma</span>
            <select 
              value={turmaFiltro} 
              onChange={e => setTurmaFiltro(e.target.value)} 
              className="text-sm font-bold text-gray-800 dark:text-slate-100 bg-transparent dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-600 outline-none cursor-pointer max-w-[120px] truncate"
            >
              <option value="todas">Todas</option>
              {analisesData.turmasDisponiveis.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
        </div>

        {/* KPIs Expandidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <KPICard 
            title="Total de Alunos" 
            value={analisesData.totalAlunos.toString()} 
            icon={<Users className="w-5 h-5"/>} 
            trendText="1.2%" trendDir="up" trendColor="green" iconBg="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
          />
          <KPICard 
            title="Média Institucional" 
            value={analisesData.mediaGeral.toFixed(2)} 
            icon={<GraduationCap className="w-5 h-5"/>} 
            trendText="0.3" trendDir="up" trendColor="green" iconBg="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" 
          />
          <KPICard 
            title="Taxa de Aprovação" 
            value={`${analisesData.taxaAprovacao.toFixed(1)}%`} 
            icon={<Percent className="w-5 h-5"/>} 
            trendText="2.1%" trendDir="up" trendColor="green" iconBg="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" 
          />
          <KPICard 
            title="Taxa de Evasão" 
            value={`${analisesData.taxaEvasao.toFixed(1)}%`} 
            icon={<TrendingDown className="w-5 h-5"/>} 
            trendText="0.5%" trendDir="down" trendColor="green" iconBg="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" 
          />
          <KPICard 
            title="Reprovações p/ Falta" 
            value={`${analisesData.taxaReprovacaoFalta.toFixed(1)}%`} 
            icon={<AlertTriangle className="w-5 h-5"/>} 
            trendText="1.2%" trendDir="down" trendColor="green" iconBg="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" 
          />
        </div>

        {/* Painéis */}
        {/* Linha 1: Tops e Risco */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Top 5 Gargalos */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[320px] dark:text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-500 dark:text-red-400"><TrendingDown className="w-4 h-4"/></div>
                <h3 className="text-[15px] font-bold text-gray-800 dark:text-slate-200">Top 5 Gargalos</h3>
              </div>
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest bg-gray-50 dark:bg-slate-900 px-2 py-1 rounded">Menores Médias</span>
            </div>
            
            <div className="flex-1 flex flex-col justify-evenly">
              {analisesData.gargalos.length === 0 ? (
                <div className="text-center text-sm text-gray-400 dark:text-slate-500">Dados insuficientes.</div>
              ) : (
                analisesData.gargalos.map(g => (
                  <div key={g.nome} className="group">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700 dark:text-slate-300 truncate max-w-[200px]" title={g.nome}>{g.nome}</span>
                      <span className="font-black text-red-500 dark:text-red-400">{g.media.toFixed(1)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-red-400 h-1.5 rounded-full transition-all group-hover:bg-red-500" style={{width: `${(g.media/10)*100}%`}}></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top 5 Melhores Disciplinas */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[320px] dark:text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-500 dark:text-emerald-400"><TrendingUp className="w-4 h-4"/></div>
                <h3 className="text-[15px] font-bold text-gray-800 dark:text-slate-200">Top 5 Melhores</h3>
              </div>
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest bg-gray-50 dark:bg-slate-900 px-2 py-1 rounded">Maiores Médias</span>
            </div>
            
            <div className="flex-1 flex flex-col justify-evenly">
              {analisesData.melhoresDisciplinas.length === 0 ? (
                <div className="text-center text-sm text-gray-400 dark:text-slate-500">Dados insuficientes.</div>
              ) : (
                analisesData.melhoresDisciplinas.map(g => (
                  <div key={g.nome} className="group">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700 dark:text-slate-300 truncate max-w-[200px]" title={g.nome}>{g.nome}</span>
                      <span className="font-black text-emerald-500 dark:text-emerald-400">{g.media.toFixed(1)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-400 h-1.5 rounded-full transition-all group-hover:bg-emerald-500" style={{width: `${(g.media/10)*100}%`}}></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Risco Acadêmico */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[320px] dark:text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400"><AlertTriangle className="w-4 h-4"/></div>
                <h3 className="text-[15px] font-bold text-gray-800 dark:text-slate-200">Risco Acadêmico</h3>
              </div>
            </div>
            <div className="overflow-auto flex-1 pr-1 custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-slate-400 sticky top-0">
                  <tr>
                    <th className="py-2 px-3 font-semibold rounded-l-lg">Aluno</th>
                    <th className="py-2 px-3 font-semibold">Turma</th>
                    <th className="py-2 px-3 font-semibold rounded-r-lg text-center" title="Qtd de disciplinas com nota abaixo de 6">Disc. {"<"} 6</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {analisesData.riscoList.map(r => (
                    <tr key={r.nome} className="hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-slate-100 truncate max-w-[120px]" title={r.nome}>{r.nome.split('(')[0].trim()}</td>
                      <td className="py-2.5 px-3 font-medium text-gray-800 dark:text-slate-200 truncate max-w-[80px]">{r.turma}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 dark:border dark:border-red-800 font-bold px-2 py-0.5 rounded-full text-[10px]">{r.disciplinasAbaixo}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {analisesData.riscoList.length === 0 && <div className="text-center text-sm text-gray-400 dark:text-slate-500 py-8">Nenhum aluno em risco crítico.</div>}
            </div>
          </div>
        </div>

        {/* Linha 2: Gráficos de Evolução e Distribuição */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Desempenho por Etapa (Line Chart) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[350px] dark:text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-500"><Activity className="w-4 h-4"/></div>
                <h3 className="text-[15px] font-bold text-gray-800 dark:text-slate-200">Desempenho por Etapa</h3>
              </div>
            </div>
            <div className="flex-1 mt-2">
              {analisesData.desempenhoEtapas.length === 0 ? (
                <div className="text-center text-sm text-gray-400 dark:text-slate-500 w-full h-full flex items-center justify-center">Sem dados.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analisesData.desempenhoEtapas} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="etapa" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} width={30} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#4b5563', fontWeight: 'bold', marginBottom: '4px' }}
                      itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="media" name="Média Geral" stroke="#4f46e5" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 7, strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Distribuição de Notas (Bar Chart) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[350px] dark:text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500"><BarChart3 className="w-4 h-4"/></div>
                <h3 className="text-[15px] font-bold text-gray-800 dark:text-slate-200">Distribuição de Notas</h3>
              </div>
            </div>
            <div className="flex-1 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analisesData.dadosDistribuicao} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: '500' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} width={30} />
                  <Tooltip 
                    cursor={{fill: '#f9fafb'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 'bold', color: '#374151' }}
                  />
                  <Bar dataKey="value" name="Alunos" radius={[6, 6, 0, 0]}>
                    {
                      analisesData.dadosDistribuicao.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      {/* Modal Relatório */}
      {isReportModalOpen && analisesData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Relatório Executivo Automático
              </h2>
              <button onClick={() => setIsReportModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Parecer Pedagógico Editável</label>
                <textarea 
                  className="w-full h-64 p-4 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-100 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none custom-scrollbar"
                  value={parecerEditavel}
                  onChange={(e) => setParecerEditavel(e.target.value)}
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">Você pode revisar e adicionar anotações humanas antes de gerar o PDF. Este texto será incluído no documento final.</p>
              </div>

              {/* Componente Invisível para Impressão */}
              <div style={{ display: 'none' }}>
                <RelatorioAnaliticoPrint 
                  ref={reportPrintRef}
                  filtros={{
                    curso: cursoFiltro === 'todos' ? 'Todos os Cursos' : analisesData.cursosDisponiveis.find(c => c.id === Number(cursoFiltro))?.nome || '',
                    modalidade: analisesData.lockedModalidade || modalidadeFiltro,
                    periodo: periodoFiltro,
                    turma: turmaFiltro === 'todas' ? 'Todas as Turmas' : analisesData.turmasDisponiveis.find(t => t.id === Number(turmaFiltro))?.nome || ''
                  }}
                  kpis={{
                    totalAlunos: analisesData.totalAlunos,
                    mediaGeral: analisesData.mediaGeral,
                    taxaAprovacao: analisesData.taxaAprovacao,
                    taxaEvasao: analisesData.taxaEvasao
                  }}
                  parecerTexto={parecerEditavel}
                />
              </div>

            </div>

            <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3 bg-gray-50 dark:bg-slate-800/50 rounded-b-2xl">
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handlePrintReport as any}
                className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir / Salvar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  );
};
