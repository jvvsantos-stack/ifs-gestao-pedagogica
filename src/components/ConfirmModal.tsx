import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
            }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
