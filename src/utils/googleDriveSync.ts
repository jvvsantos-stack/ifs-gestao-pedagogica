import { AppDatabase } from '../db/database';
import { exportarBancoParaJSON, importarJSONParaBanco } from './dexieUtils';

const CLIENT_ID = '103519239474-dkbv59ebn365nkoj2678im7soekh671a.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const FOLDER_NAME = 'IFS Gestao Pedagogica';

let gisInited = false;
let tokenClient: any;
let memoryToken: string | null = null;
let autoSyncPaused = false;

export class GoogleAuthExpiredError extends Error {
  readonly status = 401;
  constructor(message = 'Permissão expirada ou inválida. Por favor, faça login novamente.') {
    super(message);
    this.name = 'GoogleAuthExpiredError';
  }
}

export function isAuthExpiredError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof GoogleAuthExpiredError) return true;
  if (typeof error === 'object') {
    const err = error as any;
    if (err.name === 'GoogleAuthExpiredError') return true;
    if (err.status === 401 || err.status === 403) return true;
    if (err.message === 'AUTH_REQUIRED') return true;
    if (typeof err.message === 'string' && (err.message.includes('Permissão expirada') || err.message.includes('401'))) return true;
  }
  return false;
}

type AuthExpiredListener = () => void;
const authExpiredListeners = new Set<AuthExpiredListener>();

export const onGoogleAuthExpired = (listener: AuthExpiredListener) => {
  authExpiredListeners.add(listener);
  return () => {
    authExpiredListeners.delete(listener);
  };
};

export const isAutoSyncPaused = () => autoSyncPaused || !memoryToken;

export const setAutoSyncPaused = (paused: boolean) => {
  autoSyncPaused = paused;
};

export const handleAuthExpired = () => {
  memoryToken = null;
  autoSyncPaused = true;
  try {
    const saved = localStorage.getItem('ifs_auth_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.token = null;
      parsed.authExpired = true;
      localStorage.setItem('ifs_auth_session', JSON.stringify(parsed));
    }
  } catch {
    // ignore
  }

  authExpiredListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
};

export const initGoogleIdentityServices = (): Promise<void> => {
  return new Promise((resolve) => {
    if (gisInited) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '' // Defined later
      });
      gisInited = true;
      resolve();
    };
    document.body.appendChild(script);
  });
};

export const solicitarTokenGoogle = async (forcePrompt = false): Promise<string> => {
  await initGoogleIdentityServices();
  
  // Return memory token if it exists and we're not forcing re-consent
  if (!forcePrompt && memoryToken) {
    return memoryToken;
  }

  return new Promise((resolve, reject) => {
    tokenClient.callback = (resp: any) => {
      if (resp.error) {
        reject(resp);
        return;
      }
      memoryToken = resp.access_token;
      autoSyncPaused = false;
      resolve(resp.access_token);
    };
    tokenClient.requestAccessToken({ prompt: forcePrompt ? 'consent' : '' });
  });
};

export const getStoredToken = () => memoryToken;

export const setStoredToken = (token: string | null) => {
  memoryToken = token;
  if (token) {
    autoSyncPaused = false;
  }
};

export interface GoogleUserInfo {
  name: string;
  email: string;
  picture: string;
}

export const obterInformacoesUsuario = async (token: string): Promise<GoogleUserInfo> => {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error('Falha ao obter informações do utilizador.');
  }
  return await response.json();
};

export const getOrCreateBackupFolder = async (token: string): Promise<string> => {
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive`;
  
  const response = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('AUTH_REQUIRED');
  }

  if (!response.ok) {
    throw new Error('Erro ao buscar a pasta no Google Drive');
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Se não existir, criar a pasta
  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const metadata = {
    name: FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder'
  };

  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!createResponse.ok) {
    throw new Error('Falha ao criar a pasta no Google Drive');
  }

  const createData = await createResponse.json();
  return createData.id;
};

export const procurarArquivoBackup = async (token: string, folderId: string): Promise<string | null> => {
  const q = encodeURIComponent(`name='backup_ifs_gestao.json' and '${folderId}' in parents and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('AUTH_REQUIRED');
  }

  if (!response.ok) {
    throw new Error('Erro ao buscar arquivo no Google Drive');
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
};

export const fazerUploadBackup = async (db: AppDatabase, token: string): Promise<void> => {
  const jsonData = await exportarBancoParaJSON(db);
  
  let folderId: string;
  try {
    folderId = await getOrCreateBackupFolder(token);
  } catch (e: any) {
    if (e.message === 'AUTH_REQUIRED' || isAuthExpiredError(e)) {
      handleAuthExpired();
      throw new GoogleAuthExpiredError();
    }
    throw e;
  }

  let fileId: string | null = null;
  try {
    fileId = await procurarArquivoBackup(token, folderId);
  } catch(e: any) {
    if (e.message === 'AUTH_REQUIRED' || isAuthExpiredError(e)) {
      handleAuthExpired();
      throw new GoogleAuthExpiredError();
    }
    throw e;
  }

  if (fileId) {
    // PATCH
    const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jsonData)
    });

    if (response.status === 401 || response.status === 403) {
      handleAuthExpired();
      throw new GoogleAuthExpiredError();
    }

    if (!response.ok) {
      throw new Error('Falha ao atualizar o backup.');
    }
  } else {
    // POST - Multipart
    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    
    const metadata = {
      name: 'backup_ifs_gestao.json',
      parents: [folderId]
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', new Blob([JSON.stringify(jsonData)], { type: 'application/json' }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (response.status === 401 || response.status === 403) {
      handleAuthExpired();
      throw new GoogleAuthExpiredError();
    }

    if (!response.ok) {
      throw new Error('Falha ao criar o backup.');
    }
  }
};

export const fazerDownloadBackup = async (db: AppDatabase, token: string): Promise<void> => {
  let folderId: string;
  try {
    folderId = await getOrCreateBackupFolder(token);
  } catch (e: any) {
    if (e.message === 'AUTH_REQUIRED' || isAuthExpiredError(e)) {
      handleAuthExpired();
      throw new GoogleAuthExpiredError();
    }
    throw e;
  }

  let fileId: string | null = null;
  try {
    fileId = await procurarArquivoBackup(token, folderId);
  } catch(e: any) {
    if (e.message === 'AUTH_REQUIRED' || isAuthExpiredError(e)) {
      handleAuthExpired();
      throw new GoogleAuthExpiredError();
    }
    throw e;
  }

  if (!fileId) {
    throw new Error(`Nenhum arquivo de backup encontrado na pasta "${FOLDER_NAME}".`);
  }

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.status === 401 || response.status === 403) {
    handleAuthExpired();
    throw new GoogleAuthExpiredError();
  }

  if (!response.ok) {
    throw new Error('Falha ao baixar o backup.');
  }

  const jsonData = await response.json();
  await importarJSONParaBanco(db, jsonData);
};

declare global {
  interface Window {
    google: any;
  }
}
