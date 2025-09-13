"use client";

import { useState, useEffect } from 'react';

type Options = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'primary';
};

let resolver: ((v: boolean) => void) | null = null;

export function confirm(options: Options = {}): Promise<boolean> {
  const event = new CustomEvent('app-confirm-open', { detail: options });
  window.dispatchEvent(event);
  return new Promise((resolve) => {
    resolver = resolve;
  });
}

export default function ConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<Options>({});

  useEffect(() => {
    const onOpen = (e: any) => {
      setOpts(e.detail || {});
      setOpen(true);
    };
    window.addEventListener('app-confirm-open', onOpen);
    return () => window.removeEventListener('app-confirm-open', onOpen);
  }, []);

  const close = (value: boolean) => {
    setOpen(false);
    resolver?.(value);
    resolver = null;
  };

  if (!open) return null;

  const tone = opts.tone === 'danger'
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-purple-600 hover:bg-purple-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{opts.title || '¿Confirmar acción?'}</h3>
        {opts.description && (
          <p className="text-sm text-gray-600 mb-6">{opts.description}</p>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => close(false)}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            {opts.cancelText || 'Cancelar'}
          </button>
          <button
            onClick={() => close(true)}
            className={`px-4 py-2 rounded-lg text-white ${tone}`}
          >
            {opts.confirmText || 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
}
