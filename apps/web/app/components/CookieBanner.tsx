'use client';

import { useEffect, useState } from 'react';

type Consent = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

const DEFAULT_CONSENT: Consent = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [openPrefs, setOpenPrefs] = useState(false);
  const [consent, setConsent] = useState<Consent>(DEFAULT_CONSENT);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('cookie_consent');
      if (!stored) {
        setVisible(true);
      } else {
        setConsent(JSON.parse(stored));
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const persist = (c: Consent) => {
    setConsent(c);
    try {
      localStorage.setItem('cookie_consent', JSON.stringify(c));
      document.cookie = `cookie_consent=${encodeURIComponent(JSON.stringify(c))}; path=/; max-age=${60*60*24*180}`;
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({ event: 'consent_update', consent: c });
    } catch {}
  };

  const acceptAll = () => {
    persist({ necessary: true, analytics: true, marketing: true, preferences: true });
    setVisible(false);
    setOpenPrefs(false);
  };

  const rejectAll = () => {
    persist({ necessary: true, analytics: false, marketing: false, preferences: false });
    setVisible(false);
    setOpenPrefs(false);
  };

  if (!visible && !openPrefs) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {visible && (
        <div className="pointer-events-auto fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[720px] bg-white border border-gray-200 shadow-xl rounded-xl p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm text-gray-700">
              Utilizamos cookies para mejorar su experiencia, analizar el uso y personalizar contenido. 
              Puede aceptar todas, rechazarlas o configurar preferencias. Consulte la <a className="text-blue-600 underline" href="/cookies">Política de Cookies</a>.
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={rejectAll} className="px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">Rechazar</button>
              <button onClick={() => { setOpenPrefs(true); setVisible(false); }} className="px-3 py-2 text-sm rounded border border-blue-600 text-blue-700 hover:bg-blue-50">Configurar</button>
              <button onClick={acceptAll} className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Aceptar</button>
            </div>
          </div>
        </div>
      )}

      {openPrefs && (
        <div className="pointer-events-auto fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-xl">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Preferencias de Cookies</h3>
              <p className="text-sm text-gray-600">Seleccione las categorías que desea permitir.</p>
            </div>
            <div className="p-4 space-y-3">
              {[
                { key: 'necessary', label: 'Técnicas (necesarias)', desc: 'Siempre activas. Imprescindibles para el funcionamiento del sitio.' },
                { key: 'preferences', label: 'Preferencias', desc: 'Recuerdan opciones como idioma o región.' },
                { key: 'analytics', label: 'Analíticas', desc: 'Medición de uso y rendimiento del sitio.' },
                { key: 'marketing', label: 'Marketing', desc: 'Personalización de anuncios y retargeting.' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium text-gray-900">{item.label}</div>
                    <div className="text-sm text-gray-600">{item.desc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.key === 'necessary' ? true : (consent as any)[item.key]}
                      onChange={(e) => setConsent(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      disabled={item.key === 'necessary'}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 ${item.key==='necessary' ? 'bg-gray-300' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
                  </label>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => { rejectAll(); }} className="px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">Rechazar no esenciales</button>
              <button onClick={() => { acceptAll(); }} className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Aceptar todas</button>
              <button onClick={() => { persist(consent); setOpenPrefs(false); }} className="px-3 py-2 text-sm rounded border border-blue-600 text-blue-700 hover:bg-blue-50">Guardar preferencias</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



























