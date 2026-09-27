import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Curso, Turma, Disciplina } from '../db/database';
import { Edit, Trash2, X, Archive, ArchiveRestore } from 'lucide-react';
import { catalogoPPC } from '../utils/catalogoPPC';

export const CadastrosView: React.FC = () => {
  // --- Estados de Edição ---
  const [editingCursoId, setEditingCursoId] = useState<number | null>(null);
  const [editingTurmaId, setEditingTurmaId] = useState<number | null>(null);
  const [editingDisciplinaId, setEditingDisciplinaId] = useState<number | null>(null);

  // --- Estados do Formulário de Curso ---
  const [cursoNome, setCursoNome] = useState('');
  const [cursoModalidade, setCursoModalidade] = useState('Técnico Integrado');

  // --- Estados do Formulário de Turma ---
  const [turmaCursoId, setTurmaCursoId] = useState('');
  const [turmaNome, setTurmaNome] = useState('');
  const [turmaCodigo, setTurmaCodigo] = useState('');
  const [turmaAnoLetivo, setTurmaAnoLetivo] = useState('');
  const [turmaListCursoId, setTurmaListCursoId] = useState(''); // Filtro pra listagem

  // --- Estados do Formulário de Disciplina ---
  const [disciplinaTurmaId, setDisciplinaTurmaId] = useState('');
  const [disciplinaNome, setDisciplinaNome] = useState('');
  const [disciplinaChAula, setDisciplinaChAula] = useState<number | ''>('');
  const [disciplinaChRelogio, setDisciplinaChRelogio] = useState<number | ''>('');
  const [filtroTurmaId, setFiltroTurmaId] = useState('');
  const [filtroModalidade, setFiltroModalidade] = useState('');

  const [viewTurmas, setViewTurmas] = useState<'ativas' | 'arquivadas'>('ativas');
  const [viewDisciplinas, setViewDisciplinas] = useState<'ativas' | 'arquivadas'>('ativas');

  // --- Consultas em Tempo Real ---
  const cursos = useLiveQuery(() => db.cursos.toArray()) || [];
  const turmasAll = useLiveQuery(() => db.turmas.toArray()) || [];
  const disciplinasAll = useLiveQuery(() => db.disciplinas.toArray()) || [];

  // Turmas filtradas pelo curso selecionado na listagem de turmas
  const turmasBase = turmasAll.filter(t => viewTurmas === 'ativas' ? !t.arquivado : t.arquivado);
  const turmasListadas = turmaListCursoId 
    ? turmasBase.filter(t => t.cursoId === Number(turmaListCursoId))
    : turmasBase;

  // Disciplinas filtradas pela turma selecionada na listagem de disciplinas
  const disciplinasListadas = disciplinasAll.filter(d => {
    const turma = turmasAll.find(t => t.id === d.turmaId);
    const curso = turma ? cursos.find(c => c.id === turma.cursoId) : null;
    
    const matchArquivado = viewDisciplinas === 'arquivadas' ? d.arquivado : !d.arquivado;
    const matchTurma = filtroTurmaId ? d.turmaId === Number(filtroTurmaId) : true;
    const matchModalidade = filtroModalidade && curso ? curso.modalidade === filtroModalidade : true;
    
    return matchArquivado && matchTurma && matchModalidade;
  });

  // ===================== AÇÕES DE CURSO =====================
  const handleEditCurso = (c: Curso) => {
    setEditingCursoId(c.id!);
    setCursoNome(c.nome);
    setCursoModalidade(c.modalidade);
  };

  const cancelEditCurso = () => {
    setEditingCursoId(null);
    setCursoNome('');
    setCursoModalidade('Técnico Integrado');
  };

  const handleDeleteCurso = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este curso? Todas as turmas e disciplinas vinculadas também serão excluídas.')) {
      const turmasDoCurso = await db.turmas.where('cursoId').equals(id).toArray();
      const turmasIds = turmasDoCurso.map(t => t.id!);
      
      const disciplinasDasTurmas = await db.disciplinas.where('turmaId').anyOf(turmasIds).toArray();
      const disciplinasIds = disciplinasDasTurmas.map(d => d.id!);

      await db.disciplinas.bulkDelete(disciplinasIds);
      await db.turmas.bulkDelete(turmasIds);
      await db.cursos.delete(id);

      if (editingCursoId === id) cancelEditCurso();
    }
  };

  const handleSaveCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoNome.trim()) return;
    
    if (editingCursoId) {
      await db.cursos.update(editingCursoId, {
        nome: cursoNome,
        modalidade: cursoModalidade,
      });
    } else {
      await db.cursos.add({
        nome: cursoNome,
        modalidade: cursoModalidade,
      });
    }
    cancelEditCurso();
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
    setTurmaAnoLetivo('');
  };

  const handleArchiveTurma = async (id: number, arquivar: boolean) => {
    await db.turmas.update(id, { arquivado: arquivar });
    if (arquivar && editingTurmaId === id) cancelEditTurma();
  };

  const handleDeleteTurma = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta turma? Todas as disciplinas vinculadas também serão excluídas.')) {
      const disciplinasDaTurma = await db.disciplinas.where('turmaId').equals(id).toArray();
      const disciplinasIds = disciplinasDaTurma.map(d => d.id!);

      await db.disciplinas.bulkDelete(disciplinasIds);
      await db.turmas.delete(id);

      if (editingTurmaId === id) cancelEditTurma();
    }
  };

  const handleSaveTurma = async (e: React.FormEvent) => {
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
      await db.turmas.add({
        cursoId: Number(turmaCursoId),
        nome: turmaNome,
        codigo: turmaCodigo,
        anoLetivo: turmaAnoLetivo,
        lastAccessed: Date.now(),
      });
    }
    cancelEditTurma();
  };

  // ===================== AÇÕES DE DISCIPLINA =====================
  const handleEditDisciplina = (d: Disciplina) => {
    setEditingDisciplinaId(d.id!);
    setDisciplinaTurmaId(String(d.turmaId));
    setDisciplinaNome(d.nome);
    setDisciplinaChAula(d.chAula);
    setDisciplinaChRelogio(d.chRelogio);
  };

  const cancelEditDisciplina = () => {
    setEditingDisciplinaId(null);
    setDisciplinaNome('');
    setDisciplinaChAula('');
    setDisciplinaChRelogio('');
    setDisciplinaTurmaId('');
  };

  const handleArchiveDisciplina = async (id: number, arquivar: boolean) => {
    await db.disciplinas.update(id, { arquivado: arquivar });
    if (arquivar && editingDisciplinaId === id) cancelEditDisciplina();
  };

  const handleDeleteDisciplina = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta disciplina?')) {
      await db.disciplinas.delete(id);
      if (editingDisciplinaId === id) cancelEditDisciplina();
    }
  };

  const handleSaveDisciplina = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disciplinaNome.trim() || !disciplinaTurmaId || disciplinaChAula === '' || disciplinaChRelogio === '') return;

    if (editingDisciplinaId) {
      await db.disciplinas.update(editingDisciplinaId, {
        turmaId: Number(disciplinaTurmaId),
        nome: disciplinaNome,
        chAula: Number(disciplinaChAula),
        chRelogio: Number(disciplinaChRelogio),
      });
    } else {
      await db.disciplinas.add({
        turmaId: Number(disciplinaTurmaId),
        nome: disciplinaNome,
        chAula: Number(disciplinaChAula),
        chRelogio: Number(disciplinaChRelogio),
      });
      setEditingDisciplinaId(null);
      setDisciplinaNome('');
      setDisciplinaChAula('');
      setDisciplinaChRelogio('');
      return;
    }
    cancelEditDisciplina();
  };

  const turmaSelecionadaForm = turmasAll.find(t => t.id === Number(disciplinaTurmaId));
  const cursoSelecionadoForm = turmaSelecionadaForm ? cursos.find(c => c.id === turmaSelecionadaForm.cursoId) : null;
  const isEletronica = cursoSelecionadoForm ? (cursoSelecionadoForm.nome.toLowerCase().includes('eletrônica') || cursoSelecionadoForm.nome.toLowerCase().includes('eletronica')) : false;
  const isPreenchimentoRapidoDisabled = !cursoSelecionadoForm || !isEletronica;
  const catType = cursoSelecionadoForm ? (cursoSelecionadoForm.modalidade.includes('Integrado') ? 'Integrado' : 'Subsequente') : 'Integrado';

  return (
    <div className="p-6 bg-gray-50 min-h-full space-y-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Cadastros Base</h1>
        <p className="text-gray-500 text-sm">Gerencie os cursos, turmas e disciplinas da instituição</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* CARD: CURSOS */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-100 bg-indigo-50/30 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">1. Cursos</h2>
            {editingCursoId && (
              <button onClick={cancelEditCurso} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
                <X className="w-3 h-3" /> Cancelar Edição
              </button>
            )}
          </div>
          
          <div className="p-4 border-b border-gray-100 shrink-0">
            <form onSubmit={handleSaveCurso} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome do Curso</label>
                <input
                  type="text"
                  required
                  value={cursoNome}
                  onChange={e => setCursoNome(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: Técnico em Eletrônica"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Modalidade</label>
                <select
                  value={cursoModalidade}
                  onChange={e => setCursoModalidade(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="Técnico Integrado">Técnico Integrado</option>
                  <option value="Técnico Subsequente">Técnico Subsequente</option>
                </select>
              </div>
              <button type="submit" className={`w-full text-white text-sm font-medium py-2 rounded transition-colors ${editingCursoId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {editingCursoId ? 'Atualizar Curso' : 'Adicionar Curso'}
              </button>
            </form>
          </div>

          <div className="p-4 flex-1 overflow-y-auto bg-gray-50/50">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Cursos Cadastrados</h3>
            <ul className="space-y-2">
              {cursos.map(c => (
                <li key={c.id} className="bg-white p-3 border border-gray-200 rounded shadow-sm flex items-center justify-between group">
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{c.nome}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{c.modalidade}</div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditCurso(c)} className="p-1 text-gray-400 hover:text-indigo-600 transition-colors" title="Editar">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteCurso(c.id!)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
              {cursos.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhum curso cadastrado.</p>}
            </ul>
          </div>
        </section>

        {/* CARD: TURMAS */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-100 bg-indigo-50/30 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">2. Turmas</h2>
            {editingTurmaId && (
              <button onClick={cancelEditTurma} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
                <X className="w-3 h-3" /> Cancelar Edição
              </button>
            )}
          </div>
          
          <div className="p-4 border-b border-gray-100 shrink-0">
            <form onSubmit={handleSaveTurma} className="space-y-3">
              {(() => {
                const cursoSelecionado = cursos.find(c => c.id === Number(turmaCursoId));
                const isSubsequente = cursoSelecionado?.modalidade.includes('Subsequente');
                return (
                  <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Curso Pai</label>
                <select
                  required
                  value={turmaCursoId}
                  onChange={e => setTurmaCursoId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="" disabled>Selecione um curso...</option>
                  {cursos.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome da Turma</label>
                <input
                  type="text"
                  required
                  value={turmaNome}
                  onChange={e => setTurmaNome(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: Eletrônica 1A"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  required
                  value={turmaCodigo}
                  onChange={e => setTurmaCodigo(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: ELT1A"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {isSubsequente ? 'Ano/Período Letivo' : 'Ano Letivo'}
                </label>
                <input
                  type="text"
                  required
                  value={turmaAnoLetivo}
                  onChange={e => setTurmaAnoLetivo(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder={isSubsequente ? 'Ex: 2026/2' : 'Ex: 2026'}
                />
              </div>
              </>
              );
            })()}
              <button type="submit" className={`w-full text-white text-sm font-medium py-2 rounded transition-colors ${editingTurmaId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {editingTurmaId ? 'Atualizar Turma' : 'Adicionar Turma'}
              </button>
            </form>
          </div>

          <div className="p-4 flex-1 overflow-y-auto bg-gray-50/50 flex flex-col">
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
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Filtrar por Curso</label>
              <select
                value={turmaListCursoId}
                onChange={e => setTurmaListCursoId(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="">Todas as turmas</option>
                {cursos.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <ul className="space-y-2">
              {turmasListadas.map(t => (
                <li key={t.id} className="bg-white p-3 border border-gray-200 rounded shadow-sm group">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                        {t.nome}
                        <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">{t.codigo}</span>
                        {t.anoLetivo && (
                          <span className="text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">{t.anoLetivo}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {cursos.find(c => c.id === t.cursoId)?.nome || 'Curso Desconhecido'}
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {viewTurmas === 'ativas' ? (
                        <>
                          <button onClick={() => handleEditTurma(t)} className="p-1 text-gray-400 hover:text-indigo-600 transition-colors" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleArchiveTurma(t.id!, true)} className="p-1 text-gray-400 hover:text-orange-600 transition-colors" title="Arquivar">
                            <Archive className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleArchiveTurma(t.id!, false)} className="p-1 text-gray-400 hover:text-green-600 transition-colors" title="Restaurar">
                            <ArchiveRestore className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteTurma(t.id!)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Excluir Definitivamente">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              {turmasListadas.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhuma turma encontrada.</p>}
            </ul>
          </div>
        </section>

        {/* CARD: DISCIPLINAS */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-100 bg-indigo-50/30 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">3. Disciplinas</h2>
            {editingDisciplinaId && (
              <button onClick={cancelEditDisciplina} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
                <X className="w-3 h-3" /> Cancelar Edição
              </button>
            )}
          </div>
          
          <div className="p-4 border-b border-gray-100 shrink-0">
            <form onSubmit={handleSaveDisciplina} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Turma Pai</label>
                <select
                  required
                  value={disciplinaTurmaId}
                  onChange={e => setDisciplinaTurmaId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="" disabled>Selecione uma turma...</option>
                  {turmasAll.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Preenchimento Rápido (Catálogo)</label>
                <select
                  disabled={isPreenchimentoRapidoDisabled}
                  onChange={e => {
                    if (!e.target.value) return;
                    const parts = e.target.value.split('|');
                    const nome = parts[0];
                    const chAulaVal = Number(parts[1]);
                    setDisciplinaNome(nome);
                    setDisciplinaChAula(chAulaVal);
                    setDisciplinaChRelogio(Math.round(chAulaVal * 0.83333));
                    e.target.value = ''; // reseta após o uso
                  }}
                  className={`w-full text-sm border rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none mb-3 ${isPreenchimentoRapidoDisabled ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-indigo-50/50 border-gray-300'}`}
                  defaultValue=""
                >
                  {isPreenchimentoRapidoDisabled ? (
                    <option value="" disabled>Indisponível para este curso</option>
                  ) : (
                    <>
                      <option value="" disabled>Escolha uma disciplina...</option>
                      {catalogoPPC.filter(d => d.curso === catType).map((d, i) => (
                        <option key={`cat-${i}`} value={`${d.nome}|${d.chAula}`}>{d.nome} ({d.chAula}h)</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome da Disciplina</label>
                <input
                  type="text"
                  required
                  value={disciplinaNome}
                  onChange={e => setDisciplinaNome(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: Matemática"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">CH Aula</label>
                  <input
                    type="number"
                    required
                    value={disciplinaChAula}
                    onChange={e => {
                      const chAulaVal = e.target.value ? Number(e.target.value) : '';
                      setDisciplinaChAula(chAulaVal);
                      if (chAulaVal !== '') {
                        setDisciplinaChRelogio(Math.round(chAulaVal * 0.83333));
                      } else {
                        setDisciplinaChRelogio('');
                      }
                    }}
                    className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="Ex: 80"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">CH Relógio</label>
                  <input
                    type="number"
                    required
                    readOnly
                    disabled
                    value={disciplinaChRelogio}
                    className="w-full text-sm border border-gray-300 rounded p-2 bg-gray-100 text-gray-500 cursor-not-allowed outline-none"
                    placeholder="Auto."
                  />
                </div>
              </div>
              <button type="submit" className={`w-full text-white text-sm font-medium py-2 rounded transition-colors ${editingDisciplinaId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {editingDisciplinaId ? 'Atualizar Disciplina' : 'Adicionar Disciplina'}
              </button>
            </form>
          </div>

          <div className="p-4 flex-1 overflow-y-auto bg-gray-50/50 flex flex-col">
            <div className="flex gap-2 mb-4 border-b border-gray-200 pb-2">
              <button 
                onClick={() => setViewDisciplinas('ativas')} 
                className={`text-xs font-bold px-3 py-1.5 rounded transition-colors ${viewDisciplinas === 'ativas' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                Ativas
              </button>
              <button 
                onClick={() => setViewDisciplinas('arquivadas')} 
                className={`text-xs font-bold px-3 py-1.5 rounded transition-colors ${viewDisciplinas === 'arquivadas' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                Arquivadas
              </button>
            </div>
            <div className="mb-3 flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Turma</label>
                <select
                  value={filtroTurmaId}
                  onChange={e => setFiltroTurmaId(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Todas as turmas</option>
                  {turmasAll.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Modalidade</label>
                <select
                  value={filtroModalidade}
                  onChange={e => setFiltroModalidade(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Todas</option>
                  <option value="Técnico Integrado">Integrado</option>
                  <option value="Técnico Subsequente">Subsequente</option>
                </select>
              </div>
            </div>
            <ul className="space-y-2">
              {disciplinasListadas.map(d => (
                <li key={d.id} className="bg-white p-3 border border-gray-200 rounded shadow-sm group">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">{d.nome}</div>
                      <div className="text-[10px] text-gray-500 flex gap-3 mt-1">
                        <span>Turma: {turmasAll.find(t => t.id === d.turmaId)?.nome || 'Desconhecida'}</span>
                        <span className="font-medium">CH Aula: {d.chAula}</span>
                        <span className="font-medium">CH Rel: {d.chRelogio}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {viewDisciplinas === 'ativas' ? (
                        <>
                          <button onClick={() => handleEditDisciplina(d)} className="p-1 text-gray-400 hover:text-indigo-600 transition-colors" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleArchiveDisciplina(d.id!, true)} className="p-1 text-gray-400 hover:text-orange-600 transition-colors" title="Arquivar">
                            <Archive className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleArchiveDisciplina(d.id!, false)} className="p-1 text-gray-400 hover:text-green-600 transition-colors" title="Restaurar">
                            <ArchiveRestore className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteDisciplina(d.id!)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Excluir Definitivamente">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              {disciplinasListadas.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhuma disciplina encontrada.</p>}
            </ul>
          </div>
        </section>

      </div>
    </div>
  );
};
