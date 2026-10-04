import React from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'success' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning'
}) => {
  if (!isOpen) return null;

  const Icon = type === 'success' ? CheckCircle : type === 'info' ? Info : AlertTriangle;
  const iconColor = type === 'success' ? 'text-emerald-600' : type === 'info' ? 'text-blue-600' : 'text-amber-600';
  const iconBg = type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/40' : type === 'info' ? 'bg-blue-100' : 'bg-amber-100';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 text-center animate-in fade-in zoom-in-95 duration-200 dark:text-slate-100">
        <div className={`mx-auto w-12 h-12 ${iconBg} rounded-full flex items-center justify-center mb-4`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-slate-300 mb-6 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-5 py-2.5 text-gray-700 dark:text-slate-300 font-semibold bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              onConfirm();
            }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
          >
            {onCancel ? confirmText : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};
