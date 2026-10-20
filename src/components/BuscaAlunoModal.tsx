import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import {
  Search,
  X,
  AlertTriangle,
  GraduationCap,
  ClipboardList,
  Briefcase,
  Gavel,
  Wallet,
  Printer,
  ChevronDown,
  Archive,
  Loader2,
  CheckSquare,
  Download,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { RelatorioPedagogicoPrint } from './RelatorioPedagogicoPrint';

interface BuscaAlunoModalProps {
  onClose: () => void;
}

// Função utilitária para converter um elemento HTML no Blob de PDF individual em alta resolução
async function generatePdfBlob(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 794,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let pageIndex = 0;

  // Página 1
  pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Páginas subsequentes (caso o relatório ultrapasse 1 página)
  while (heightLeft > 0) {
    pageIndex++;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, -(pageIndex * pageHeight), imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return pdf.output('blob');
}

// Cálculo unificado dos dados pedagógicos do aluno para tela e relatório impresso/PDF
function calculateAlunoRaioXData(
  aluno: any,
  turmasAll: any[],
  cursosAll: any[],
  disciplinasAll: any[],
  notasAll: any[],
  avaliacoesAll: any[],
  ocorrenciasAll: any[],
  estagiosAll: any[],
  responsavelNome: string
) {
  const turma = turmasAll.find((t: any) => t.id === aluno.turmaId);
  const curso = cursosAll.find((c: any) => c.id === turma?.cursoId);
  const disciplinas = disciplinasAll.filter((d: any) => d.turmaId === aluno.turmaId);
  const ocorrenciasDoAluno = ocorrenciasAll.filter((o: any) => o.alunoId === aluno.id);
  const estagio = estagiosAll.find((e: any) => e.alunoId === aluno.id);
  const isSubsequente = curso?.modalidade?.includes('Subsequente');
  const numEtapas = isSubsequente ? 2 : 4;

  let somaMediasGlobais = 0;
  let countDisciplinasAvaliadas = 0;
  let pendenciasCount = 0;
  let hasRiscoFaltas = false;
  let totalCargaHoraria = 0;
  let totalFaltasGlobal = 0;

  const boletim = disciplinas.map((disc: any) => {
    const limiteFaltas = Math.floor(disc.chRelogio * 0.25);
    const notasDisc = notasAll.filter((n: any) => n.alunoId === aluno.id && n.disciplinaId === disc.id);
    const af = avaliacoesAll.find((a: any) => a.alunoId === aluno.id && a.disciplinaId === disc.id);

    let faltas = 0;
    const notasEtapas: (number | null)[] = Array(numEtapas).fill(null);
    let notasPreenchidas = 0;
    let somaNotas = 0;

    for (let i = 1; i <= numEtapas; i++) {
      const n = notasDisc.find((x: any) => x.etapa === i);
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

  let conselhoGlobal: string | null = null;
  const disciplinasEmConselho = boletim.filter((b: any) => b.af?.statusConselho || b.af?.aprovadoConselho);
  if (disciplinasEmConselho.length > 0) {
    const hasReprovacao = disciplinasEmConselho.some((b: any) => b.af?.statusConselho === 'reprovado' || (b.af?.statusConselho === undefined && !b.af?.aprovadoConselho && b.situacao.includes('Reprovado (Conselho)')));
    conselhoGlobal = hasReprovacao ? 'Reprovado pelo Conselho' : 'Aprovado pelo Conselho';
  }

  return {
    aluno,
    turma,
    curso,
    disciplinas,
    boletim,
    estagio,
    ocorrencias: ocorrenciasDoAluno,
    ocorrenciasDoAluno,
    mediaGeral,
    pendenciasCount,
    hasRiscoFaltas,
    isPeDeMeiaApto,
    freqGlobal,
    conselhoGlobal,
    numEtapas,
    responsavelNome,
    totalFaltasGlobal,
  };
}

export const BuscaAlunoModal: React.FC<BuscaAlunoModalProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedCursoId, setSelectedCursoId] = useState<number | ''>('');
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('');
  const [selectedTurmaId, setSelectedTurmaId] = useState<number | ''>('');
  const [selectedAlunoId, setSelectedAlunoId] = useState<number | ''>('');

  // Estado para múltiplos alunos selecionados para geração de PDF em lote
  const [selectedAlunosForPdf, setSelectedAlunosForPdf] = useState<number[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');

  // Estados para geração em lote do arquivo ZIP
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; alunoNome: string } | null>(null);
  const [batchStatusMessage, setBatchStatusMessage] = useState<string>('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  const turmasAll = useLiveQuery(() => db.turmas.toArray()) || [];
  const alunosAll = useLiveQuery(() => db.alunos.toArray()) || [];
  const cursosAll = useLiveQuery(() => db.cursos.toArray()) || [];
  const disciplinasAll = useLiveQuery(() => db.disciplinas.toArray()) || [];
  const notasAll = useLiveQuery(() => db.notas.toArray()) || [];
  const avaliacoesAll = useLiveQuery(() => db.avaliacoes_finais.toArray()) || [];
  const ocorrenciasAll = useLiveQuery(() => db.ocorrencias.toArray()) || [];
  const estagiosAll = useLiveQuery(() => db.estagios.toArray()) || [];

  const responsavelNome = useMemo(() => {
    return localStorage.getItem('usuarioLogado')
      ? JSON.parse(localStorage.getItem('usuarioLogado') || '{}').nome
      : 'Servidor(a)';
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Limpeza em cascata
  useEffect(() => {
    setSelectedPeriodo('');
    setSelectedTurmaId('');
    setSelectedAlunoId('');
    setSelectedAlunosForPdf([]);
  }, [selectedCursoId]);

  useEffect(() => {
    setSelectedTurmaId('');
    setSelectedAlunoId('');
    setSelectedAlunosForPdf([]);
  }, [selectedPeriodo]);

  useEffect(() => {
    setSelectedAlunoId('');
    setSelectedAlunosForPdf([]);
    setDropdownSearch('');
  }, [selectedTurmaId]);

  const periodosDisponiveis = useMemo(() => {
    if (!selectedCursoId) return [];
    const turmasDoCurso = turmasAll.filter(t => t.cursoId === Number(selectedCursoId));
    const periodos = turmasDoCurso.map(t => t.anoLetivo).filter(Boolean) as string[];
    return Array.from(new Set(periodos)).sort();
  }, [selectedCursoId, turmasAll]);

  const turmasDisponiveis = useMemo(() => {
    if (!selectedCursoId || !selectedPeriodo) return [];
    return turmasAll.filter(t => t.cursoId === Number(selectedCursoId) && t.anoLetivo === selectedPeriodo && !t.arquivado);
  }, [selectedCursoId, selectedPeriodo, turmasAll]);

  const alunosDisponiveis = useMemo(() => {
    if (!selectedTurmaId) return [];
    return alunosAll.filter(a => a.turmaId === Number(selectedTurmaId)).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [selectedTurmaId, alunosAll]);

  const alunosDropdownFiltered = useMemo(() => {
    if (!dropdownSearch.trim()) return alunosDisponiveis;
    return alunosDisponiveis.filter(a => a.nome.toLowerCase().includes(dropdownSearch.toLowerCase()));
  }, [alunosDisponiveis, dropdownSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
  };

  const toggleAlunoForPdf = (id: number) => {
    setSelectedAlunosForPdf(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllForPdf = () => {
    const allIds = alunosDisponiveis
      .map(a => a.id)
      .filter((id): id is number => typeof id === 'number');
    setSelectedAlunosForPdf(allIds);
  };

  const handleClearSelectedForPdf = () => {
    setSelectedAlunosForPdf([]);
  };

  // Geração em lote dos PDFs empacotados em um único arquivo ZIP
  const handleBatchGeneratePdfs = async () => {
    if (selectedAlunosForPdf.length === 0 || isGeneratingBatch) return;

    setIsGeneratingBatch(true);
    setBatchProgress({ current: 0, total: selectedAlunosForPdf.length, alunoNome: 'Iniciando preparação...' });
    setBatchStatusMessage(`Preparando lote de ${selectedAlunosForPdf.length} relatórios...`);

    try {
      // Intervalo inicial para garantir a renderização estável dos nós no DOM
      await new Promise(resolve => setTimeout(resolve, 300));

      const zip = new JSZip();

      for (let i = 0; i < selectedAlunosForPdf.length; i++) {
        const alunoId = selectedAlunosForPdf[i];
        const aluno = alunosAll.find(a => a.id === alunoId);
        if (!aluno) continue;

        setBatchProgress({
          current: i + 1,
          total: selectedAlunosForPdf.length,
          alunoNome: aluno.nome,
        });
        setBatchStatusMessage(`Gerando relatório ${i + 1} de ${selectedAlunosForPdf.length}: ${aluno.nome}`);

        // Pequeno intervalo para permitir atualização de estado suave na interface
        await new Promise(resolve => setTimeout(resolve, 80));

        const containerEl = document.getElementById(`batch-pdf-aluno-${aluno.id}`);
        if (!containerEl) {
          console.warn(`Elemento para o aluno ${aluno.nome} (ID: ${aluno.id}) não encontrado no DOM.`);
          continue;
        }

        const pdfBlob = await generatePdfBlob(containerEl);
        const safeNome = aluno.nome
          .trim()
          .replace(/\s+/g, '_')
          .replace(/[/\\?%*:|"<>]/g, '');

        zip.file(`RaioX_${safeNome}.pdf`, pdfBlob);
      }

      setBatchStatusMessage('Compactando todos os arquivos no pacote ZIP...');
      await new Promise(resolve => setTimeout(resolve, 150));

      const zipContent = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      saveAs(zipContent, 'Relatorios_Pedagogicos.zip');

      setBatchStatusMessage('Concluído! O download de Relatorios_Pedagogicos.zip foi iniciado.');
      await new Promise(resolve => setTimeout(resolve, 1200));
    } catch (error) {
      console.error('Erro na geração em lote de PDFs:', error);
      alert('Ocorreu um erro durante a geração dos relatórios em lote. Verifique o console para mais detalhes.');
    } finally {
      setIsGeneratingBatch(false);
      setBatchProgress(null);
      setBatchStatusMessage('');
    }
  };

  const alunosFiltrados = alunosAll.filter(a => {
    if (!hasSearched) return false;

    // Se o aluno foi escolhido no dropdown Nível 4, ignora todos os outros filtros (raio-x direto)
    if (selectedAlunoId) return a.id === Number(selectedAlunoId);

    const matchName = searchTerm ? a.nome.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    const matchTurma = selectedTurmaId ? a.turmaId === Number(selectedTurmaId) : true;

    // Filtros superiores só são checados se a Turma não estiver selecionada
    const turmaDoAluno = turmasAll.find(t => t.id === a.turmaId);
    const matchPeriodo = selectedPeriodo && !selectedTurmaId ? turmaDoAluno?.anoLetivo === selectedPeriodo : true;
    const matchCurso = selectedCursoId && !selectedTurmaId ? turmaDoAluno?.cursoId === Number(selectedCursoId) : true;

    return matchName && matchTurma && matchPeriodo && matchCurso;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden dark:text-slate-100">

        {/* Header Fixo */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/80 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 shrink-0">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600" />
            Busca de Aluno (Raio-X)
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Form e Filtros Fixos */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-700/80 bg-white dark:bg-slate-800 dark:text-slate-100 shrink-0">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">

            {/* Linha Superior: Nome Livre e Botões de Ação */}
            <div className="flex flex-wrap sm:flex-nowrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Nome do Aluno (Busca Livre)
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Digite o nome do aluno (opcional)..."
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 h-[42px] min-w-[140px] cursor-pointer shadow-sm"
                >
                  <Search className="w-4 h-4" />
                  Pesquisar
                </button>

                {/* Botão de Geração em Lote - visível quando há seleção */}
                {selectedAlunosForPdf.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchGeneratePdfs}
                    disabled={isGeneratingBatch}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-all flex items-center justify-center gap-2 h-[42px] cursor-pointer shadow-sm disabled:opacity-50 whitespace-nowrap animate-in fade-in duration-200"
                    title="Baixar ZIP com os relatórios individuais de todos os alunos selecionados"
                  >
                    <Archive className="w-4 h-4" />
                    Gerar PDFs Selecionados ({selectedAlunosForPdf.length})
                  </button>
                )}
              </div>
            </div>

            {/* Linha Inferior: Filtros em Cascata Proporcionais (Grid de 12 Colunas) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-700/80 items-start">
              {/* 1. Curso (3 de 12) */}
              <div className="col-span-12 md:col-span-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                  1. Curso
                </label>
                <select
                  value={selectedCursoId}
                  onChange={e => setSelectedCursoId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-sm border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-slate-600 outline-none bg-white dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  <option value="">Todos os Cursos</option>
                  {cursosAll.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* 2. Período Letivo (2 de 12) */}
              <div className="col-span-12 md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                  2. Período Letivo
                </label>
                <select
                  value={selectedPeriodo}
                  onChange={e => setSelectedPeriodo(e.target.value)}
                  disabled={!selectedCursoId}
                  className="w-full text-sm border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-slate-600 outline-none bg-white dark:bg-slate-800 dark:text-slate-100 disabled:bg-gray-100 disabled:dark:bg-slate-800 disabled:text-gray-400 disabled:dark:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="">Todos os Períodos</option>
                  {periodosDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* 3. Turma (2 de 12) */}
              <div className="col-span-12 md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                  3. Turma
                </label>
                <select
                  value={selectedTurmaId}
                  onChange={e => setSelectedTurmaId(e.target.value ? Number(e.target.value) : '')}
                  disabled={!selectedPeriodo}
                  className="w-full text-sm border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-slate-600 outline-none bg-white dark:bg-slate-800 dark:text-slate-100 disabled:bg-gray-100 disabled:dark:bg-slate-800 disabled:text-gray-400 disabled:dark:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="">Todas as Turmas</option>
                  {turmasDisponiveis.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>

              {/* 4. Aluno (Específico) - Custom Dropdown Ampliado (5 de 12) */}
              <div className="relative col-span-12 md:col-span-5" ref={dropdownRef}>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300">
                    4. Aluno (Específico)
                  </label>
                  {selectedAlunosForPdf.length > 0 && (
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                      {selectedAlunosForPdf.length} para PDF
                    </span>
                  )}
                </div>

                {/* Botão Gatilho do Dropdown com espaço amplo */}
                <button
                  type="button"
                  disabled={!selectedTurmaId}
                  onClick={() => setIsDropdownOpen(prev => !prev)}
                  className={`w-full text-sm border rounded-lg p-2.5 flex items-center justify-between text-left transition-colors outline-none
                    ${!selectedTurmaId
                      ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 border-gray-300 dark:border-slate-700 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 border-gray-300 dark:border-slate-700 hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-slate-600 cursor-pointer shadow-sm'
                    }`}
                >
                  <span className="truncate flex-1 font-medium">
                    {selectedAlunoId
                      ? alunosDisponiveis.find(a => a.id === Number(selectedAlunoId))?.nome || 'Aluno Selecionado'
                      : selectedAlunosForPdf.length > 0
                        ? `${selectedAlunosForPdf.length} aluno(s) marcado(s) p/ PDF`
                        : 'Todos os Alunos'
                    }
                  </span>
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 text-gray-500 shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Menu Dropdown Flutuante com Largura Confortável */}
                {isDropdownOpen && selectedTurmaId && (
                  <div className="absolute left-0 right-0 sm:right-auto sm:min-w-[420px] w-full mt-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden text-sm animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Controles de Cabeçalho do Dropdown Refatorados */}
                    <div className="p-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50/90 dark:bg-slate-900/80 space-y-2.5">
                      {/* Botão Principal: Exibir Todos na Tela */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAlunoId('');
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-xs py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                          !selectedAlunoId
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 border-gray-200 dark:border-slate-700'
                        }`}
                      >
                        <span>👁️</span>
                        <span>Exibir Todos na Tela</span>
                        {!selectedAlunoId && (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-semibold ml-1">Ativo</span>
                        )}
                      </button>

                      {/* Botões Secundários Horizontais: Marcar Todos / Desmarcar Todos */}
                      <div className="flex flex-row items-center justify-between gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={handleSelectAllForPdf}
                          className="flex-1 text-xs py-1.5 px-3 rounded-lg font-medium bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Marcar todos os alunos desta turma para exportação em ZIP"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>Marcar Todos</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleClearSelectedForPdf}
                          className="flex-1 text-xs py-1.5 px-3 rounded-lg font-medium bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Desmarcar todos os alunos selecionados"
                        >
                          <X className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>Desmarcar Todos</span>
                        </button>
                      </div>

                      {/* Campo de Busca Rápida dentro do Dropdown */}
                      {alunosDisponiveis.length > 5 && (
                        <div className="relative pt-0.5">
                          <input
                            type="text"
                            value={dropdownSearch}
                            onChange={(e) => setDropdownSearch(e.target.value)}
                            placeholder="Filtrar aluno na turma..."
                            className="w-full text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          {dropdownSearch && (
                            <button
                              type="button"
                              onClick={() => setDropdownSearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-xs cursor-pointer p-0.5"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Lista Rolável de Alunos com espaço de leitura generoso */}
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-700/50 p-1.5">
                      {alunosDropdownFiltered.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400 dark:text-slate-500">
                          Nenhum aluno encontrado
                        </div>
                      ) : (
                        alunosDropdownFiltered.map(aluno => {
                          const alunoId = aluno.id;
                          if (alunoId === undefined) return null;
                          const isChecked = selectedAlunosForPdf.includes(alunoId);
                          const isCurrentOnScreen = selectedAlunoId === alunoId;

                          return (
                            <div
                              key={alunoId}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${
                                isCurrentOnScreen
                                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium'
                                  : 'hover:bg-gray-100 dark:hover:bg-slate-700/50 text-gray-700 dark:text-slate-200'
                              }`}
                            >
                              {/* Checkbox para seleção em lote de PDF (não altera a tela) */}
                              <input
                                type="checkbox"
                                id={`check-pdf-${alunoId}`}
                                checked={isChecked}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleAlunoForPdf(alunoId);
                                }}
                                title="Marcar para gerar relatório em lote no ZIP"
                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer shrink-0 accent-indigo-600"
                              />

                              {/* Nome do aluno com leitura completa e sem quebras abruptas */}
                              <div
                                onClick={() => {
                                  setSelectedAlunoId(alunoId);
                                  setHasSearched(true);
                                  setIsDropdownOpen(false);
                                }}
                                className="flex-1 min-w-0 cursor-pointer flex items-center justify-between gap-2 select-none py-0.5"
                                title="Clique para exibir o Raio-X deste aluno na tela"
                              >
                                <span className="break-words text-sm leading-snug">
                                  {aluno.nome}
                                  {aluno.isRepetente && (
                                    <span className="text-red-500 font-bold ml-1.5 text-xs whitespace-nowrap">(REPT)</span>
                                  )}
                                </span>
                                {isCurrentOnScreen && (
                                  <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold shrink-0 shadow-2xs">
                                    Na Tela
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Rodapé informativo do Dropdown */}
                    <div className="p-2.5 border-t border-gray-100 dark:border-slate-700 bg-gray-50/90 dark:bg-slate-900/80 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                      <span>Total: {alunosDisponiveis.length} alunos</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {selectedAlunosForPdf.length} marcado(s) p/ PDF
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </form>
        </div>

        {/* Faixa Informativa e Ação Rápida quando há seleção para PDF */}
        {selectedAlunosForPdf.length > 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/50 px-6 py-2.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-200 font-medium">
              <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>{selectedAlunosForPdf.length}</strong> {selectedAlunosForPdf.length === 1 ? 'aluno selecionado' : 'alunos selecionados'} para geração individual em lote.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClearSelectedForPdf}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-slate-400 hover:underline cursor-pointer"
              >
                Limpar seleção
              </button>
              <button
                type="button"
                onClick={handleBatchGeneratePdfs}
                disabled={isGeneratingBatch}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-1.5 px-4 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar ZIP ({selectedAlunosForPdf.length})
              </button>
            </div>
          </div>
        )}

        {/* Results Area com Rolagem Independente */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 bg-gray-50 dark:bg-slate-900/50">
          {!hasSearched ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Selecione os filtros ou digite o nome do aluno e clique em pesquisar.</p>
            </div>
          ) : alunosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
              <p>Nenhum aluno encontrado com esses filtros.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {alunosFiltrados.map(aluno => (
                <AlunoRaioXCard
                  key={aluno.id}
                  aluno={aluno}
                  turmasAll={turmasAll}
                  cursosAll={cursosAll}
                  disciplinasAll={disciplinasAll}
                  notasAll={notasAll}
                  avaliacoesAll={avaliacoesAll}
                  ocorrenciasAll={ocorrenciasAll}
                  estagiosAll={estagiosAll}
                  responsavelNome={responsavelNome}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Container Oculto para Renderização e Captura dos PDFs em Lote */}
      {isGeneratingBatch && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '794px',
            zIndex: -9999,
            opacity: 0.01,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          {selectedAlunosForPdf.map(alunoId => {
            const aluno = alunosAll.find(a => a.id === alunoId);
            if (!aluno) return null;
            const alunoData = calculateAlunoRaioXData(
              aluno,
              turmasAll,
              cursosAll,
              disciplinasAll,
              notasAll,
              avaliacoesAll,
              ocorrenciasAll,
              estagiosAll,
              responsavelNome
            );
            return (
              <div
                key={aluno.id}
                id={`batch-pdf-aluno-${aluno.id}`}
                style={{
                  width: '794px',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                }}
              >
                <RelatorioPedagogicoPrint
                  aluno={alunoData.aluno}
                  turma={alunoData.turma}
                  curso={alunoData.curso}
                  boletim={alunoData.boletim}
                  estagio={alunoData.estagio}
                  ocorrencias={alunoData.ocorrencias}
                  mediaGeral={alunoData.mediaGeral}
                  pendenciasCount={alunoData.pendenciasCount}
                  hasRiscoFaltas={alunoData.hasRiscoFaltas}
                  isPeDeMeiaApto={alunoData.isPeDeMeiaApto}
                  freqGlobal={alunoData.freqGlobal}
                  conselhoGlobal={alunoData.conselhoGlobal}
                  numEtapas={alunoData.numEtapas}
                  responsavelNome={alunoData.responsavelNome}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Loading / Progresso da Geração em Lote */}
      {isGeneratingBatch && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full text-center border border-gray-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/60 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-800">
              <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
            </div>

            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-1">
              Geração de PDFs em Lote
            </h3>

            <p className="text-sm text-gray-600 dark:text-slate-300 mb-4 min-h-[40px] flex items-center justify-center">
              {batchStatusMessage}
            </p>

            {batchProgress && batchProgress.total > 0 && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden p-0.5 border border-gray-100 dark:border-slate-600">
                  <div
                    className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((batchProgress.current / batchProgress.total) * 100))}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 font-medium px-1">
                  <span>
                    {batchProgress.current} de {batchProgress.total} relatórios
                  </span>
                  <span>
                    {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                  </span>
                </div>
              </div>
            )}

            <div className="mt-5 p-2.5 bg-gray-50 dark:bg-slate-900/60 rounded-lg border border-gray-200 dark:border-slate-700 text-left">
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                📦 <strong>Relatorios_Pedagogicos.zip</strong>: Todos os arquivos individuais estão sendo compactados em um único arquivo para evitar o bloqueio de múltiplos downloads pelo navegador.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AlunoRaioXCard = ({
  aluno,
  turmasAll,
  cursosAll,
  disciplinasAll,
  notasAll,
  avaliacoesAll,
  ocorrenciasAll,
  estagiosAll,
  responsavelNome,
}: any) => {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Relatorio_Pedagogico_${aluno.nome.replace(/\s+/g, '_')}`,
  });

  const {
    turma,
    curso,
    boletim,
    estagio,
    ocorrenciasDoAluno,
    mediaGeral,
    pendenciasCount,
    hasRiscoFaltas,
    isPeDeMeiaApto,
    freqGlobal,
    conselhoGlobal,
    numEtapas,
    totalFaltasGlobal,
  } = calculateAlunoRaioXData(
    aluno,
    turmasAll,
    cursosAll,
    disciplinasAll,
    notasAll,
    avaliacoesAll,
    ocorrenciasAll,
    estagiosAll,
    responsavelNome
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden dark:text-slate-100">

      {/* Elemento oculto para impressão nativa individual */}
      <div style={{ display: 'none' }}>
        <RelatorioPedagogicoPrint
          ref={componentRef}
          aluno={aluno}
          turma={turma}
          curso={curso}
          boletim={boletim}
          estagio={estagio}
          ocorrencias={ocorrenciasDoAluno}
          mediaGeral={mediaGeral}
          pendenciasCount={pendenciasCount}
          hasRiscoFaltas={hasRiscoFaltas}
          isPeDeMeiaApto={isPeDeMeiaApto}
          freqGlobal={freqGlobal}
          conselhoGlobal={conselhoGlobal}
          numEtapas={numEtapas}
          responsavelNome={responsavelNome}
        />
      </div>

      {/* Card Header */}
      <div className="bg-indigo-50 dark:bg-indigo-900/30/50 p-6 border-b border-gray-200 dark:border-slate-700">
        {/* Linha Superior: Nome e Dados Cadastrais */}
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            {aluno.nome}{aluno.isRepetente && <span className="text-red-600 font-bold ml-1 print:text-red-600">(REPT)</span>}
          </h3>
          <div className="mt-2 text-sm text-gray-600 dark:text-slate-300 flex flex-wrap items-center gap-3 sm:gap-6">
            <span className="whitespace-nowrap"><strong>Turma:</strong> {turma?.nome}</span>
            <span className="whitespace-nowrap"><strong>Curso:</strong> {curso?.nome}</span>
            {turma?.anoLetivo && <span className="whitespace-nowrap"><strong>Ano Letivo:</strong> {turma.anoLetivo}</span>}
          </div>
        </div>

        {/* Linha Inferior: Botão à esquerda e Tags de Estatísticas à direita */}
        <div className="mt-5 pt-4 border-t border-indigo-100/80 dark:border-slate-700/60 flex flex-wrap gap-4 items-center justify-between w-full">
          <button
            onClick={() => handlePrint()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Gerar Relatório (PDF)
          </button>

          <div className="flex flex-row flex-wrap sm:flex-nowrap gap-2.5">
            <div className="text-center px-4 py-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 min-w-[95px] dark:text-slate-100">
              <div className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">Média Geral</div>
              <div className="text-xl font-bold text-indigo-600">{mediaGeral}</div>
            </div>
            <div className="text-center px-4 py-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 min-w-[95px] dark:text-slate-100">
              <div className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">Pendências</div>
              <div className={`text-xl font-bold ${pendenciasCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {pendenciasCount}
              </div>
            </div>
            <div className="text-center px-4 py-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 min-w-[95px] dark:text-slate-100">
              <div className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">Total de Faltas</div>
              <div className={`text-xl font-bold ${hasRiscoFaltas ? 'text-red-600 dark:text-red-400' : totalFaltasGlobal > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {totalFaltasGlobal}
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
          <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 font-semibold uppercase text-xs">
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
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {boletim.map((b: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-900">
                <td className="px-6 py-3 font-medium text-gray-800 dark:text-slate-200">{b.disc.nome}</td>
                {b.notasEtapas.map((n: number | null, idx: number) => (
                  <td key={idx} className="px-4 py-3 text-center text-gray-600 dark:text-slate-300">
                    {n !== null ? n.toFixed(1) : '-'}
                  </td>
                ))}
                <td className="px-4 py-3 text-center text-gray-600 dark:text-slate-300">
                  {b.af?.provaFinal !== undefined && b.af.provaFinal !== null ? Number(b.af.provaFinal).toFixed(1) : '-'}
                </td>
                <td className="px-4 py-3 text-center font-bold text-gray-800 dark:text-slate-200">
                  {b.mediaFinal !== null ? (
                    b.isAprovadoConselho ? (
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-blue-600 font-semibold">{b.mediaFinal.toFixed(1)}</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-normal">({b.mediaFinalOrig?.toFixed(1)})</span>
                      </div>
                    ) : (
                      <span>{b.mediaFinal.toFixed(1)}</span>
                    )
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`${b.faltas >= b.limiteFaltas ? 'text-red-600 font-bold' : b.faltas >= b.limiteFaltas * 0.8 ? 'text-amber-600 font-bold' : 'text-gray-600 dark:text-slate-300'}`}>
                    {b.faltas}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold inline-block
                      ${b.situacao === 'Cursando' ? 'bg-blue-100 text-blue-800' :
                        b.situacao.includes('Aprovado') ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800' :
                        'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 dark:border dark:border-red-800'}`}>
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
      <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 dark:text-slate-100">
        {/* Estágio */}
        <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <h4 className="text-md font-bold text-gray-800 dark:text-slate-200 mb-3 flex items-center gap-2">
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
            <p className="text-sm text-gray-500 dark:text-slate-400">Nenhum estágio cadastrado.</p>
          )}
        </div>

        {/* Conselho de Classe */}
        <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <h4 className="text-md font-bold text-gray-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <Gavel className="w-5 h-5 text-indigo-600" />
            Conselho de Classe
          </h4>
          {conselhoGlobal ? (
            <div className={`text-sm font-semibold p-3 rounded-lg border ${conselhoGlobal.includes('Aprovado') ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 dark:border dark:border-red-800 border-red-200'}`}>
              {conselhoGlobal}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-slate-400">O aluno não passou por decisão de conselho.</p>
          )}
        </div>

        {/* Programa Pé de Meia */}
        <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <h4 className="text-md font-bold text-gray-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            Programa Pé de Meia
          </h4>
          <div className={`text-sm font-semibold p-3 rounded-lg border ${isPeDeMeiaApto ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 dark:border dark:border-red-800 border-red-200'}`}>
            {isPeDeMeiaApto ? '✅ Habilitado' : '❌ Não Habilitado'} ({freqGlobal.toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Ocorrências Section */}
      <div className="bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 p-6">
        <h4 className="text-lg font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-gray-600 dark:text-slate-300" />
          Histórico de Ocorrências
        </h4>
        {ocorrenciasDoAluno.length === 0 ? (
          <p className="text-gray-500 dark:text-slate-400 text-sm">Nenhuma ocorrência registrada para este aluno.</p>
        ) : (
          <div className="space-y-4">
            {ocorrenciasDoAluno.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()).map((oc: any) => {
              const isAlerta = oc.tipo.toLowerCase().includes('suspensão') || oc.tipo.toLowerCase().includes('indisciplina') || oc.tipo.toLowerCase().includes('advertência');
              const badgeColor = isAlerta ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 dark:border dark:border-red-800' : 'bg-blue-100 text-blue-800';

              return (
                <div key={oc.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col gap-2 dark:text-slate-100">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded font-bold ${badgeColor}`}>
                        {oc.tipo}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
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
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded transition-colors cursor-pointer"
                      >
                        📎 Ver Anexo
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{oc.descricao}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
