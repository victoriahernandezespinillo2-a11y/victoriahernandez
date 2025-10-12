'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Toast = {
  id: string;
  title?: string;
  message: string;
  variant?: 'success' | 'error' | 'info' | 'warning';
  timeoutMs?: number;
};

type ToastContextType = {
  showToast: (partial: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((partial: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    const toast: Toast = {
      id,
      title: partial.title,
      message: partial.message,
      variant: partial.variant || 'info',
      timeoutMs: partial.timeoutMs ?? 3500,
    };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), toast.timeoutMs);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Container */}
      <div className="fixed z-50 right-4 top-4 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg shadow-lg border-2 px-4 py-3 text-sm ${
              t.variant === 'success'
                ? 'bg-green-50 border-green-400 text-green-800'
                : t.variant === 'error'
                ? 'bg-red-50 border-red-400 text-red-800'
                : t.variant === 'warning'
                ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                : 'bg-blue-50 border-blue-400 text-blue-800'
            }`}
          >
            {t.title && <div className="font-bold mb-1">{t.title}</div>}
            <div className="font-medium">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
