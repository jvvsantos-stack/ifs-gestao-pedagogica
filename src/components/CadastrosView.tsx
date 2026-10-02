import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Turma } from '../db/database';
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

  // --- Formulário de Novo Curso ---
  const [cursoNome, setCursoNome] = useState('');
  const [cursoModalidade, setCursoModalidade] = useState<'Integrado' | 'Subsequente'>('Integrado');

  // --- Formulário de Turma Manual ---
  const [turmaNome, setTurmaNome] = useState('');
  const [turmaCodigo, setTurmaCodigo] = useState('');
  const [turmaCursoId, setTurmaCursoId] = useState('');
  const [turmaAnoLetivo, setTurmaAnoLetivo] = useState(new Date().getFullYear().toString());

  // --- Tabs de visualização de turmas ---
  const [viewTurmas, setViewTurmas] = useState<'ativas' | 'arquivadas'>('ativas');

  // --- Modal de confirmação genérico ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

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
          const turmasParaCriar = c.turmas.map(t => ({
            cursoId: newCursoId as number,
            nome: t.codigo.charAt(0) + "ª Série",
            codigo: t.codigo,
            anoLetivo: anoCorrente,
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
    if (!turmaNome.trim() || !turmaCodigo.trim() || !turmaCursoId) return;

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

  // ===================== AÇÕES DE DISCIPLINAS (GERAÇÃO PPC) =====================

  /** Gera apenas as disciplinas que ainda não existem na turma */
  const handleGerarDisciplinas = async (turma: Turma) => {
    const cursoDb = cursos.find(c => c.id === turma.cursoId);
    if (!cursoDb) return;

    const cursoPPC = cursosPPC.find(c => c.nome === cursoDb.nome);
    if (!cursoPPC) {
      alert('Este curso não possui correspondência no PPC automático.');
      return;
    }
    const turmaPPC = cursoPPC.turmas.find(t => t.codigo === turma.codigo);
    if (!turmaPPC) {
      alert('Esta turma não possui disciplinas no PPC automático (código não encontrado).');
      return;
    }

    const existentes = disciplinasAll.filter(d => d.turmaId === turma.id);
    const nomesExistentes = new Set(existentes.map(d => d.nome));
    const faltando = turmaPPC.disciplinas.filter(d => !nomesExistentes.has(d.nome));

    if (faltando.length === 0) return; // botão já estaria desativado, mas segurança extra

    await db.disciplinas.bulkAdd(
      faltando.map(d => ({
        turmaId: turma.id!,
        nome: d.nome,
        chAula: d.horasAula,
        chRelogio: Math.round(d.horasAula * 0.83333),
        arquivado: false,
      })) as any
    );

    alert(`Foram geradas ${faltando.length} disciplina(s) na turma ${turma.nome}.`);
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
        <h1 className="text-2xl font-bold text-gray-800">Cadastros Base</h1>
        <p className="text-gray-500 text-sm">Gerencie os cursos, turmas e disciplinas da instituição</p>
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
                    onChange={e => setTurmaCursoId(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="" disabled>Selecione...</option>
                    {cursos.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={turmaCodigo}
                    onChange={e => setTurmaCodigo(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="Ex: 1IELN.M"
                  />
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ano Letivo</label>
                  <input
                    type="text"
                    required
                    value={turmaAnoLetivo}
                    onChange={e => setTurmaAnoLetivo(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="Ex: 2026"
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
            <div className="flex gap-2 mb-4 border-b border-gray-200 pb-2">
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => {
          handleCancelPPC();
        }}
      />
    </div>
  );
};
