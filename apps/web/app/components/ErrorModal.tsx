'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@repo/ui/dialog';
import { AlertCircle, XCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';

interface ErrorModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  showCloseButton?: boolean;
  closeButtonText?: string;
  onCloseClick?: () => void;
}

export default function ErrorModal({
  open,
  onClose,
  title,
  message,
  type = 'error',
  showCloseButton = true,
  closeButtonText = 'Aceptar',
  onCloseClick
}: ErrorModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      // Restaurar scroll del body cuando el modal se cierra
      document.body.style.overflow = 'unset';
    }

    // Cleanup al desmontar
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  // Configuración de iconos y colores según el tipo
  const getTypeConfig = () => {
    switch (type) {
      case 'error':
        return {
          icon: XCircle,
          iconColor: 'text-red-500',
          iconBg: 'bg-red-100',
          titleColor: 'text-red-900',
          borderColor: 'border-red-200',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          defaultTitle: 'Error'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-500',
          iconBg: 'bg-yellow-100',
          titleColor: 'text-yellow-900',
          borderColor: 'border-yellow-200',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
          defaultTitle: 'Advertencia'
        };
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-blue-500',
          iconBg: 'bg-blue-100',
          titleColor: 'text-blue-900',
          borderColor: 'border-blue-200',
          buttonColor: 'bg-blue-600 hover:bg-blue-700',
          defaultTitle: 'Información'
        };
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-500',
          iconBg: 'bg-green-100',
          titleColor: 'text-green-900',
          borderColor: 'border-green-200',
          buttonColor: 'bg-green-600 hover:bg-green-700',
          defaultTitle: 'Éxito'
        };
      default:
        return {
          icon: AlertCircle,
          iconColor: 'text-gray-500',
          iconBg: 'bg-gray-100',
          titleColor: 'text-gray-900',
          borderColor: 'border-gray-200',
          buttonColor: 'bg-gray-600 hover:bg-gray-700',
          defaultTitle: 'Notificación'
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;

  const handleClose = () => {
    if (onCloseClick) {
      onCloseClick();
    }
    onClose();
  };

  if (!open || !isVisible) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className={`max-w-md ${config.borderColor}`}
        onClose={handleClose}
      >
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${config.iconBg}`}>
              <Icon className={`h-6 w-6 ${config.iconColor}`} />
            </div>
            <DialogTitle className={config.titleColor}>
              {displayTitle}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <DialogBody>
          <div className="space-y-3">
            <p className="text-gray-700 leading-relaxed">
              {message}
            </p>
          </div>
        </DialogBody>
        
        <DialogFooter>
          {showCloseButton && (
            <button
              onClick={handleClose}
              className={`px-6 py-2 rounded-lg text-white font-medium transition-colors ${config.buttonColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {closeButtonText}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook para manejar modales de error de manera fácil
export function useErrorModal() {
  const [modalState, setModalState] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info' | 'success';
  }>({
    open: false,
    title: '',
    message: '',
    type: 'error'
  });

  const showError = (message: string, title?: string, type?: 'error' | 'warning' | 'info' | 'success') => {
    setModalState({
      open: true,
      title: title || '',
      message,
      type: (type || 'error') as 'error' | 'warning' | 'info' | 'success'
    });
  };

  const hideError = () => {
    setModalState(prev => ({ ...prev, open: false }));
  };

  const ErrorModalComponent = () => (
    <ErrorModal
      open={modalState.open}
      onClose={hideError}
      title={modalState.title}
      message={modalState.message}
      type={modalState.type}
    />
  );

  return {
    showError,
    hideError,
    ErrorModalComponent
  };
}
