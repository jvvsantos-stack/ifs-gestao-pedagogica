import React, { useState, useRef } from 'react';
import { db } from '../db/database';
import type { Turma, Aluno, Disciplina, Nota, AvaliacaoFinal } from '../db/database';
import { Users, FolderOpen, ArrowLeft, UserPlus, BookOpen, Edit2, Trash2, Upload, X, ClipboardList } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as XLSX from 'xlsx';
import { ConfirmModal } from './ConfirmModal';
import { injetarDadosDeTeste } from '../utils/mockData';
import { ModalOcorrencias } from './ModalOcorrencias';

interface Props {
  onLogout?: () => void;
}

export const TurmasView: React.FC<Props> = () => {
  const [selectedCursoId, setSelectedCursoId] = useState<string>('');
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [alunosModalTurma, setAlunosModalTurma] = useState<Turma | null>(null);

  const handleOpenTurma = async (t: Turma) => {
    await db.turmas.update(t.id!, { lastAccessed: Date.now() });
    setSelectedTurma(t);
  };

  const cursos = useLiveQuery(() => db.cursos.toArray()) || [];
  const turmasAll = useLiveQuery(() => db.turmas.toArray()) || [];
  const todosAlunos = useLiveQuery(() => db.alunos.toArray()) || [];
  const todasDisciplinas = useLiveQuery(() => db.disciplinas.toArray()) || [];

  const turmasAtivas = turmasAll.filter(t => !t.arquivado);
  const turmasListadas = selectedCursoId 
    ? turmasAtivas.filter(t => t.cursoId === Number(selectedCursoId)) 
    : turmasAtivas;

  if (selectedTurma) {
    return <DiarioTurma turma={selectedTurma} onBack={() => setSelectedTurma(null)} />;
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Turmas Ativas</h2>
            <p className="text-gray-500 text-sm">Selecione uma turma para acessar o diário</p>
          </div>
          
          <div className="w-64">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Filtrar por Curso</label>
            <select
              value={selectedCursoId}
              onChange={e => setSelectedCursoId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="">Todos os Cursos</option>
              {cursos.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {turmasListadas.map(t => {
            const curso = cursos.find(c => c.id === t.cursoId);
            const qtdAlunos = todosAlunos.filter(a => a.turmaId === t.id).length;
            const qtdDisciplinas = todasDisciplinas.filter(d => d.turmaId === t.id).length;
            return (
              <div key={t.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col h-full">
                {/* Top Row */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2.5 rounded-lg shrink-0">
                      <Users className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-lg font-bold text-gray-800 leading-tight">{t.nome}</h3>
                      <p className="text-sm text-gray-500 line-clamp-1">{curso?.nome || 'Curso Desconhecido'}</p>
                    </div>
                  </div>
                  <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap shrink-0">
                    {t.anoLetivo || 'Sem Período'}
                  </span>
                </div>
                
                {/* Middle Row */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                    Cód: {t.codigo}
                  </span>
                  <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded flex items-center gap-1">
                    👥 {qtdAlunos} Alunos
                  </span>
                  <span className="bg-purple-50 text-purple-600 text-xs px-2 py-1 rounded flex items-center gap-1">
                    📚 {qtdDisciplinas} Disciplinas
                  </span>
                </div>
                
                {/* Rodapé de Ações */}
                <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleOpenTurma(t); }}
                    className="flex-1 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Abrir Diário
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setAlunosModalTurma(t); }}
                    className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Users className="w-4 h-4" />
                    Alunos
                  </button>
                </div>
              </div>
            );
          })}
          
          {turmasListadas.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
              Nenhuma turma encontrada para o filtro selecionado.
            </div>
          )}
        </div>
      </main>

      {alunosModalTurma && (
        <GerenciarAlunosModal turma={alunosModalTurma} onClose={() => setAlunosModalTurma(null)} />
      )}
    </div>
  );
};

const DiarioTurma: React.FC<{ turma: Turma, onBack: () => void }> = ({ turma, onBack }) => {
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<number | 'consolidacao'>(1);
  
  const disciplinasTodas = useLiveQuery(() => db.disciplinas.where('turmaId').equals(turma.id!).toArray()) || [];
  const disciplinas = disciplinasTodas.filter(d => !d.arquivado);
  const alunos = useLiveQuery(() => db.alunos.where('turmaId').equals(turma.id!).toArray()) || [];
  const curso = useLiveQuery(() => db.cursos.get(turma.cursoId));
  const notasAll = useLiveQuery(() => db.notas.toArray()) || [];
  const isSubsequente = curso?.modalidade === 'Técnico Subsequente';
  const etapasParaRenderizar = isSubsequente ? [1, 2] : [1, 2, 3, 4];

  if (selectedDisciplinaId) {
    const disc = disciplinas.find(d => d.id === selectedDisciplinaId);
    if (disc) {
      return (
        <DiarioDisciplina 
          turma={turma} 
          disciplina={disc} 
          alunos={alunos.sort((a, b) => a.nome.localeCompare(b.nome))} 
          initialTab={activeTab} 
          onBack={() => setSelectedDisciplinaId(null)} 
        />
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-gray-800 font-semibold text-lg">{turma.nome}</h1>
          <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded font-bold ml-2">
            {turma.codigo}
          </span>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800">Disciplinas da Turma</h2>
          <p className="text-gray-500 text-sm">Selecione uma etapa para iniciar o lançamento de notas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {disciplinas.map(d => {
            const discNotas = notasAll.filter(n => n.disciplinaId === d.id);
            let hasLancamentoParcial = false;
            let totalEtapasCompletas = 0;
            const etapaStatus: Record<number, 'vazio' | 'parcial' | 'completo'> = {};

            for (const etapa of etapasParaRenderizar) {
              let temNotaCount = 0;
              let semNotaCount = 0;

              for (const aluno of alunos) {
                const n = discNotas.find(x => x.alunoId === aluno.id && x.etapa === etapa);
                if (n && n.nota !== undefined && n.nota !== null && String(n.nota) !== '') {
                  temNotaCount++;
                } else {
                  semNotaCount++;
                }
              }

              if (temNotaCount > 0 && semNotaCount > 0) {
                etapaStatus[etapa] = 'parcial';
                hasLancamentoParcial = true;
              } else if (temNotaCount > 0 && semNotaCount === 0) {
                etapaStatus[etapa] = 'completo';
                totalEtapasCompletas++;
              } else {
                etapaStatus[etapa] = 'vazio';
              }
            }

            let isAnoConcluido = false;
            if (!hasLancamentoParcial && totalEtapasCompletas === etapasParaRenderizar.length && alunos.length > 0) {
              isAnoConcluido = true;
            }

            let cardStyle = "bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow";
            let iconBgClass = "bg-blue-100";
            let iconTextClass = "text-blue-600";
            let statusText = null;

            if (hasLancamentoParcial) {
              cardStyle = "bg-red-50/20 rounded-xl shadow-md shadow-red-500/30 border border-red-400 p-5 hover:shadow-lg transition-shadow";
              iconBgClass = "bg-red-100";
              iconTextClass = "text-red-600";
              statusText = <span className="text-red-600 font-bold">⚠️ Falta lançamento</span>;
            } else if (isAnoConcluido) {
              cardStyle = "bg-green-50/20 rounded-xl shadow-md shadow-green-500/30 border border-green-400 p-5 hover:shadow-lg transition-shadow";
              iconBgClass = "bg-green-100";
              iconTextClass = "text-green-600";
              statusText = <span className="text-green-600 font-bold">✔️ Ano Concluído</span>;
            }

            return (
            <div key={d.id} className={cardStyle}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`${iconBgClass} p-2 rounded-lg`}>
                  <BookOpen className={`w-5 h-5 ${iconTextClass}`} />
                </div>
                <h3 className="font-bold text-gray-800 text-lg flex-1 truncate" title={d.nome}>{d.nome}</h3>
              </div>
              <p className="text-xs text-gray-500 mb-4 flex justify-between">
                <span>Carga Horária: {d.chAula}h</span>
                {statusText}
              </p>

              <div className="grid grid-cols-2 gap-2">
                {etapasParaRenderizar.map(etapa => {
                  let btnStyle = "border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 py-1.5 rounded text-sm font-medium transition-colors";
                  if (etapaStatus[etapa] === 'parcial') {
                    btnStyle = "bg-red-50 border border-red-400 text-red-700 shadow-sm shadow-red-500/40 hover:bg-red-100 hover:border-red-500 py-1.5 rounded text-sm font-bold transition-colors";
                  } else if (etapaStatus[etapa] === 'completo') {
                    btnStyle = "bg-green-50 border border-green-400 text-green-700 shadow-sm shadow-green-500/40 hover:bg-green-100 hover:border-green-500 py-1.5 rounded text-sm font-bold transition-colors";
                  }
                  
                  return (
                    <button
                      key={etapa}
                      onClick={() => { setActiveTab(etapa); setSelectedDisciplinaId(d.id!); }}
                      className={btnStyle}
                    >
                      {etapa}ª Etapa
                    </button>
                  );
                })}
                <button
                  onClick={() => { setActiveTab('consolidacao'); setSelectedDisciplinaId(d.id!); }}
                  className="col-span-2 mt-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded text-sm font-bold transition-colors"
                >
                  Consolidação
                </button>
              </div>
            </div>
          )})}
          {disciplinas.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
              Nenhuma disciplina cadastrada para esta turma.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const GerenciarAlunosModal: React.FC<{ turma: Turma, onClose: () => void }> = ({ turma, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const alunos = useLiveQuery(() => db.alunos.where('turmaId').equals(turma.id!).toArray()) || [];
  const alunosSorted = [...alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  
  const disciplinas = useLiveQuery(() => db.disciplinas.where('turmaId').equals(turma.id!).toArray()) || [];
  const curso = useLiveQuery(() => db.cursos.get(turma.cursoId));
  const isSubsequente = curso?.modalidade === 'Técnico Subsequente';

  const [alunoModal, setAlunoModal] = useState<{ isOpen: boolean, mode: 'add' | 'edit', id: number | null, nome: string }>({ isOpen: false, mode: 'add', id: null, nome: '' });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, mode: 'single' | 'all', id: number | null, nome?: string }>({ isOpen: false, mode: 'single', id: null });
  const [isInjecting, setIsInjecting] = useState(false);
  const [ocorrenciasModal, setOcorrenciasModal] = useState<Aluno | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const normalize = (text: string) => String(text || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

  const handleAddManual = () => setAlunoModal({ isOpen: true, mode: 'add', id: null, nome: '' });
  const handleEdit = (aluno: Aluno) => setAlunoModal({ isOpen: true, mode: 'edit', id: aluno.id!, nome: aluno.nome });
  const handleDelete = (aluno: Aluno) => setDeleteModal({ isOpen: true, mode: 'single', id: aluno.id!, nome: aluno.nome });
  const handleDeleteAll = () => setDeleteModal({ isOpen: true, mode: 'all', id: null });

  const confirmSaveAluno = async () => {
    const nomeLimpo = alunoModal.nome.trim();
    if (!nomeLimpo) return;

    if (alunoModal.mode === 'add') {
      const existe = alunos.some(a => normalize(a.nome) === normalize(nomeLimpo));
      if (!existe) {
        await db.alunos.add({ turmaId: turma.id!, nome: nomeLimpo });
        setAlunoModal({ ...alunoModal, isOpen: false });
      } else {
        alert('Este aluno já está cadastrado na turma.');
      }
    } else if (alunoModal.mode === 'edit' && alunoModal.id) {
      await db.alunos.update(alunoModal.id, { nome: nomeLimpo });
      setAlunoModal({ ...alunoModal, isOpen: false });
    }
  };

  const confirmDelete = async () => {
    if (deleteModal.mode === 'all') {
      const ids = alunos.map(a => a.id!);
      await db.notas.where('alunoId').anyOf(ids).delete();
      await db.avaliacoes_finais.where('alunoId').anyOf(ids).delete();
      await db.alunos.where({ turmaId: turma.id! }).delete();
    } else if (deleteModal.mode === 'single' && deleteModal.id) {
      await db.alunos.delete(deleteModal.id);
      await db.notas.where('alunoId').equals(deleteModal.id).delete();
      await db.avaliacoes_finais.where('alunoId').equals(deleteModal.id).delete();
    }
    setDeleteModal({ ...deleteModal, isOpen: false });
  };

  const handleInjetarMock = async () => {
    if (disciplinas.length === 0) {
      alert('A turma precisa ter pelo menos 1 disciplina cadastrada para gerar os dados de teste.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Injetar Dados de Teste',
      message: 'ATENÇÃO: Esta ação APAGARÁ todos os alunos e notas atuais desta turma e os substituirá por 10 perfis de teste que cobrem absolutamente todos os casos de regra de negócio do Conselho. Deseja continuar?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsInjecting(true);
        try {
          await injetarDadosDeTeste(turma.id!, disciplinas, isSubsequente, db);
          alert('✅ Dados de teste injetados com sucesso! Feche este modal e abra o diário ou o painel de consolidação para conferir os resultados.');
          onClose();
        } catch (error) {
          console.error(error);
          alert('Erro ao injetar dados de teste.');
        } finally {
          setIsInjecting(false);
        }
      }
    });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isCSV = file.name.endsWith('.csv');
      
      const readAsText = (f: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(f, 'ISO-8859-1');
        });
      };

      const readAsArrayBuffer = (f: File): Promise<ArrayBuffer> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target?.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(f);
        });
      };

      let rawNames: string[] = [];

      if (isCSV) {
        const text = await readAsText(file);
        const lines = text.split('\n');
        for (const line of lines) {
          const cells = line.split(';');
          for (const cell of cells) {
            const val = cell.trim();
            if (val.length > 5) {
              rawNames.push(val);
              break;
            }
          }
        }
      } else {
        const buffer = await readAsArrayBuffer(file);
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[firstSheetName], { header: 1 });
        
        for (const row of sheetData) {
          if (!row || !Array.isArray(row)) continue;
          for (const cell of row) {
            const val = String(cell || '').trim();
            if (val.length > 5) {
              rawNames.push(val);
              break;
            }
          }
        }
      }

      const invalidKeywords = ['instituto', 'diário', 'diario', 'nome', 'aluno', 'componente', 'situação', 'ordem'];
      const validNames = rawNames.filter(name => {
        const lower = normalize(name);
        if (lower.length < 5) return false;
        return !invalidKeywords.some(kw => lower.includes(kw));
      });

      const uniqueNewNames = Array.from(new Set(validNames));
      
      const toAdd: Aluno[] = [];
      const currentNormalizedNames = new Set(alunos.map(a => normalize(a.nome)));

      for (const name of uniqueNewNames) {
        if (!currentNormalizedNames.has(normalize(name))) {
          toAdd.push({ turmaId: turma.id!, nome: name });
        }
      }

      if (toAdd.length > 0) {
        await db.alunos.bulkAdd(toAdd);
        alert(`${toAdd.length} alunos importados com sucesso!`);
      } else {
        alert('Nenhum aluno novo encontrado para importação (talvez já estejam cadastrados ou o arquivo seja inválido).');
      }
      
    } catch (error) {
      console.error(error);
      alert('Erro ao processar o arquivo. Verifique o formato.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Gerenciar Alunos da Turma</h2>
            <p className="text-gray-500 text-sm">{turma.nome}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-3">
          <button
            onClick={handleAddManual}
            className="flex-1 bg-white border border-gray-300 hover:border-indigo-400 hover:text-indigo-600 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar Manualmente
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Importar Lista (Excel/CSV)
          </button>
          
          <button
            onClick={handleDeleteAll}
            className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm transition-colors shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            Excluir Todos
          </button>
          
          <button
            onClick={handleInjetarMock}
            disabled={isInjecting}
            className="flex-1 border border-dashed border-purple-400 bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 text-sm transition-colors shadow-sm disabled:opacity-50"
            title="Popula a turma com 6 alunos cobrindo todos os casos do Conselho de Classe"
          >
            {isInjecting ? 'Injetando...' : '👾 Injetar Dados de Teste'}
          </button>

          <input 
            type="file" 
            accept=".xlsx, .csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImportFile}
          />
        </div>

        <div className="flex-1 overflow-auto p-5">
          {alunosSorted.length === 0 ? (
            <div className="text-center py-10 text-gray-500 border border-dashed border-gray-300 rounded-lg">
              Nenhum aluno cadastrado. Adicione manualmente ou importe uma lista.
            </div>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-gray-600 font-semibold">Nome do Aluno</th>
                  <th className="py-2 text-right text-gray-600 font-semibold w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alunosSorted.map(aluno => (
                  <tr key={aluno.id} className="hover:bg-gray-50 group">
                    <td className="py-2 font-medium text-gray-800">{aluno.nome}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setOcorrenciasModal(aluno)}
                          className="text-orange-500 hover:bg-orange-50 p-1.5 rounded transition-colors"
                          title="Registrar Ocorrência"
                        >
                          <ClipboardList className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(aluno)}
                          className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"
                          title="Editar Nome"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(aluno)}
                          className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                          title="Excluir Aluno"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {alunoModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {alunoModal.mode === 'add' ? 'Adicionar Novo Aluno' : 'Editar Aluno'}
            </h3>
            <input
              type="text"
              autoFocus
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-6"
              placeholder="Nome completo do aluno"
              value={alunoModal.nome}
              onChange={e => setAlunoModal({ ...alunoModal, nome: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && confirmSaveAluno()}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setAlunoModal({ ...alunoModal, isOpen: false })}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmSaveAluno}
                className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Excluir {deleteModal.mode === 'all' ? 'Todos os Alunos' : 'Aluno'}</h3>
            <p className="text-gray-500 mb-6">
              {deleteModal.mode === 'all' 
                ? 'Tem certeza que deseja excluir TODOS os alunos desta turma? Todas as notas e faltas associadas a eles serão apagadas permanentemente.'
                : `Tem certeza que deseja excluir o aluno "${deleteModal.nome}"? Todas as notas e avaliações deste aluno também serão excluídas.`
              }
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {ocorrenciasModal && (
        <ModalOcorrencias 
          aluno={ocorrenciasModal} 
          onClose={() => setOcorrenciasModal(null)} 
        />
      )}
    </div>
  );
};

const DiarioDisciplina: React.FC<{ 
  turma: Turma; 
  disciplina: Disciplina; 
  alunos: Aluno[]; 
  initialTab: number | 'consolidacao'; 
  onBack: () => void;
}> = ({ turma, disciplina, alunos, initialTab, onBack }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const curso = useLiveQuery(() => db.cursos.get(turma.cursoId));
  const isSubsequente = curso?.modalidade === 'Técnico Subsequente';
  const etapasParaRenderizar = isSubsequente ? [1, 2] : [1, 2, 3, 4];
  
  const notasRaw = useLiveQuery(() => db.notas.where('disciplinaId').equals(disciplina.id!).toArray(), [disciplina.id, activeTab]) || [];
  const avaliacoesRaw = useLiveQuery(() => db.avaliacoes_finais.where('disciplinaId').equals(disciplina.id!).toArray(), [disciplina.id, activeTab]) || [];



  const notasMap = React.useMemo(() => {
    const map: Record<number, Record<number, Nota>> = {};
    notasRaw.forEach(n => {
      if (!map[n.alunoId]) map[n.alunoId] = {};
      map[n.alunoId][n.etapa!] = n;
    });
    return map;
  }, [notasRaw]);

  const avaliacoesMap = React.useMemo(() => {
    const map: Record<number, AvaliacaoFinal> = {};
    avaliacoesRaw.forEach(a => {
      map[a.alunoId] = a;
    });
    return map;
  }, [avaliacoesRaw]);

  const handleSaveNota = async (alunoId: number, etapa: number, field: keyof Nota, value: string, e?: React.FocusEvent<HTMLInputElement>) => {
    const numValue = value === '' ? undefined : Number(value);

    if (field === 'faltas' && numValue !== undefined) {
      let faltasOutrasEtapas = 0;
      for (let i = 1; i <= (isSubsequente ? 2 : 4); i++) {
        if (i !== etapa) {
          const n = notasMap[alunoId]?.[i];
          if (n && n.faltas !== undefined && n.faltas !== null) {
            faltasOutrasEtapas += n.faltas;
          }
        }
      }
      
      const somaProvisoria = faltasOutrasEtapas + numValue;
      if (somaProvisoria > disciplina.chAula) {
        alert(`Erro: O limite de faltas excede a carga horária total da disciplina (${disciplina.chAula} horas).`);
        if (e && e.target) {
           const existingVal = notasMap[alunoId]?.[etapa]?.faltas;
           e.target.value = existingVal !== undefined && existingVal !== null ? String(existingVal) : '';
        }
        return;
      }
    }

    const existing = await db.notas.where({ alunoId, disciplinaId: disciplina.id!, etapa }).first();

    if (existing && existing.id) {
      await db.notas.update(existing.id, { [field]: numValue });
    } else if (numValue !== undefined) {
      await db.notas.add({
        alunoId,
        disciplinaId: disciplina.id!,
        etapa,
        nota: field === 'nota' ? numValue : undefined,
        faltas: field === 'faltas' ? numValue : undefined
      });
    }
  };

  const handleSaveAvaliacao = async (alunoId: number, field: keyof AvaliacaoFinal, value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    const existing = await db.avaliacoes_finais.where({ alunoId, disciplinaId: disciplina.id! }).first();

    if (existing && existing.id) {
      await db.avaliacoes_finais.update(existing.id, { [field]: numValue });
    } else {
      await db.avaliacoes_finais.add({
        alunoId,
        disciplinaId: disciplina.id!,
        [field]: numValue
      });
    }
  };

  const formatNotaBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value !== '') {
      e.target.value = Number(e.target.value).toFixed(1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, tipo: 'nota' | 'faltas', index: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (tipo === 'nota') {
        const nextInput = document.getElementById(`faltas-${index}`);
        if (nextInput) nextInput.focus();
      } else if (tipo === 'faltas') {
        const nextInput = document.getElementById(`nota-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const calcularSituacao = (alunoId: number) => {
    const numEtapas = isSubsequente ? 2 : 4;
    const limiteFaltas = Math.floor(disciplina.chRelogio * 0.25);
    const n = notasMap[alunoId] || {};
    const av = avaliacoesMap[alunoId] || {};

    let notasPreenchidas = [];
    let faltasTot = 0;
    
    for (let i = 1; i <= numEtapas; i++) {
      const notaObj = n[i];
      if (notaObj && notaObj.nota !== undefined && notaObj.nota !== null && String(notaObj.nota) !== '') {
        notasPreenchidas.push(Number(notaObj.nota));
      }
      faltasTot += (notaObj?.faltas || 0);
    }

    const somaNotas = notasPreenchidas.reduce((a, b) => a + b, 0);
    const todasNotasDigitadas = notasPreenchidas.length === numEtapas;

    let mediaParcialStr = '-';
    let mediaFinalStr = '-';
    let mediaFinalOrigStr: string | null = null;
    let isAprovadoConselho = false;
    let mediaParcialNum = 0;

    if (todasNotasDigitadas) {
      mediaParcialNum = somaNotas / numEtapas;
      mediaParcialStr = mediaParcialNum.toFixed(1);
      
      const notaProvaFinal = av?.provaFinal;
      let finalMediaOrig = mediaParcialNum;
      if (notaProvaFinal !== undefined && notaProvaFinal !== null && String(notaProvaFinal) !== '') {
          finalMediaOrig = (mediaParcialNum + Number(notaProvaFinal)) / 2;
      }
      mediaFinalOrigStr = finalMediaOrig.toFixed(1);

      if (av?.statusConselho === 'aprovado' || av?.aprovadoConselho) {
        mediaFinalStr = '5.0';
        isAprovadoConselho = true;
      } else if (notaProvaFinal === undefined || notaProvaFinal === null || String(notaProvaFinal) === '') {
        mediaFinalStr = mediaParcialStr;
      } else {
        mediaFinalStr = finalMediaOrig.toFixed(1);
      }
    }

    let situacao = '';
    let situacaoCor = 'text-gray-600';

    const faltasExcedidas = faltasTot > limiteFaltas;

    if (!todasNotasDigitadas) {
        situacao = 'Cursando';
        situacaoCor = 'text-blue-600';
    } else if (av?.statusConselho === 'aprovado' || av?.aprovadoConselho) {
        situacao = 'Aprov. Conselho';
        situacaoCor = 'text-green-600 font-bold';
    } else if (av?.statusConselho === 'reprovado') {
        situacao = 'Reprov. Conselho';
        situacaoCor = 'text-red-600 font-bold';
    } else {
        // Se todas as notas foram digitadas e não reprovou por falta
        const mediaParcial = somaNotas / numEtapas;
        const notaProvaFinal = av?.provaFinal;
        
        if (notaProvaFinal === undefined || notaProvaFinal === null || String(notaProvaFinal) === '') {
            if (mediaParcial >= 6.0) {
                situacao = 'Aprovado';
                situacaoCor = 'text-green-600 font-bold';
            } else {
                situacao = 'Prova Final';
                situacaoCor = 'text-orange-500 font-bold';
            }
        } else {
            // Já fez a Prova Final
            const mediaFinal = (mediaParcial + Number(notaProvaFinal)) / 2;
            if (mediaFinal >= 5.0) {
                situacao = 'Aprovado';
                situacaoCor = 'text-green-600 font-bold';
            } else {
                situacao = 'Reprovado';
                situacaoCor = 'text-red-600 font-bold';
            }
        }
    }

    return { status: situacao, cor: situacaoCor, mediaParcial: mediaParcialStr, mediaFinal: mediaFinalStr, mediaFinalOrig: mediaFinalOrigStr, isAprovadoConselho, totalFaltas: faltasTot, faltasExcedidas };
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col gap-2 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Turma
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-gray-800 font-semibold text-lg">{disciplina.nome}</h1>
          <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded font-bold ml-2">
            {turma.codigo}
          </span>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {etapasParaRenderizar.map(etapa => (
            <button
              key={etapa}
              onClick={() => setActiveTab(etapa)}
              className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors border-b-2 ${
                activeTab === etapa 
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {etapa}ª Etapa
            </button>
          ))}
          <button
            onClick={() => setActiveTab('consolidacao')}
            className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-colors border-b-2 ${
              activeTab === 'consolidacao' 
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            Consolidação
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-auto">
          <table key={activeTab} className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 sticky left-0 bg-gray-100 z-20 min-w-[250px] shadow-[1px_0_0_0_#e5e7eb]">
                  Aluno
                </th>
                
                {typeof activeTab === 'number' && (
                  <>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-l border-gray-200 w-32">Nota</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-l border-gray-200 w-32">Faltas</th>
                  </>
                )}

                {activeTab === 'consolidacao' && (
                  <>
                    {etapasParaRenderizar.map(etapa => (
                      <th key={etapa} className="px-2 py-3 text-center font-semibold text-gray-700 border-b border-l border-gray-200 w-16" title={`Nota ${etapa}`}>N{etapa}</th>
                    ))}
                    <th className="px-2 py-3 text-center font-semibold text-gray-700 border-b border-l border-gray-200 w-24">Faltas (Tot)</th>
                    <th className="px-2 py-3 text-center font-bold text-gray-800 border-b border-l border-gray-200 w-24 bg-gray-200">M. Parcial</th>
                    <th className="px-2 py-3 text-center font-semibold text-blue-700 border-b border-l border-gray-200 w-24 bg-blue-50">Prova Final</th>
                    <th className="px-2 py-3 text-center font-bold text-gray-800 border-b border-l border-gray-200 w-24 bg-gray-200">M. Final</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-l border-gray-200 min-w-[150px]">Situação</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alunos.map((aluno, index) => {
                const notas = notasMap[aluno.id!] || {};
                const av = avaliacoesMap[aluno.id!] || {};
                const currentEtapa = typeof activeTab === 'number' ? activeTab : 1;
                
                return (
                  <tr key={aluno.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 font-medium text-gray-800 sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[1px_0_0_0_#f3f4f6]">
                      <div className="truncate flex items-center gap-2">
                        <span>{aluno.nome}</span>
                      </div>
                    </td>

                    {/* Visão de Etapa (1 a 4) */}
                    {typeof activeTab === 'number' && (
                      <>
                        <td className="px-2 py-2 border-l border-gray-100">
                          <input 
                            id={`nota-${index}`}
                            type="number" 
                            step="0.1" min="0" max="10"
                            className="w-full bg-transparent outline-none text-center font-medium" 
                            defaultValue={notas[currentEtapa]?.nota !== undefined && notas[currentEtapa]?.nota !== null ? Number(notas[currentEtapa].nota).toFixed(1) : ''}
                            onBlur={(e) => {
                              formatNotaBlur(e);
                              handleSaveNota(aluno.id!, currentEtapa, 'nota', e.target.value);
                            }}
                            onKeyDown={(e) => handleKeyDown(e, 'nota', index)}
                          />
                        </td>
                        <td className="px-2 py-2 border-l border-gray-100">
                          <input 
                            id={`faltas-${index}`}
                            type="number" 
                            step="1" min="0"
                            className="w-full bg-transparent outline-none text-center" 
                            defaultValue={notas[currentEtapa]?.faltas !== undefined && notas[currentEtapa]?.faltas !== null ? notas[currentEtapa].faltas : ''}
                            onBlur={(e) => handleSaveNota(aluno.id!, currentEtapa, 'faltas', e.target.value, e)}
                            onKeyDown={(e) => handleKeyDown(e, 'faltas', index)}
                          />
                        </td>
                      </>
                    )}

                    {/* Visão de Consolidação */}
                    {activeTab === 'consolidacao' && (() => {
                      const sit = calcularSituacao(aluno.id!);
                      return (
                        <>
                          {etapasParaRenderizar.map(etapa => (
                            <td key={etapa} className="px-2 py-2 border-l border-gray-100 text-center text-gray-600">{notas[etapa]?.nota !== undefined ? Number(notas[etapa].nota).toFixed(1) : '-'}</td>
                          ))}
                          <td className={`px-2 py-2 border-l border-gray-100 text-center font-medium ${sit.totalFaltas > (disciplina.chAula * 0.25) ? 'text-red-600' : 'text-gray-700'}`}>
                            {sit.totalFaltas}
                          </td>
                          <td className="px-2 py-2 border-l border-gray-200 bg-gray-50 text-center font-bold text-gray-800">
                            {sit.mediaParcial}
                          </td>
                          <td className="px-2 py-2 border-l border-gray-100 bg-blue-50/50">
                            <input 
                              type="number" 
                              step="0.1" min="0" max="10"
                              className="w-full bg-transparent outline-none text-center text-blue-800 font-medium placeholder-blue-300" 
                              placeholder="-"
                              defaultValue={av.provaFinal !== undefined ? Number(av.provaFinal).toFixed(1) : ''}
                              onBlur={(e) => {
                                formatNotaBlur(e);
                                handleSaveAvaliacao(aluno.id!, 'provaFinal', e.target.value);
                              }}
                            />
                          </td>
                          <td className="px-2 py-2 border-l border-gray-200 bg-gray-50 text-center font-bold text-gray-900">
                            {sit.isAprovadoConselho ? (
                               <div className="flex flex-col items-center justify-center">
                                  <span className="text-blue-600 font-semibold">{sit.mediaFinal}</span>
                                  <span className="text-xs text-gray-500 font-normal">({sit.mediaFinalOrig})</span>
                               </div>
                            ) : (
                               <span>{sit.mediaFinal}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 border-l border-gray-100">
                            <div className="flex flex-col items-center justify-center text-center">
                              <span className={`font-bold ${sit.cor}`}>{sit.status}</span>
                              {sit.faltasExcedidas && (
                                <span className="text-xs text-red-600 mt-1 font-bold">Faltas acima do limite</span>
                              )}
                            </div>
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                );
              })}
              {alunos.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-500">
                    Nenhum aluno cadastrado nesta turma.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
