import React, { useState, useEffect } from 'react';
import { User, LogIn, LogOut, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  onLoginSuccess: () => void;
}

export const LoginSyncScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  useEffect(() => {
    const user = localStorage.getItem('user_simulated');
    if (user) {
      setIsLoggedIn(true);
      onLoginSuccess();
    }
  }, [onLoginSuccess]);

  const handleLogin = () => {
    localStorage.setItem('user_simulated', 'true');
    setIsLoggedIn(true);
    onLoginSuccess();
  };

  const handleLogout = () => {
    localStorage.removeItem('user_simulated');
    setIsLoggedIn(false);
    setSyncStatus('idle');
  };

  const handleSync = () => {
    if (!isLoggedIn) return;
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus(Math.random() > 0.1 ? 'success' : 'error');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 space-y-4 dark:text-slate-100">
        <div className="text-center mb-4">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-blue-600 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-200">Perfil e Sincronização</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Gerencie sua conta e sincronize dados</p>
        </div>

        {!isLoggedIn ? (
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Entrar com Google
          </button>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 p-4 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">Usuário Autenticado</p>
                <p className="text-sm opacity-90">Sincronização com Google Drive disponível</p>
              </div>
            </div>

            <button
              onClick={handleSync}
              disabled={syncStatus === 'syncing'}
              className={`w-full font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                syncStatus === 'syncing'
                  ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'syncing' ? 'Sincronizando...' : 'Sincronizar com Drive'}
            </button>

            {syncStatus === 'success' && (
              <p className="text-center text-sm text-green-600 flex items-center justify-center gap-1">
                <CheckCircle className="w-4 h-4" /> Sincronização concluída!
              </p>
            )}
            {syncStatus === 'error' && (
              <p className="text-center text-sm text-red-600 flex items-center justify-center gap-1">
                <AlertCircle className="w-4 h-4" /> Erro na sincronização. Tente novamente.
              </p>
            )}

            <hr className="border-gray-200 dark:border-slate-700" />

            <button
              onClick={handleLogout}
              className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-slate-600 hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-700 dark:text-slate-300 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sair da Conta
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
