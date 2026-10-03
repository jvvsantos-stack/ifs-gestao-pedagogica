import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Turma, type Curso, type Aluno, type Estagio } from '../db/database';
import { Plus, Edit2, Trash2, CheckCircle, Archive, Save, X, Briefcase, RotateCcw } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export const EstagiosView: React.FC = () => {
  const cursos = useLiveQuery(() => db.cursos.toArray()) || [];
  const turmasAll = useLiveQuery(() => db.turmas.toArray()) || [];
  const alunosAll = useLiveQuery(() => db.alunos.toArray()) || [];
  
  const [selectedCursoId, setSelectedCursoId] = useState<number | ''>('');
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('');
  const [selectedTurmaId, setSelectedTurmaId] = useState<number | ''>('');
  const [selectedAlunoId, setSelectedAlunoId] = useState<number | ''>('');
  
  const [formAlunoId, setFormAlunoId] = useState<number | ''>('');
  
  const [currentEstagio, setCurrentEstagio] = useState<Partial<Estagio> | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [showNaoFinalizado, setShowNaoFinalizado] = useState(false);
  
  const [finalizarData, setFinalizarData] = useState({ termino: '', nota: '', chTotal: '', avaliacao: '', comentarios: '' });
  const [motivoNaoFinalizado, setMotivoNaoFinalizado] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Limpeza em cascata
  useEffect(() => {
    setSelectedPeriodo('');
    setSelectedTurmaId('');
    setSelectedAlunoId('');
  }, [selectedCursoId]);

  useEffect(() => {
    setSelectedTurmaId('');
    setSelectedAlunoId('');
  }, [selectedPeriodo]);

  useEffect(() => {
    setSelectedAlunoId('');
  }, [selectedTurmaId]);

  const periodosDisponiveis = React.useMemo(() => {
    if (!selectedCursoId) return [];
    const turmasDoCurso = turmasAll.filter(t => t.cursoId === Number(selectedCursoId));
    const periodos = turmasDoCurso.map(t => t.anoLetivo).filter(Boolean) as string[];
    return Array.from(new Set(periodos)).sort();
  }, [selectedCursoId, turmasAll]);

  const turmasDisponiveis = React.useMemo(() => {
    if (!selectedCursoId || !selectedPeriodo) return [];
    return turmasAll.filter(t => t.cursoId === Number(selectedCursoId) && t.anoLetivo === selectedPeriodo);
  }, [selectedCursoId, selectedPeriodo, turmasAll]);

  const alunosDisponiveis = React.useMemo(() => {
    if (!selectedTurmaId) return [];
    return alunosAll.filter(a => a.turmaId === Number(selectedTurmaId)).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [selectedTurmaId, alunosAll]);

  const estagios = useLiveQuery(
    () => {
      if (selectedAlunoId) {
        return db.estagios.where('alunoId').equals(Number(selectedAlunoId)).toArray();
      }
      if (selectedTurmaId) {
        return db.estagios.where('turmaId').equals(Number(selectedTurmaId)).toArray();
      }
      return [];
    },
    [selectedTurmaId, selectedAlunoId]
  ) || [];

  const getAlunoNome = (id: number) => alunosAll.find(a => a.id === id)?.nome || 'Aluno não encontrado';

  const handleSaveEstagio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEstagio || !formAlunoId || !selectedTurmaId) return;

    if (currentEstagio.id) {
      await db.estagios.update(currentEstagio.id, {
        ...currentEstagio,
        alunoId: Number(formAlunoId),
      } as Estagio);
    } else {
      await db.estagios.add({
        ...currentEstagio,
        alunoId: Number(formAlunoId),
        turmaId: Number(selectedTurmaId),
        status: currentEstagio.status || 'Ativo',
      } as Estagio);
    }
    setShowForm(false);
    setCurrentEstagio(null);
    setFormAlunoId('');
  };

  const handleExcluir = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Estágio',
      message: 'Tem certeza que deseja excluir este estágio?',
      onConfirm: async () => {
        await db.estagios.delete(id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleArquivar = async (estagio: Estagio) => {
    await db.estagios.update(estagio.id!, { status: 'Arquivado' });
  };

  const handleSaveFinalizar = async () => {
    if (!currentEstagio?.id) return;
    await db.estagios.update(currentEstagio.id, {
      status: 'Finalizado',
      dadosFinalizacao: finalizarData as any
    });
    setShowFinalizar(false);
    setCurrentEstagio(null);
    setFinalizarData({ termino: '', nota: '', chTotal: '', avaliacao: '', comentarios: '' });
  };

  const handleSaveNaoFinalizado = async () => {
    if (!currentEstagio?.id || !motivoNaoFinalizado) return;
    await db.estagios.update(currentEstagio.id, {
      status: 'Não Finalizado',
      dadosFinalizacao: {
        termino: new Date().toISOString().split('T')[0],
        nota: '',
        chTotal: '',
        avaliacao: '',
        comentarios: '',
        motivoNaoFinalizado
      }
    });
    setShowNaoFinalizado(false);
    setCurrentEstagio(null);
    setMotivoNaoFinalizado('');
  };

  const handleReverterStatus = async (estagio: Estagio) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reverter Estágio',
      message: 'Deseja reverter este estágio para o status "Ativo"?',
      onConfirm: async () => {
        await db.estagios.update(estagio.id!, {
          status: 'Ativo',
          dadosFinalizacao: undefined
        });
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const openNewForm = () => {
    setCurrentEstagio({
      dadosEmpresa: { nome: '', ramo: '', endereco: '', telefone: '', bairroCidade: '', cep: '' },
      supervisor: { nome: '' },
      dadosEstagiario: { anoConclusao: '', endereco: '', telefone: '', bairroCidade: '', cep: '' },
      dadosEstagio: { inicio: '', funcaoPrincipal: '', areasAtuacao: '', chDiaria: '' },
      status: 'Ativo'
    });
    setFormAlunoId(selectedAlunoId || '');
    setShowForm(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-indigo-600" />
            Controle de Estágios
          </h1>
          <p className="text-gray-500 mt-2">Controle e acompanhamento de estágios dos alunos</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Curso</label>
          <select
            value={selectedCursoId}
            onChange={(e) => setSelectedCursoId(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Selecione o Curso...</option>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Período Letivo</label>
          <select
            value={selectedPeriodo}
            onChange={(e) => setSelectedPeriodo(e.target.value)}
            disabled={!selectedCursoId}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <option value="">Selecione o Período...</option>
            {periodosDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
          <select
            value={selectedTurmaId}
            onChange={(e) => setSelectedTurmaId(e.target.value ? Number(e.target.value) : '')}
            disabled={!selectedPeriodo}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <option value="">Selecione a Turma...</option>
            {turmasDisponiveis.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Aluno</label>
          <select
            value={selectedAlunoId}
            onChange={(e) => setSelectedAlunoId(e.target.value ? Number(e.target.value) : '')}
            disabled={!selectedTurmaId}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <option value="">Todos os Alunos...</option>
            {alunosDisponiveis.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
      </div>
      {selectedTurmaId && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Estágios Cadastrados</h2>
            <button
              onClick={openNewForm}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Cadastrar Novo Estágio
            </button>
          </div>

          {estagios.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum estágio cadastrado.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {estagios.map(estagio => (
                <div
                  key={estagio.id}
                  className={`p-5 rounded-xl border ${
                    estagio.status === 'Finalizado' 
                      ? 'shadow-lg border-l-4 border-l-green-500 bg-green-50 border-gray-200' 
                      : estagio.status === 'Não Finalizado'
                      ? 'shadow-lg border-l-4 border-l-orange-500 bg-orange-50 border-gray-200'
                      : estagio.status === 'Arquivado'
                      ? 'bg-gray-100 border-gray-200 opacity-75'
                      : 'bg-white border-gray-200 shadow-sm border-l-4 border-l-indigo-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg text-gray-900">{getAlunoNome(estagio.alunoId)}</span>
                      </div>
                      <h3 className="font-semibold text-indigo-700">{estagio.dadosEmpresa?.nome}</h3>
                      <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Função:</span> {estagio.dadosEstagio?.funcaoPrincipal}</p>
                      {estagio.dadosEstagio?.areasAtuacao && (
                        <p className="text-sm text-gray-600"><span className="font-medium">Área:</span> {estagio.dadosEstagio.areasAtuacao}</p>
                      )}
                      <div className="text-sm text-gray-500 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {estagio.dadosEstagio?.inicio && (
                          <span>Início: {new Date(estagio.dadosEstagio.inicio + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        )}
                        {estagio.dadosFinalizacao?.termino && (
                          <span>Término: {new Date(estagio.dadosFinalizacao.termino + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        )}
                        {estagio.status === 'Finalizado' && estagio.dadosFinalizacao?.nota && (
                          <span className="font-medium text-gray-900">Nota: {estagio.dadosFinalizacao.nota}</span>
                        )}
                        {estagio.status === 'Não Finalizado' && estagio.dadosFinalizacao?.motivoNaoFinalizado && (
                          <span className="font-medium text-orange-600">Motivo: {estagio.dadosFinalizacao.motivoNaoFinalizado}</span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      estagio.status === 'Finalizado' ? 'bg-green-100 text-green-800' :
                      estagio.status === 'Não Finalizado' ? 'bg-orange-100 text-orange-800' :
                      estagio.status === 'Arquivado' ? 'bg-gray-200 text-gray-800' :
                      'bg-indigo-100 text-indigo-800'
                    }`}>
                      {estagio.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => { setCurrentEstagio(estagio); setFormAlunoId(estagio.alunoId); setShowForm(true); }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {estagio.status === 'Ativo' && (
                      <>
                        <button
                          onClick={() => { setCurrentEstagio(estagio); setShowFinalizar(true); }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1"
                          title="Finalizar Estágio"
                        >
                          <CheckCircle className="w-4 h-4" /> <span className="text-sm font-medium">Finalizar</span>
                        </button>
                        <button
                          onClick={() => { setCurrentEstagio(estagio); setShowNaoFinalizado(true); }}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1"
                          title="Marcar como Não Finalizado"
                        >
                          <X className="w-4 h-4" /> <span className="text-sm font-medium">Não Finalizou</span>
                        </button>
                      </>
                    )}
                    {(estagio.status === 'Finalizado' || estagio.status === 'Não Finalizado') && (
                      <button
                        onClick={() => handleReverterStatus(estagio)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                        title="Reverter para Ativo"
                      >
                        <RotateCcw className="w-4 h-4" /> <span className="text-sm font-medium">Reverter</span>
                      </button>
                    )}
                    {estagio.status !== 'Arquivado' && (
                      <button
                        onClick={() => handleArquivar(estagio)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Arquivar"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleExcluir(estagio.id!)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && currentEstagio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                {currentEstagio.id ? 'Editar Estágio' : 'Cadastrar Novo Estágio'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEstagio} className="flex-1 overflow-y-auto p-6 space-y-8">
              
              <section>
                <h3 className="text-lg font-semibold text-indigo-900 border-b pb-2 mb-4">Vínculo do Estágio</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Aluno</label>
                  <select
                    required
                    value={formAlunoId}
                    onChange={(e) => setFormAlunoId(e.target.value ? Number(e.target.value) : '')}
                    className="mt-1 w-full p-2 border border-gray-300 rounded"
                  >
                    <option value="">Selecione o Aluno...</option>
                    {alunosDisponiveis.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-indigo-900 border-b pb-2 mb-4">Dados da Empresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700">Nome/Razão Social</label><input required className="mt-1 w-full p-2 border rounded" value={currentEstagio.dadosEmpresa?.nome || ''} onChange={e => setCurrentEstagio({...currentEstagio, dadosEmpresa: {...currentEstagio.dadosEmpresa!, nome: e.target.value}})} /></div>
                  <div><label className="block text-sm font-medium text-gray-700">Ramo de Atividade</label><input className="mt-1 w-full p-2 border rounded" value={currentEstagio.dadosEmpresa?.ramo || ''} onChange={e => setCurrentEstagio({...currentEstagio, dadosEmpresa: {...currentEstagio.dadosEmpresa!, ramo: e.target.value}})} /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Endereço</label><input className="mt-1 w-full p-2 border rounded" value={currentEstagio.dadosEmpresa?.endereco || ''} onChange={e => setCurrentEstagio({...currentEstagio, dadosEmpresa: {...currentEstagio.dadosEmpresa!, endereco: e.target.value}})} /></div>
                  <div><label className="block text-sm font-medium text-gray-700">Telefone</label><input className="mt-1 w-full p-2 border rounded" value={currentEstagio.dadosEmpresa?.telefone || ''} onChange={e => setCurrentEstagio({...currentEstagio, dadosEmpresa: {...currentEstagio.dadosEmpresa!, telefone: e.target.value}})} /></div>
                  <div><label className="block text-sm font-medium text-gray-700">Bairro/Cidade</label><input className="mt-1 w-full p-2 border rounded" value={currentEstagio.dadosEmpresa?.bairroCidade || ''} onChange={e => setCurrentEstagio({...currentEstagio, dadosEmpresa: {...currentEstagio.dadosEmpresa!, bairroCidade: e.target.value}})} /></div>
                  <div><label className="block text-sm font-medium text-gray-700">CEP</label><input className="mt-1 w-full p-2 border rounded" value={currentEstagio.dadosEmpresa?.cep || ''} onChange={e => setCurrentEstagio({...currentEstagio, dadosEmpresa: {...currentEstagio.dadosEmpresa!, cep: e.target.value}})} /></div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-indigo-900 border-b pb-2 mb-4">Supervisor</h3>
                <div><label className="block text-sm font-medium text-gray-700">Nome do Supervisor na Empresa</label><input className="mt-1 w-full p-2 border rounded" value={currentEstagio.supervisor?.nome || ''} onChange={e => setCurrentEstagio({...currentEstagio, supervisor: {...currentEstagio.supervisor!, nome: e.target.value}})} /></div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-indigo-900 border-b pb-2 mb-4">Dados do Estagiário</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700">Ano de Conclusão</label><input className="mt-1 w-full p-2 border rounded" value={currentEstagio.dadosEstagiario?.anoConclusao || ''} onChange={e => setCurrentEstagio({...currentEstagio, dadosEstagiario: {...currentEstagio.dadosEstagiario!, anoConclusao: e.target.value}})} /></div>
                  <div><label className="block text-sm font-medium text-gray-700">Telefone</label><input className="mt-1 w-full p-2 border rounded" value={currentEstagio.dadosEstagiario?.telefone || ''} onChange={e => setCurrentEstagio({...currentEstagio, dadosEstagiario: {...currentEstagio.dadosEstagiario!, telefone: e.target.value}})} /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Endereço</label><input className="mt-1 w-full p-2 border rounded" value={currentEstagio.dadosEstagiario?.endereco || ''} onChange={e => setCurrentEstagio({...currentEstagio, dadosEstagiario: {...currentEstagio.dadosEstagiario!, endereco: e.target.value}})} /></div>
                  <div><label className="block text-sm font-medium text-gray-700">Bairro/Cidade</label><input className="mt-1 w-full p-2 border rounded" value={currentEstagio.dadosEstagiario?.bairroCidade || ''} onChange={e => setCurrentEstagio({...currentEstagio, dadosEstagiario: {...currentEstagio.dadosEstagiario!, bairroCidade: e.target.value}})} /></div>
                  <div><label className="block text-sm font-medium text-gray-700">CEP</label><input className="mt-1 w-full p-2 border rounded" value={currentEstagio.dadosEstagiario?.cep || ''} onChange={e => setCurrentEstagio({...currentEstagio, dadosEstagiario: {...currentEstagio.dadosEstagiario!, cep: e.target.value}})} /></div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-indigo-900 border-b pb-2 mb-4">Dados do Estágio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700">Data de Início</label><input type="date" className="mt-1 w-full p-2 border rounded" value={currentEstagio.dadosEstagio?.inicio || ''} onChange={e => setCurrentEstagio({...currentEstagio, dadosEstagio: {...currentEstagio.dadosEstagio!, inicio: e.target.value}})} /></div>
                  <div><label className="block text-sm font-medium text-gray-700">Carga Horária Diária</label><input className="mt-1 w-full p-2 border rounded" value={currentEstagio.dadosEstagio?.chDiaria || ''} onChange={e => setCurrentEstagio({...currentEstagio, dadosEstagio: {...currentEstagio.dadosEstagio!, chDiaria: e.target.value}})} /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Função Principal</label><input className="mt-1 w-full p-2 border rounded" value={currentEstagio.dadosEstagio?.funcaoPrincipal || ''} onChange={e => setCurrentEstagio({...currentEstagio, dadosEstagio: {...currentEstagio.dadosEstagio!, funcaoPrincipal: e.target.value}})} /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Áreas de Atuação</label><textarea className="mt-1 w-full p-2 border rounded" rows={2} value={currentEstagio.dadosEstagio?.areasAtuacao || ''} onChange={e => setCurrentEstagio({...currentEstagio, dadosEstagio: {...currentEstagio.dadosEstagio!, areasAtuacao: e.target.value}})} /></div>
                </div>
              </section>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t shrink-0">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                  <Save className="w-4 h-4" /> Salvar Estágio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Finalizar Modal */}
      {showFinalizar && currentEstagio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Finalizar Estágio</h2>
              <button onClick={() => setShowFinalizar(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700">Data de Término</label><input type="date" className="mt-1 w-full p-2 border rounded" value={finalizarData.termino} onChange={e => setFinalizarData({...finalizarData, termino: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700">Carga Horária Total</label><input className="mt-1 w-full p-2 border rounded" value={finalizarData.chTotal} onChange={e => setFinalizarData({...finalizarData, chTotal: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700">Nota Final</label><input type="number" step="0.1" className="mt-1 w-full p-2 border rounded" value={finalizarData.nota} onChange={e => setFinalizarData({...finalizarData, nota: e.target.value})} /></div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avaliação</label>
                <div className="flex gap-4">
                  {['Fraco', 'Regular', 'Bom', 'Ótimo'].map(opt => (
                    <label key={opt} className="flex items-center gap-2">
                      <input type="radio" name="avaliacao" value={opt} checked={finalizarData.avaliacao === opt} onChange={e => setFinalizarData({...finalizarData, avaliacao: e.target.value})} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              <div><label className="block text-sm font-medium text-gray-700">Comentários e Sugestões</label><textarea rows={3} className="mt-1 w-full p-2 border rounded" value={finalizarData.comentarios} onChange={e => setFinalizarData({...finalizarData, comentarios: e.target.value})} /></div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowFinalizar(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
                <button onClick={handleSaveFinalizar} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Confirmar Término
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Não Finalizado Modal */}
      {showNaoFinalizado && currentEstagio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Estágio Não Finalizado</h2>
              <button onClick={() => setShowNaoFinalizado(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <select
                  required
                  value={motivoNaoFinalizado}
                  onChange={e => setMotivoNaoFinalizado(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="">Selecione o motivo...</option>
                  <option value="Desistiu">Desistiu</option>
                  <option value="Não entregou relatório">Não entregou relatório</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowNaoFinalizado(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
                <button onClick={handleSaveNaoFinalizado} disabled={!motivoNaoFinalizado} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
