"use client";

import { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

type ErrorType = 'error' | 'success' | 'warning' | 'info';

type NotificationOptions = {
  title?: string;
  message: string;
  type?: ErrorType;
  duration?: number;
};

let resolver: ((v: void) => void) | null = null;

export function showNotification(options: NotificationOptions): Promise<void> {
  const event = new CustomEvent('app-notification-show', { detail: options });
  window.dispatchEvent(event);
  return new Promise((resolve) => {
    resolver = resolve;
  });
}

export default function ErrorNotification() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<NotificationOptions>({ message: '' });

  useEffect(() => {
    const onShow = (e: any) => {
      setOpts(e.detail || { message: '' });
      setOpen(true);
      
      // Auto close after duration (default 5 seconds)
      const duration = e.detail?.duration || 5000;
      if (duration > 0) {
        setTimeout(() => {
          close();
        }, duration);
      }
    };
    window.addEventListener('app-notification-show', onShow);
    return () => window.removeEventListener('app-notification-show', onShow);
  }, []);

  const close = () => {
    setOpen(false);
    resolver?.();
    resolver = null;
  };

  if (!open) return null;

  const getTypeStyles = () => {
    switch (opts.type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-600',
          title: 'text-green-800',
          message: 'text-green-700',
          iconComponent: CheckCircleIcon
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          iconComponent: ExclamationTriangleIcon
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-800',
          message: 'text-blue-700',
          iconComponent: InformationCircleIcon
        };
      default: // error
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          title: 'text-red-800',
          message: 'text-red-700',
          iconComponent: ExclamationTriangleIcon
        };
    }
  };

  const styles = getTypeStyles();
  const IconComponent = styles.iconComponent;

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-sm">
      <div className={`${styles.bg} ${styles.border} border rounded-2xl p-4 shadow-lg`}>
        <div className="flex items-start gap-3">
          <IconComponent className={`h-5 w-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
          <div className="flex-1 min-w-0">
            {opts.title && (
              <h3 className={`text-sm font-medium ${styles.title} mb-1`}>
                {opts.title}
              </h3>
            )}
            <p className={`text-sm ${styles.message}`}>
              {opts.message}
            </p>
          </div>
          <button
            onClick={close}
            className={`flex-shrink-0 ${styles.icon} hover:opacity-75 transition-opacity`}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}










