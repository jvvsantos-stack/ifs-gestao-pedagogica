import React, { useState, useRef } from 'react';
import { db } from '../db/database';
import type { Aluno } from '../db/database';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Trash2, Eye, Upload } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  aluno: Aluno;
  onClose: () => void;
}

export const ModalOcorrencias: React.FC<Props> = ({ aluno, onClose }) => {
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState('Outros');
  const [descricao, setDescricao] = useState('');
  const [anexoNome, setAnexoNome] = useState<string | undefined>(undefined);
  const [anexoDados, setAnexoDados] = useState<string | ArrayBuffer | undefined>(undefined);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; type?: 'warning' | 'success' | 'info'; isAlert?: boolean; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ocorrencias = useLiveQuery(() => 
    db.ocorrencias.where('alunoId').equals(aluno.id!).toArray()
  ) || [];

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setAnexoNome(file.name);
          setAnexoDados(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!descricao.trim()) {
      showAlert('Aviso', 'A descrição é obrigatória.', 'warning');
      return;
    }

    try {
      await db.ocorrencias.add({
        alunoId: aluno.id!,
        data,
        tipo,
        descricao,
        anexoNome,
        anexoDados
      });

      // Reset formulário
      setData(new Date().toISOString().split('T')[0]);
      setTipo('Outros');
      setDescricao('');
      setAnexoNome(undefined);
      setAnexoDados(undefined);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
      showAlert('Erro', 'Erro ao salvar ocorrência.', 'warning');
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Ocorrência',
      message: 'Tem certeza que deseja excluir esta ocorrência?',
      onConfirm: async () => {
        await db.ocorrencias.delete(id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleViewAnexo = (dados: string | ArrayBuffer) => {
    if (typeof dados === 'string') {
      // É uma string Base64 (Data URL)
      const newWindow = window.open();
      if (newWindow) {
        if (dados.startsWith('data:application/pdf')) {
            newWindow.document.write(`<iframe src="${dados}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        } else {
            newWindow.document.write(`<img src="${dados}" style="max-width: 100%; max-height: 100%;" />`);
        }
      } else {
        // Fallback for popups blocked: create a temporary link to download
        const a = document.createElement('a');
        a.href = dados;
        a.download = 'anexo';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col dark:text-slate-100">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">Ocorrências: {aluno.nome}{aluno.isRepetente && <span className="text-red-600 font-bold ml-1 print:text-red-600">(REPT)</span>}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full p-2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Parte Superior / Esquerda: Formulário */}
          <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700 h-fit">
            <h3 className="font-bold text-gray-700 dark:text-slate-300 mb-4 text-lg">Nova Ocorrência</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Data</label>
                <input 
                  type="date" 
                  value={data}
                  onChange={e => setData(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded p-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tipo</label>
                <select 
                  value={tipo}
                  onChange={e => setTipo(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded p-2 text-sm outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="Atestado Médico">Atestado Médico</option>
                  <option value="Atestado de Dispensa">Atestado de Dispensa</option>
                  <option value="Advertência Verbal">Advertência Verbal</option>
                  <option value="Advertência Escrita">Advertência Escrita</option>
                  <option value="Suspensão">Suspensão</option>
                  <option value="Indisciplina">Indisciplina</option>
                  <option value="Elogio/Mérito Pedagógico">Elogio/Mérito Pedagógico</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Descrição</label>
                <textarea 
                  rows={4}
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Detalhes do ocorrido..."
                  className="w-full border border-gray-300 dark:border-slate-600 rounded p-2 text-sm outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Anexo (PDF / Imagem)</label>
                <div className="flex gap-2 items-center">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-slate-600 hover:border-indigo-400 text-gray-700 dark:text-slate-300 px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Escolher Arquivo
                  </button>
                  <input 
                    type="file" 
                    accept=".pdf, image/*" 
                    className="hidden dark:focus:ring-slate-600 dark:border-slate-700 dark:text-slate-100 dark:bg-slate-800" 
                    ref={fileInputRef}
                    onChange={handleFile}
                  />
                  {anexoNome && <span className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[200px]">{anexoNome}</span>}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-slate-700 mt-4">
                <button 
                  onClick={handleSave}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors text-sm"
                >
                  Salvar Ocorrência
                </button>
              </div>
            </div>
          </div>

          {/* Parte Inferior / Direita: Histórico */}
          <div className="flex flex-col">
            <h3 className="font-bold text-gray-700 dark:text-slate-300 mb-4 text-lg">Histórico do Aluno</h3>
            
            {ocorrencias.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-slate-400 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900">
                Nenhuma ocorrência registrada.
              </div>
            ) : (
              <div className="space-y-4 overflow-auto pr-2">
                {ocorrencias.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map(oc => (
                  <div key={oc.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm relative group dark:text-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 text-xs px-2 py-0.5 rounded font-bold">
                          {oc.tipo}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-slate-400 ml-2">
                          {new Date(oc.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleDelete(oc.id!)}
                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 dark:bg-red-900/20 p-1 rounded"
                        title="Excluir Ocorrência"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{oc.descricao}</p>
                    
                    {oc.anexoDados && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button 
                          onClick={() => handleViewAnexo(oc.anexoDados!)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded"
                        >
                          <Eye className="w-3 h-3" />
                          Visualizar Anexo ({oc.anexoNome || 'Documento'})
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        type={confirmModal.type}
        onCancel={confirmModal.isAlert ? undefined : () => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
