import { useState, useEffect } from 'react';
import { TurmasView } from './components/TurmasView';
import { CadastrosView } from './components/CadastrosView';
import { ConsolidacaoView } from './components/ConsolidacaoView';
import { DashboardView } from './components/DashboardView';
import { AnalisesView } from './components/AnalisesView';
import { SyncBackupView } from './components/SyncBackupView';
import { MainLayout } from './components/MainLayout';
import { LoginView } from './components/LoginView';
import type { TabId } from './components/MainLayout';
import { fazerDownloadBackup, fazerUploadBackup, setStoredToken, getStoredToken, solicitarTokenGoogle, obterInformacoesUsuario } from './utils/googleDriveSync';
import type { GoogleUserInfo } from './utils/googleDriveSync';
import { db } from './db/database';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  useEffect(() => {
    // Check if we have a saved session
    const savedSession = localStorage.getItem('ifs_auth_session');
    if (savedSession) {
      try {
        const { token, user } = JSON.parse(savedSession);
        setStoredToken(token);
        setUserInfo(user);
        setIsAuthenticated(true);
        // Automatic sync down on mount if logged in
        fazerDownloadBackup(db, token).catch(e => {
          console.error("Auto-sync error on mount:", e);
        });
      } catch (e) {
        console.error("Error loading session", e);
        localStorage.removeItem('ifs_auth_session');
      }
    }

    // Sync up on visibility change (closing tab, minimizing, etc)
    const handleVisibilityChange = () => {
      const currentToken = getStoredToken();
      if (document.visibilityState === 'hidden' && currentToken) {
        fazerUploadBackup(db, currentToken).catch(console.error);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleVisibilityChange);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleVisibilityChange);
      const currentToken = getStoredToken();
      if (currentToken) {
        fazerUploadBackup(db, currentToken).catch(console.error);
      }
    };
  }, []);

  const handleLogin = async () => {
    try {
      const token = await solicitarTokenGoogle();
      const user = await obterInformacoesUsuario(token);
      setStoredToken(token);
      setUserInfo(user);
      localStorage.setItem('ifs_auth_session', JSON.stringify({ token, user }));
      setIsAuthenticated(true);
      
      // Auto-sync after fresh login
      await fazerDownloadBackup(db, token).catch(e => {
        if (e.message !== 'Nenhum arquivo de backup encontrado.') {
          console.error("Auto-sync error after login:", e);
        }
      });
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ifs_auth_session');
    setStoredToken(null);
    setUserInfo(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <MainLayout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      onLogout={handleLogout}
    >
      {activeTab === 'dashboard' ? (
        <DashboardView setActiveTab={setActiveTab} />
      ) : activeTab === 'turmas' ? (
        <TurmasView onLogout={handleLogout} />
      ) : activeTab === 'cadastros' ? (
        <CadastrosView />
      ) : activeTab === 'consolidacao' ? (
        <ConsolidacaoView />
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
  );
}

export default App;
