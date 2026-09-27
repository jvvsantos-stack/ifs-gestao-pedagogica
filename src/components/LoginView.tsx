import React, { useState } from 'react';
import { Cloud, Lock, Loader2 } from 'lucide-react';

interface LoginViewProps {
  onLogin: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);

  const handleLoginClick = async () => {
    setLoading(true);
    try {
      await onLogin();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg">
            <Cloud className="w-12 h-12 text-white" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          IFS Gestão Pedagógica
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Faça login com sua conta do Google para acessar a plataforma e sincronizar seus dados.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          <div className="space-y-6">
            <div className="flex items-center justify-center bg-gray-50 p-4 rounded-xl text-sm text-gray-500 mb-6">
              <Lock className="w-4 h-4 mr-2" />
              Acesso restrito e seguro via Google
            </div>

            <button
              onClick={handleLoginClick}
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Conectando...
                </div>
              ) : (
                "Entrar com o Google"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
