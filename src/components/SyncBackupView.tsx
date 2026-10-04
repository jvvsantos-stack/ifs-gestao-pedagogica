import React from 'react';
import { db } from '../db/database';
import { Cloud, CloudUpload, CloudDownload, RefreshCw, CheckCircle2, AlertTriangle, LogOut, User as UserIcon } from 'lucide-react';
import { fazerUploadBackup, fazerDownloadBackup, getStoredToken } from '../utils/googleDriveSync';
import { ConfirmModal } from './ConfirmModal';
import type { GoogleUserInfo } from '../utils/googleDriveSync';

interface SyncBackupViewProps {
  onLogout: () => void;
  userInfo: GoogleUserInfo | null;
}

export const SyncBackupView: React.FC<SyncBackupViewProps> = ({ onLogout, userInfo }) => {
  const [syncStatus, setSyncStatus] = React.useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = React.useState('');
  const [confirmModal, setConfirmModal] = React.useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });



  const handleForceUpload = async () => {
    try {
      const token = getStoredToken();
      if (!token) throw new Error('Sem token');
      setSyncStatus('syncing');
      setStatusMessage('A enviar backup...');
      await fazerUploadBackup(db, token);
      setSyncStatus('success');
      setStatusMessage('Backup enviado!');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
      setStatusMessage('Erro ao enviar backup.');
    }
  };

  const handleForceDownload = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Restaurar Backup',
      message: 'Atenção: Isso irá sobreescrever todos os seus dados locais com o que está no Google Drive. Tem certeza?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const token = getStoredToken();
          if (!token) throw new Error('Sem token');
        setSyncStatus('syncing');
        setStatusMessage('A transferir backup...');
        await fazerDownloadBackup(db, token);
        setSyncStatus('success');
        setStatusMessage('Backup restaurado!');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (e) {
        console.error(e);
        setSyncStatus('error');
        setStatusMessage('Erro ao restaurar backup.');
        }
      }
    });
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <main className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-sm">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 tracking-tight">Sync e Backup</h2>
            <p className="text-gray-500 dark:text-slate-400 text-sm">Gerencie sua conta e sincronização de dados</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 overflow-hidden dark:text-slate-100">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-indigo-500" />
              Sua Conta
            </h3>
          </div>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {userInfo?.picture ? (
                  <img src={userInfo.picture} alt="Foto de Perfil" className="w-12 h-12 rounded-full shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 font-bold text-lg">
                    {userInfo?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <p className="font-bold text-gray-800 dark:text-slate-100 text-lg leading-tight">{userInfo?.name || 'Utilizador Autenticado'}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{userInfo?.email || 'Sessão ativa com o Google'}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl font-bold transition-all w-full sm:w-auto"
              >
                <LogOut className="w-5 h-5" />
                Sair da Conta
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 overflow-hidden dark:text-slate-100">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-indigo-500" />
              Sincronização Nuvem (Google Drive)
            </h3>
            <div className="flex items-center gap-2">
              {syncStatus === 'syncing' && <><span className="text-sm text-indigo-600 font-medium">{statusMessage}</span><RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" /></>}
              {syncStatus === 'success' && <><span className="text-sm text-emerald-600 font-medium">{statusMessage}</span><CheckCircle2 className="w-5 h-5 text-emerald-500" /></>}
              {syncStatus === 'error' && <><span className="text-sm text-red-600 font-medium">{statusMessage}</span><AlertTriangle className="w-5 h-5 text-red-500" /></>}
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 rounded-xl border border-emerald-200">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div>
                  <p className="font-semibold">Sincronização Vinculada</p>
                  <p className="text-sm text-emerald-700 mt-0.5">A sua conta do Google Drive está ligada. Utilize os controlos abaixo para gerir os dados.</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-3">Ações Manuais</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={handleForceUpload}
                    disabled={syncStatus === 'syncing'}
                    className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900 px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <CloudUpload className="w-5 h-5 text-indigo-500" />
                    Forçar Envio de Backup
                  </button>
                  <button 
                    onClick={handleForceDownload}
                    disabled={syncStatus === 'syncing'}
                    className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-red-600 hover:bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 dark:text-slate-100"
                  >
                    <CloudDownload className="w-5 h-5 text-red-500" />
                    Restaurar Backup da Nuvem
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

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
