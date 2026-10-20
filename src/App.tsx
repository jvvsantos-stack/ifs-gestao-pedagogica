import { useState, useEffect } from 'react';
import { TurmasView } from './components/TurmasView';
import { CadastrosView } from './components/CadastrosView';
import { ConsolidacaoView } from './components/ConsolidacaoView';
import { DashboardView } from './components/DashboardView';
import { AnalisesView } from './components/AnalisesView';
import { SyncBackupView } from './components/SyncBackupView';
import { EstagiosView } from './components/EstagiosView';
import { MainLayout } from './components/MainLayout';
import { LoginView } from './components/LoginView';
import type { TabId } from './components/MainLayout';
import {
  fazerDownloadBackup,
  fazerUploadBackup,
  setStoredToken,
  getStoredToken,
  solicitarTokenGoogle,
  obterInformacoesUsuario,
  isAuthExpiredError,
  onGoogleAuthExpired,
  isAutoSyncPaused,
  setAutoSyncPaused,
} from './utils/googleDriveSync';
import type { GoogleUserInfo } from './utils/googleDriveSync';
import { db } from './db/database';
import { CloudOff, RefreshCw } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [turmaIdToOpenAlunos, setTurmaIdToOpenAlunos] = useState<number | null>(null);
  const [isDriveAuthExpired, setIsDriveAuthExpired] = useState(false);
  const [isReauthenticating, setIsReauthenticating] = useState(false);

  useEffect(() => {
    // Escuta evento de token expirado
    const unsubscribeAuthExpired = onGoogleAuthExpired(() => {
      setIsDriveAuthExpired(true);
    });

    // Check if we have a saved session
    const savedSession = localStorage.getItem('ifs_auth_session');
    if (savedSession) {
      try {
        const { token, user, authExpired } = JSON.parse(savedSession);
        setUserInfo(user);
        setIsAuthenticated(true);

        if (authExpired || !token) {
          setAutoSyncPaused(true);
          setIsDriveAuthExpired(true);
        } else {
          setStoredToken(token);
          // Automatic sync down on mount if logged in (silencioso em 401)
          fazerDownloadBackup(db, token).catch(e => {
            if (isAuthExpiredError(e)) {
              setIsDriveAuthExpired(true);
              setAutoSyncPaused(true);
            } else {
              console.warn("Auto-sync error on mount:", e);
            }
          });
        }
      } catch (e) {
        console.error("Error loading session", e);
        localStorage.removeItem('ifs_auth_session');
      }
    }

    // Sync up on visibility change (closing tab, minimizing, etc)
    const handleVisibilityChange = () => {
      if (isAutoSyncPaused()) return;
      const currentToken = getStoredToken();
      if (document.visibilityState === 'hidden' && currentToken) {
        fazerUploadBackup(db, currentToken).catch(e => {
          if (isAuthExpiredError(e)) {
            setIsDriveAuthExpired(true);
            setAutoSyncPaused(true);
          } else {
            console.warn("Auto-sync background upload warning:", e);
          }
        });
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleVisibilityChange);

    return () => {
      unsubscribeAuthExpired();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleVisibilityChange);
      if (!isAutoSyncPaused()) {
        const currentToken = getStoredToken();
        if (currentToken) {
          fazerUploadBackup(db, currentToken).catch(() => {});
        }
      }
    };
  }, []);

  const handleLogin = async () => {
    try {
      const token = await solicitarTokenGoogle(true);
      const user = await obterInformacoesUsuario(token);
      setStoredToken(token);
      setUserInfo(user);
      localStorage.setItem('ifs_auth_session', JSON.stringify({ token, user, authExpired: false }));
      setIsAuthenticated(true);
      setIsDriveAuthExpired(false);
      setAutoSyncPaused(false);
      
      // Auto-sync after fresh login
      await fazerDownloadBackup(db, token).catch(e => {
        if (e.message !== 'Nenhum arquivo de backup encontrado.' && !isAuthExpiredError(e)) {
          console.warn("Auto-sync error after login:", e);
        }
      });
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const handleReauthDrive = async () => {
    try {
      setIsReauthenticating(true);
      const token = await solicitarTokenGoogle(true);
      const user = await obterInformacoesUsuario(token);
      setStoredToken(token);
      setUserInfo(user);
      localStorage.setItem('ifs_auth_session', JSON.stringify({ token, user, authExpired: false }));
      setIsDriveAuthExpired(false);
      setAutoSyncPaused(false);
      // Dispara upload para sincronizar alterações pendentes
      await fazerUploadBackup(db, token).catch(() => {});
    } catch (error) {
      console.warn("Reautenticação cancelada ou não concluída:", error);
    } finally {
      setIsReauthenticating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ifs_auth_session');
    setStoredToken(null);
    setUserInfo(null);
    setIsAuthenticated(false);
    setIsDriveAuthExpired(false);
  };

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <>
      {/* Toast flutuante de alerta quando a sessão do Google Drive expira */}
      {isDriveAuthExpired && (
        <div className="fixed top-4 right-4 z-[9999] max-w-md bg-amber-50 dark:bg-amber-950/95 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-100 px-4 py-3 rounded-xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-200 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <CloudOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-bold leading-tight">Sincronização em Nuvem Pausada</p>
              <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Sua permissão do Google Drive expirou.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReauthDrive}
              disabled={isReauthenticating}
              className="text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isReauthenticating ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Conectando...
                </>
              ) : (
                'Reconectar'
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsDriveAuthExpired(false)}
              className="text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 p-1 rounded-md transition-colors cursor-pointer text-xs"
              title="Dispensar aviso (a sincronização continuará pausada)"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <MainLayout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
      >
        {activeTab === 'dashboard' ? (
          <DashboardView setActiveTab={setActiveTab} />
        ) : activeTab === 'turmas' ? (
          <TurmasView 
            initialOpenTurmaAlunosId={turmaIdToOpenAlunos} 
            clearInitialOpen={() => setTurmaIdToOpenAlunos(null)} 
          />
        ) : activeTab === 'cadastros' ? (
          <CadastrosView 
            onTurmaCriada={(id) => {
              setTurmaIdToOpenAlunos(id);
              setActiveTab('turmas');
            }}
          />
        ) : activeTab === 'consolidacao' ? (
          <ConsolidacaoView />
        ) : activeTab === 'estagios' ? (
          <EstagiosView />
        ) : activeTab === 'analises' ? (
          <AnalisesView />
        ) : activeTab === 'sync' ? (
          <SyncBackupView onLogout={handleLogout} userInfo={userInfo} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-white m-6 rounded-2xl border border-gray-200 shadow-sm">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Módulo em Construção</h2>
            <p>Esta área será implementada em breve.</p>
          </div>
        )}
      </MainLayout>
    </>
  );
}

export default App;
