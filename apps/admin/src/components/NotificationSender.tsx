'use client';

import React, { useState } from 'react';

type DirectType = 'email' | 'sms' | 'push';

type NotificationCategory = 'RESERVATION' | 'PAYMENT' | 'TOURNAMENT' | 'MAINTENANCE' | 'MEMBERSHIP' | 'SYSTEM' | 'MARKETING' | 'REMINDER';

interface NotificationSenderProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNotification: (data: {
    userId?: string;
    type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
    title: string;
    message: string;
    category?: NotificationCategory;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    scheduledFor?: string;
    data?: Record<string, unknown>;
    actionUrl?: string;
  }) => Promise<any> | any;
  onSendDirect: (data: { type: DirectType; data: Record<string, unknown> }) => Promise<any> | any;
  onSendBulk: (data: { type: 'email' | 'sms'; recipients: string[]; subject?: string; message: string; template?: string; data?: Record<string, unknown> }) => Promise<any> | any;
}

export default function NotificationSender({ isOpen, onClose, onCreateNotification, onSendDirect, onSendBulk }: NotificationSenderProps) {
  const [tab, setTab] = useState<'create' | 'direct' | 'bulk'>('create');

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP'>('IN_APP');
  const [category, setCategory] = useState<NotificationCategory | undefined>(undefined);

  const [directType, setDirectType] = useState<DirectType>('push');
  const [directTo, setDirectTo] = useState('');

  const [bulkType, setBulkType] = useState<'email' | 'sms'>('email');
  const [bulkRecipients, setBulkRecipients] = useState('');
  const [bulkSubject, setBulkSubject] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) return;
    await onCreateNotification({ title: title.trim(), message: message.trim(), type, category });
    onClose();
  };

  const handleDirect = async () => {
    if (!directTo.trim() || !message.trim()) return;
    await onSendDirect({ type: directType, data: { to: directTo.trim(), title, message } });
    onClose();
  };

  const handleBulk = async () => {
    const recipients = bulkRecipients.split(',').map(s => s.trim()).filter(Boolean);
    if (recipients.length === 0 || !bulkMessage.trim()) return;
    await onSendBulk({ type: bulkType, recipients, subject: bulkSubject.trim() || undefined, message: bulkMessage.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold text-gray-900">Enviar Notificación</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="p-4">
          <div className="mb-4 flex gap-2 text-sm">
            <button onClick={() => setTab('create')} className={`rounded px-3 py-1 ${tab === 'create' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Crear</button>
            <button onClick={() => setTab('direct')} className={`rounded px-3 py-1 ${tab === 'direct' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Directa</button>
            <button onClick={() => setTab('bulk')} className={`rounded px-3 py-1 ${tab === 'bulk' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Masiva</button>
          </div>

          {tab === 'create' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
                  <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full rounded border px-3 py-2">
                    <option value="IN_APP">In-App</option>
                    <option value="PUSH">Push</option>
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Categoría</label>
                  <select value={category || ''} onChange={(e) => setCategory((e.target.value || undefined) as NotificationCategory | undefined)} className="w-full rounded border px-3 py-2">
                    <option value="">(opcional)</option>
                    {['RESERVATION','PAYMENT','TOURNAMENT','MAINTENANCE','MEMBERSHIP','SYSTEM','MARKETING','REMINDER'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Título</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Mensaje</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded border px-3 py-2" rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className="rounded border px-4 py-2">Cancelar</button>
                <button onClick={handleCreate} className="rounded bg-blue-600 px-4 py-2 text-white">Enviar</button>
              </div>
            </div>
          )}

          {tab === 'direct' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Canal</label>
                  <select value={directType} onChange={(e) => setDirectType(e.target.value as DirectType)} className="w-full rounded border px-3 py-2">
                    <option value="push">Push</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Para</label>
                  <input value={directTo} onChange={(e) => setDirectTo(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="usuario@correo.com / +341234..." />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Título</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block textsm font-medium text-gray-700">Mensaje</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded border px-3 py-2" rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className="rounded border px-4 py-2">Cancelar</button>
                <button onClick={handleDirect} className="rounded bg-blue-600 px-4 py-2 text-white">Enviar</button>
              </div>
            </div>
          )}

          {tab === 'bulk' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Canal</label>
                  <select value={bulkType} onChange={(e) => setBulkType(e.target.value as 'email' | 'sms')} className="w-full rounded border px-3 py-2">
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Destinatarios</label>
                  <input value={bulkRecipients} onChange={(e) => setBulkRecipients(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="Separados por coma" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Asunto (opcional)</label>
                <input value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} className="w-full rounded border px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Mensaje</label>
                <textarea value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)} className="w-full rounded border px-3 py-2" rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className="rounded border px-4 py-2">Cancelar</button>
                <button onClick={handleBulk} className="rounded bg-blue-600 px-4 py-2 text-white">Enviar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
