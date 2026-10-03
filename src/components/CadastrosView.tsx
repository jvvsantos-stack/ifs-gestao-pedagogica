import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Turma, Disciplina } from '../db/database';
import { Edit, Trash2, X, Archive, ArchiveRestore, BookOpen, CheckCircle2, Wand2 } from 'lucide-react';
import { cursosPPC } from '../data/ppcData';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  onTurmaCriada?: (id: number) => void;
}

// Helper: conta quantas disciplinas do PPC a turma ainda não tem cadastradas
function contarDiscipinasFaltando(
  disciplinasCadastradas: { nome: string }[],
  disciplinasPPC: { nome: string; horasAula: number }[]
): number {
  const nomesExistentes = new Set(disciplinasCadastradas.map(d => d.nome));
  return disciplinasPPC.filter(d => !nomesExistentes.has(d.nome)).length;
}

export const CadastrosView: React.FC<Props> = ({ onTurmaCriada }) => {
  // --- Estados de seleção ---
  const [cursoPcpPendente, setCursoPcpPendente] = useState<number | null>(null); // índice do PPC aguardando confirmação
  const [showNovoCursoForm, setShowNovoCursoForm] = useState(false);
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState<number | null>(null); // curso clicado p/ exibir turmas

  // --- Estados de edição ---
  const [editingTurmaId, setEditingTurmaId] = useState<number | null>(null);
  const [editingDisciplina, setEditingDisciplina] = useState<Disciplina | null>(null);
  const [editDiscNome, setEditDiscNome] = useState('');
  const [editDiscChAula, setEditDiscChAula] = useState('');

  // --- Formulário de Novo Curso ---
  const [cursoNome, setCursoNome] = useState('');
  const [cursoModalidade, setCursoModalidade] = useState<'Integrado' | 'Subsequente'>('Integrado');

  // --- Formulário de Turma Manual ---
  const [turmaNome, setTurmaNome] = useState('');
  const [turmaCodigo, setTurmaCodigo] = useState('');
  const [turmaCursoId, setTurmaCursoId] = useState('');
  const [turmaAnoLetivo, setTurmaAnoLetivo] = useState(new Date().getFullYear().toString());

  // --- Modal de Nova Oferta Letiva ---
  const [ofertaModalOpen, setOfertaModalOpen] = useState(false);
  const [ofertaAnoLetivo, setOfertaAnoLetivo] = useState(new Date().getFullYear().toString());

  // --- Modal de Gerar Disciplinas ---
  const [gerarDiscModalOpen, setGerarDiscModalOpen] = useState(false);
  const [gerarDiscTurmaSelecionada, setGerarDiscTurmaSelecionada] = useState<Turma | null>(null);
  const [gerarDiscAno, setGerarDiscAno] = useState(new Date().getFullYear().toString());
  const [gerarDiscSemestre, setGerarDiscSemestre] = useState('1');
  // --- Tabs de visualização de turmas ---
  const [viewTurmas, setViewTurmas] = useState<'ativas' | 'arquivadas'>('ativas');

  // --- Modal de confirmação genérico ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'success' | 'info';
    isAlert?: boolean;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const showAlert = (title: string, message: string, type: 'warning' | 'success' | 'info' = 'info') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      type,
      isAlert: true,
      onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  React.useEffect(() => {
    // Auto-migração: Turmas de cursos Subsequentes que ficaram com "Série" no nome
    const migrateNomes = async () => {
      const cursosSubsequentes = await db.cursos.filter(c => c.nome.includes('Subsequente') || c.modalidade === 'Subsequente').toArray();
      for (const curso of cursosSubsequentes) {
        const turmas = await db.turmas.where('cursoId').equals(curso.id!).toArray();
        for (const t of turmas) {
          if (t.nome && t.nome.includes('Série')) {
            await db.turmas.update(t.id!, {
              nome: t.nome.replace('Série', 'Período').replace('ª', 'º')
            });
          }
        }
      }
    };
    migrateNomes();
  }, []);

  // --- Consultas em Tempo Real ---
  const cursos = useLiveQuery(() => db.cursos.toArray()) || [];
  const cursosAtivos = cursos.filter(c => !c.arquivado);
  const turmasAll = useLiveQuery(() => db.turmas.toArray()) || [];
  const disciplinasAll = useLiveQuery(() => db.disciplinas.toArray()) || [];

  // Turmas do curso selecionado, filtradas por ativo/arquivado
  const turmasBase = turmasAll.filter(t =>
    cursoSelecionadoId != null
      ? t.cursoId === cursoSelecionadoId && (viewTurmas === 'ativas' ? !t.arquivado : t.arquivado)
      : viewTurmas === 'ativas' ? !t.arquivado : t.arquivado
  );

  // ===================== AÇÕES DE CURSO =====================

  /** Selecionar um curso PPC no dropdown → pede confirmação */
  const handleSelecionarCursoPPC = (idx: number) => {
    const c = cursosPPC[idx];
    setCursoPcpPendente(idx);
    setConfirmModal({
      isOpen: true,
      title: 'Inserir curso?',
      message: `Deseja inserir o curso "${c.nome}" (${c.modalidade}) no sistema?`,
      confirmText: 'Sim',
      cancelText: 'Não',
      onConfirm: async () => {
        // Verifica se já existe
        const existente = cursos.find(x => x.nome === c.nome);
        if (!existente) {
          const newCursoId = await db.cursos.add({ nome: c.nome, modalidade: c.modalidade });
          const anoCorrente = new Date().getFullYear().toString();
          const anoLetivoDefault = c.modalidade?.includes('Subsequente') ? `${anoCorrente}.1` : anoCorrente;
          const turmasParaCriar = c.turmas.map(t => ({
            cursoId: newCursoId as number,
            nome: (t as any).nome || t.codigo.charAt(0) + "ª Série",
            codigo: t.codigo,
            anoLetivo: anoLetivoDefault,
            arquivado: false,
            lastAccessed: Date.now()
          }));
          await db.turmas.bulkAdd(turmasParaCriar);
        }
        setCursoPcpPendente(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleCancelPPC = () => {
    setCursoPcpPendente(null);
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSaveNovoCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoNome.trim()) return;
    await db.cursos.add({ nome: cursoNome.trim(), modalidade: cursoModalidade });
    setCursoNome('');
    setCursoModalidade('Integrado');
    setShowNovoCursoForm(false);
  };

  const handleArchiveCurso = async (id: number, arquivado: boolean) => {
    await db.cursos.update(id, { arquivado });
  };

  const handleDeleteCurso = (id: number, nome: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Curso',
      message: `Tem certeza que deseja excluir o curso "${nome}"?\n\nTodas as turmas e disciplinas vinculadas também serão excluídas permanentemente.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        const turmasDoCurso = await db.turmas.where('cursoId').equals(id).toArray();
        const turmasIds = turmasDoCurso.map(t => t.id!);
        const disciplinasDasTurmas = await db.disciplinas.where('turmaId').anyOf(turmasIds).toArray();
        await db.disciplinas.bulkDelete(disciplinasDasTurmas.map(d => d.id!));
        await db.turmas.bulkDelete(turmasIds);
        await db.cursos.delete(id);
        if (cursoSelecionadoId === id) setCursoSelecionadoId(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleGerarTurmasPPC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoSelecionadoId || !ofertaAnoLetivo.trim()) return;
    
    const curso = cursos.find(c => c.id === cursoSelecionadoId);
    if (!curso) return;

    const cursoPpc = cursosPPC.find(c => c.nome === curso.nome);
    if (!cursoPpc) {
      showAlert('Aviso', 'O curso selecionado não possui matriz cadastrada no sistema (PPC).', 'warning');
      return;
    }

    let criadas = 0;
    for (const t of cursoPpc.turmas) {
      const codigoLimpo = t.codigo.trim();
      const anoLimpo = ofertaAnoLetivo.trim();
      // Verifica se a turma específica (codigo + ano) já existe para evitar duplicidade
      const existe = turmasAll.some(x => x.cursoId === curso.id && x.codigo === codigoLimpo && x.anoLetivo === anoLimpo);
      if (!existe) {
        await db.turmas.add({
          cursoId: curso.id!,
          nome: (t as any).nome || codigoLimpo.charAt(0) + "ª Série",
          codigo: codigoLimpo,
          anoLetivo: anoLimpo,
          arquivado: false,
          lastAccessed: Date.now()
        });
        criadas++;
      }
    }

    setOfertaModalOpen(false);
    setViewTurmas('ativas');
    if (criadas > 0) {
      showAlert('Sucesso', `Foram geradas ${criadas} turma(s) para o período letivo ${ofertaAnoLetivo}.`, 'success');
    } else {
      showAlert('Aviso', `Todas as turmas base do PPC já existem para o período letivo ${ofertaAnoLetivo}.`, 'info');
    }
  };

  // ===================== AÇÕES DE TURMA =====================

  const handleEditTurma = (t: Turma) => {
    setEditingTurmaId(t.id!);
    setTurmaCursoId(String(t.cursoId));
    setTurmaNome(t.nome);
    setTurmaCodigo(t.codigo);
    setTurmaAnoLetivo(t.anoLetivo || '');
  };

  const cancelEditTurma = () => {
    setEditingTurmaId(null);
    setTurmaNome('');
    setTurmaCodigo('');
    setTurmaCursoId('');
    setTurmaAnoLetivo(new Date().getFullYear().toString());
  };

  const handleSaveTurmaManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaNome.trim() || !turmaCodigo.trim() || !turmaCursoId || turmaCodigo === 'outro_manual_trigger') return;

    const duplicada = turmasAll.find(t => 
      t.cursoId === Number(turmaCursoId) && 
      t.codigo === turmaCodigo.trim() && 
      t.anoLetivo === turmaAnoLetivo.trim() &&
      t.id !== editingTurmaId
    );

    if (duplicada) {
      showAlert('Aviso', `A turma ${turmaCodigo} já existe para o período letivo ${turmaAnoLetivo}.`, 'warning');
      return;
    }

    if (editingTurmaId) {
      await db.turmas.update(editingTurmaId, {
        cursoId: Number(turmaCursoId),
        nome: turmaNome,
        codigo: turmaCodigo,
        anoLetivo: turmaAnoLetivo,
        lastAccessed: Date.now(),
      });
    } else {
      const novaTurmaId = await db.turmas.add({
        cursoId: Number(turmaCursoId),
        nome: turmaNome,
        codigo: turmaCodigo,
        anoLetivo: turmaAnoLetivo,
        lastAccessed: Date.now(),
        arquivado: false,
      });
      if (onTurmaCriada) onTurmaCriada(novaTurmaId as number);
    }
    cancelEditTurma();
  };

  const handleArchiveTurma = async (id: number, arquivar: boolean) => {
    await db.turmas.update(id, { arquivado: arquivar });
    if (arquivar && editingTurmaId === id) cancelEditTurma();
  };

  const handleDeleteTurma = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Turma',
      message: 'Tem certeza que deseja excluir esta turma? Todas as disciplinas vinculadas também serão excluídas.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        const disciplinas = await db.disciplinas.where('turmaId').equals(id).toArray();
        await db.disciplinas.bulkDelete(disciplinas.map(d => d.id!));
        await db.turmas.delete(id);
        if (editingTurmaId === id) cancelEditTurma();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleArchiveDisciplina = async (id: number, arquivado: boolean) => {
    await db.disciplinas.update(id, { arquivado });
  };

  const handleDeleteDisciplina = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Disciplina',
      message: 'Tem certeza que deseja excluir esta disciplina?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        await db.disciplinas.delete(id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleEditDisciplinaClick = (d: Disciplina) => {
    setEditingDisciplina(d);
    setEditDiscNome(d.nome);
    setEditDiscChAula(d.chAula.toString());
  };

  const handleSaveDisciplinaEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDisciplina) return;
    const ch = parseInt(editDiscChAula);
    if (isNaN(ch) || ch <= 0) return;
    await db.disciplinas.update(editingDisciplina.id!, {
      nome: editDiscNome,
      chAula: ch,
      chRelogio: Math.round(ch * 0.83333)
    });
    setEditingDisciplina(null);
  };

  // ===================== AÇÕES DE DISCIPLINAS (GERAÇÃO PPC) =====================

  /** Gera apenas as disciplinas que ainda não existem na turma */
  const handleGerarDisciplinas = async (turma: Turma) => {
    setGerarDiscTurmaSelecionada(turma);
    setGerarDiscAno(new Date().getFullYear().toString());
    setGerarDiscSemestre('1');
    setGerarDiscModalOpen(true);
  };

  const confirmGerarDisciplinas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gerarDiscTurmaSelecionada) return;
    const turma = gerarDiscTurmaSelecionada;

    const cursoDb = cursos.find(c => c.id === turma.cursoId);
    if (!cursoDb) return;

    let periodoLetivo = '';
    if (cursoDb.modalidade?.includes('Subsequente')) {
      periodoLetivo = `${gerarDiscAno}/${gerarDiscSemestre}`;
    } else {
      periodoLetivo = `${gerarDiscAno}`;
    }

    const cursoPPC = cursosPPC.find(c => c.nome === cursoDb.nome);
    if (!cursoPPC) {
      showAlert('Aviso', 'Este curso não possui correspondência no PPC automático.', 'warning');
      setGerarDiscModalOpen(false);
      return;
    }
    const turmaPPC = cursoPPC.turmas.find(t => t.codigo === turma.codigo);
    if (!turmaPPC) {
      showAlert('Aviso', 'Esta turma não possui disciplinas no PPC automático (código não encontrado).', 'warning');
      setGerarDiscModalOpen(false);
      return;
    }

    const existentes = disciplinasAll.filter(d => d.turmaId === turma.id);
    const nomesExistentes = new Set(existentes.map(d => d.nome));
    const faltando = turmaPPC.disciplinas.filter(d => !nomesExistentes.has(d.nome));

    if (faltando.length === 0) {
      setGerarDiscModalOpen(false);
      return; // botão já estaria desativado, mas segurança extra
    }

    await db.disciplinas.bulkAdd(
      faltando.map(d => ({
        turmaId: turma.id!,
        nome: d.nome,
        chAula: d.horasAula,
        chRelogio: Math.round(d.horasAula * 0.83333),
        arquivado: false,
        periodoLetivo
      })) as any
    );

    await db.turmas.update(turma.id!, {
      anoLetivo: periodoLetivo
    });

    setGerarDiscModalOpen(false);
    showAlert('Sucesso', `Foram geradas ${faltando.length} disciplina(s) na turma ${turma.nome} para o período ${periodoLetivo}.`, 'success');
  };

  // ===================== HELPERS DE RENDER =====================

  const getCursoPPCParaTurma = (turma: Turma) => {
    const cursoDb = cursos.find(c => c.id === turma.cursoId);
    if (!cursoDb) return null;
    const cursoPPC = cursosPPC.find(c => c.nome === cursoDb.nome);
    if (!cursoPPC) return null;
    return cursoPPC.turmas.find(t => t.codigo === turma.codigo) ?? null;
  };

  const getStatusDisciplinas = (turma: Turma) => {
    const turmaPPC = getCursoPPCParaTurma(turma);
    if (!turmaPPC) return null; // sem PPC → não exibe status
    const existentes = disciplinasAll.filter(d => d.turmaId === turma.id);
    const total = turmaPPC.disciplinas.length;
    const faltando = contarDiscipinasFaltando(existentes, turmaPPC.disciplinas);
    return { total, cadastradas: total - faltando, faltando };
  };

  // Opções do dropdown de cursos: PPC + "Novo Curso"
  const cursosPPCJaInseridos = new Set(cursos.map(c => c.nome));

  return (
    <div className="p-6 bg-gray-50 min-h-full space-y-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Estrutura Acadêmica</h1>
        <p className="text-gray-500 text-sm">Gerenciamento de cursos, disciplinas e períodos letivos</p>
      </header>

      <div className="flex flex-col gap-8 w-full">

        {/* ============ SEÇÃO 1: CURSOS ============ */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col w-full">
          <div className="p-4 border-b border-gray-100 bg-indigo-50/30">
            <h2 className="text-lg font-bold text-gray-800">1. Cursos</h2>
            <p className="text-xs text-gray-500 mt-0.5">Selecione um curso do PPC para inserir ou adicione um novo manualmente.</p>
          </div>

          <div className="p-4 border-b border-gray-100 shrink-0">
            {/* Dropdown de seleção */}
            <label className="block text-xs font-medium text-gray-700 mb-1">Adicionar Curso</label>
            <div className="flex gap-2">
              <select
                defaultValue=""
                key={cursoPcpPendente} // reseta visualmente após cancelar
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'novo') {
                    setShowNovoCursoForm(true);
                  } else if (val !== '') {
                    setShowNovoCursoForm(false);
                    handleSelecionarCursoPPC(Number(val));
                  }
                  // Reseta o select visualmente
                  e.target.value = '';
                }}
                className="flex-1 text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="" disabled>Selecione um curso para inserir...</option>
                {cursosPPC.map((c, i) => (
                  <option key={i} value={i} disabled={cursosPPCJaInseridos.has(c.nome)}>
                    {c.nome}{cursosPPCJaInseridos.has(c.nome) ? ' (já inserido)' : ''}
                  </option>
                ))}
                <option value="novo">＋ Novo Curso (Manual)</option>
              </select>
            </div>

            {/* Formulário de Novo Curso Manual */}
            {showNovoCursoForm && (
              <form onSubmit={handleSaveNovoCurso} className="space-y-3 mt-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 animate-fade-in">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Novo Curso Manual</span>
                  <button type="button" onClick={() => setShowNovoCursoForm(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nome do Curso</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={cursoNome}
                    onChange={e => setCursoNome(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="Ex: Técnico em Automação"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Modalidade</label>
                  <div className="flex gap-2">
                    {(['Integrado', 'Subsequente'] as const).map(mod => (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => setCursoModalidade(mod)}
                        className={`flex-1 text-sm py-2 rounded font-medium border transition-colors ${cursoModalidade === mod
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                        }`}
                      >
                        {mod}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded transition-colors"
                >
                  Salvar Curso
                </button>
              </form>
            )}
          </div>

          {/* Lista de Cursos Cadastrados */}
          <div className="p-4 flex-1">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Cursos Cadastrados ({cursosAtivos.length})
            </h3>
            {cursosAtivos.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">Nenhum curso cadastrado. Insira um curso acima.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cursosAtivos.map(c => {
                const isSelected = cursoSelecionadoId === c.id;
                const turmasDoCurso = turmasAll.filter(t => t.cursoId === c.id && !t.arquivado).length;
                return (
                  <div
                    key={c.id}
                    onClick={() => setCursoSelecionadoId(isSelected ? null : c.id!)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all group ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-sm truncate ${isSelected ? 'text-indigo-800' : 'text-gray-800'}`}>
                          {c.nome}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            c.modalidade === 'Integrado'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {c.modalidade}
                          </span>
                          <span className="text-[10px] text-gray-400">{turmasDoCurso} turma(s) ativa(s)</span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); handleArchiveCurso(c.id!, true); }}
                          className="p-1.5 text-gray-400 hover:text-orange-600 transition-colors"
                          title="Arquivar curso"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteCurso(c.id!, c.nome); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                          title="Excluir curso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-indigo-200 text-[11px] text-indigo-600 font-medium flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Clique novamente para desfiltrar
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ SEÇÃO 2: TURMAS ============ */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col w-full">
          <div className="p-4 border-b border-gray-100 bg-indigo-50/30 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-800">2. Turmas</h2>
              {cursoSelecionadoId && (
                <p className="text-xs text-indigo-600 mt-0.5 font-medium">
                  Filtrando: {cursos.find(c => c.id === cursoSelecionadoId)?.nome}
                </p>
              )}
            </div>
            {editingTurmaId && (
              <button onClick={cancelEditTurma} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
                <X className="w-3 h-3" /> Cancelar Edição
              </button>
            )}
          </div>

          {/* Formulário de Turma Manual */}
          <div className="p-4 border-b border-gray-100 shrink-0">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              {editingTurmaId ? 'Editando Turma' : 'Adicionar Turma Manualmente'}
            </div>
            <form onSubmit={handleSaveTurmaManual} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Curso Pai</label>
                  <select
                    required
                    value={turmaCursoId}
                    onChange={e => {
                      setTurmaCursoId(e.target.value);
                      setTurmaCodigo('');
                      setTurmaNome('');
                      const c = cursos.find(c => c.id === Number(e.target.value));
                      if (c) {
                        const anoCorrente = new Date().getFullYear().toString();
                        setTurmaAnoLetivo(c.modalidade?.includes('Subsequente') ? `${anoCorrente}.1` : anoCorrente);
                      }
                    }}
                    className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="" disabled>Selecione...</option>
                    {cursos.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Código da Turma</label>
                  {(() => {
                    const cDb = cursos.find(c => c.id === Number(turmaCursoId));
                    const cPPC = cDb ? cursosPPC.find(cp => cp.nome === cDb.nome) : null;
                    
                    if (cPPC && turmaCodigo !== 'outro_manual_trigger') {
                      const isManual = turmaCodigo !== '' && !cPPC.turmas.some(t => t.codigo === turmaCodigo);
                      if (!isManual) {
                        return (
                          <select
                            required
                            value={turmaCodigo}
                            onChange={e => {
                              if (e.target.value === 'outro_manual_trigger') {
                                setTurmaCodigo('outro_manual_trigger'); 
                              } else {
                                setTurmaCodigo(e.target.value);
                                const tPPC = cPPC.turmas.find(t => t.codigo === e.target.value);
                                if (tPPC) {
                                  setTurmaNome((tPPC as any).nome || tPPC.codigo.charAt(0) + "ª Série");
                                }
                              }
                            }}
                            className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                          >
                            <option value="" disabled>Selecione a turma...</option>
                            {cPPC.turmas.map(t => (
                              <option key={t.codigo} value={t.codigo}>{t.codigo}</option>
                            ))}
                            <option value="outro_manual_trigger">Outro (Manual)</option>
                          </select>
                        );
                      }
                    }

                    return (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={turmaCodigo === 'outro_manual_trigger' ? '' : turmaCodigo}
                          onChange={e => setTurmaCodigo(e.target.value)}
                          className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                          placeholder="Ex: 1IELN.M"
                          autoFocus={turmaCodigo === 'outro_manual_trigger'}
                        />
                        {cPPC && (
                          <button 
                            type="button"
                            onClick={() => {
                               setTurmaCodigo('');
                               setTurmaNome('');
                            }} 
                            className="text-xs text-indigo-600 font-medium hover:underline whitespace-nowrap px-2"
                          >
                            Lista PPC
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nome de Exibição</label>
                  <input
                    type="text"
                    required
                    value={turmaNome}
                    onChange={e => setTurmaNome(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="Ex: 1ª Série"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Período Letivo</label>
                  <input
                    type="text"
                    required
                    value={turmaAnoLetivo}
                    onChange={e => setTurmaAnoLetivo(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder={cursos.find(c => c.id === Number(turmaCursoId))?.modalidade?.includes('Subsequente') ? "Ex: 2026.1" : "Ex: 2026"}
                  />
                </div>
              </div>
              <button
                type="submit"
                className={`w-full text-white text-sm font-medium py-2 rounded transition-colors ${
                  editingTurmaId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {editingTurmaId ? 'Atualizar Turma' : 'Salvar Turma'}
              </button>
            </form>
          </div>

          {/* Lista de Turmas */}
          <div className="p-4 flex-1 bg-gray-50/50">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewTurmas('ativas')}
                  className={`text-xs font-bold px-3 py-1.5 rounded transition-colors ${viewTurmas === 'ativas' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  Ativas
                </button>
                <button
                  onClick={() => setViewTurmas('arquivadas')}
                  className={`text-xs font-bold px-3 py-1.5 rounded transition-colors ${viewTurmas === 'arquivadas' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  Arquivadas
                </button>
              </div>

              {/* Botão Nova Oferta Letiva (PPC) */}
              {cursoSelecionadoId && cursosPPC.some(cp => cp.nome === cursos.find(c => c.id === cursoSelecionadoId)?.nome) && (
                <button
                  onClick={() => {
                    setOfertaAnoLetivo(new Date().getFullYear().toString());
                    setOfertaModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Gerar Turmas do PPC
                </button>
              )}
            </div>

            {!cursoSelecionadoId && (
              <div className="text-center py-8 text-sm text-gray-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Selecione um curso acima para ver suas turmas.
              </div>
            )}

            {cursoSelecionadoId && turmasBase.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">Nenhuma turma {viewTurmas === 'ativas' ? 'ativa' : 'arquivada'} para este curso.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {turmasBase.map(t => {
                const status = getStatusDisciplinas(t);
                const podGerar = status !== null && status.faltando > 0;
                const completa = status !== null && status.faltando === 0;

                return (
                  <div key={t.id} className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm flex flex-col gap-3 group">
                    {/* Cabeçalho */}
                    <div>
                      <div className="font-bold text-gray-800 text-base leading-tight">{t.nome}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[11px] font-bold">{t.codigo}</span>
                        {t.anoLetivo && (
                          <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded text-[11px] font-bold">{t.anoLetivo}</span>
                        )}
                      </div>
                    </div>

                    {/* Status de disciplinas */}
                    {status !== null && (
                      <div className={`flex items-center gap-1.5 text-[11px] font-medium rounded px-2 py-1 ${
                        completa
                          ? 'bg-emerald-50 text-emerald-700'
                          : status.cadastradas > 0
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        {completa
                          ? `${status.total}/${status.total} disciplinas completas`
                          : `${status.cadastradas}/${status.total} – faltam ${status.faltando}`}
                      </div>
                    )}

                    {/* Lista de Disciplinas renderizadas */}
                    {status !== null && status.cadastradas > 0 && (
                      <div className="mt-1 mb-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {disciplinasAll.filter(d => d.turmaId === t.id && (viewTurmas === 'ativas' ? !d.arquivado : d.arquivado)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(d => {
                          const turmaPPC = getCursoPPCParaTurma(t);
                          const isPPC = turmaPPC?.disciplinas.some(dp => dp.nome === d.nome) || false;
                          return (
                            <div key={d.id} className="text-[10px] bg-gray-50 border border-gray-100 rounded p-1.5 flex justify-between items-center group/disc">
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="font-semibold text-gray-700 truncate" title={d.nome}>
                                  {d.periodoLetivo && <span className="mr-1 text-indigo-600 bg-indigo-100 px-1 rounded">[ {d.periodoLetivo} ]</span>}
                                  {d.nome}
                                </div>
                                <div className="text-gray-400">{d.chAula} aulas / {d.chRelogio}h</div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover/disc:opacity-100 transition-opacity">
                                <button onClick={() => handleEditDisciplinaClick(d)} className="text-indigo-500 hover:text-indigo-700 p-0.5" title="Editar"><Edit className="w-3 h-3" /></button>
                                {viewTurmas === 'ativas' ? (
                                  <button onClick={() => handleArchiveDisciplina(d.id!, true)} className="text-orange-500 hover:text-orange-700 p-0.5" title="Arquivar"><Archive className="w-3 h-3" /></button>
                                ) : (
                                  <button onClick={() => handleArchiveDisciplina(d.id!, false)} className="text-green-500 hover:text-green-700 p-0.5" title="Restaurar"><ArchiveRestore className="w-3 h-3" /></button>
                                )}
                                {!isPPC && (
                                  <button onClick={() => handleDeleteDisciplina(d.id!)} className="text-red-500 hover:text-red-700 p-0.5" title="Excluir"><Trash2 className="w-3 h-3" /></button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Ações */}
                    <div className="flex flex-col gap-2 mt-auto">
                      {/* Botão Gerar Disciplinas */}
                      <button
                        onClick={() => handleGerarDisciplinas(t)}
                        disabled={!podGerar}
                        title={
                          status === null
                            ? 'Sem PPC correspondente'
                            : completa
                            ? 'Todas as disciplinas já foram geradas'
                            : `Gerar ${status.faltando} disciplina(s) faltando`
                        }
                        className={`w-full flex items-center justify-center gap-2 text-xs font-bold py-2 rounded transition-colors ${
                          podGerar
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        {completa ? 'Disciplinas Geradas' : 'Gerar Disciplinas'}
                      </button>

                      {/* Editar / Arquivar / Excluir */}
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {viewTurmas === 'ativas' ? (
                          <>
                            <button
                              onClick={() => handleEditTurma(t)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleArchiveTurma(t.id!, true)}
                              className="p-1.5 text-gray-400 hover:text-orange-600 transition-colors"
                              title="Arquivar"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTurma(t.id!)}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleArchiveTurma(t.id!, false)}
                              className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                              title="Restaurar"
                            >
                              <ArchiveRestore className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTurma(t.id!)}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      </div>

      {/* Modal Edit Disciplina */}
      {editingDisciplina && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm shadow-xl">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Editar Disciplina</h3>
            <form onSubmit={handleSaveDisciplinaEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={editDiscNome}
                  onChange={e => setEditDiscNome(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">CH Aulas (horas-aula)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editDiscChAula}
                  onChange={e => setEditDiscChAula(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setEditingDisciplina(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Oferta Letiva */}
      {ofertaModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm shadow-xl">
            <h3 className="text-sm font-bold text-gray-800 mb-2">Gerar Turmas do PPC</h3>
            <p className="text-xs text-gray-500 mb-4">
              Para qual Período Letivo deseja gerar as turmas?
            </p>
            <form onSubmit={handleGerarTurmasPPC} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Período Letivo (ex: 2026, 2026.1)</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={ofertaAnoLetivo}
                  onChange={e => setOfertaAnoLetivo(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setOfertaModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
                >
                  Gerar Turmas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerar Disciplinas */}
      {gerarDiscModalOpen && gerarDiscTurmaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm shadow-xl">
            <h3 className="text-sm font-bold text-gray-800 mb-2">Configurar Período Letivo</h3>
            <p className="text-xs text-gray-500 mb-4">
              Defina o período para as novas disciplinas desta turma.
            </p>
            <form onSubmit={confirmGerarDisciplinas} className="space-y-4">
              {cursos.find(c => c.id === gerarDiscTurmaSelecionada.cursoId)?.modalidade?.includes('Subsequente') ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Ano (YYYY)</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={4}
                      value={gerarDiscAno}
                      onChange={e => setGerarDiscAno(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Período</label>
                    <select
                      required
                      value={gerarDiscSemestre}
                      onChange={e => setGerarDiscSemestre(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ano Letivo (YYYY)</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={4}
                    value={gerarDiscAno}
                    onChange={e => setGerarDiscAno(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}
              <div className="flex gap-2 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setGerarDiscModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
                >
                  Confirmar/Gerar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
        type={confirmModal.type}
        {...(!confirmModal.isAlert && {
          onCancel: () => handleCancelPPC()
        })}
      />
    </div>
  );
};
