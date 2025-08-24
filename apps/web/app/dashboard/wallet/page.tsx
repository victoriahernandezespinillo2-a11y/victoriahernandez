'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';

export default function WalletPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState<{ items: any[]; pagination: any } | null>(null);
  const [creditsToTopup, setCreditsToTopup] = useState<number>(50);
  const userCredits = useMemo(() => (session?.user as any)?.creditsBalance ?? 0, [session]);

  const loadLedger = async () => {
    try {
      const res = await api.wallet.ledger({ page: 1, limit: 20 });
      setLedger(res);
    } catch (e) {
      setLedger({ items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  const handleTopup = async () => {
    try {
      setLoading(true);
      const res = await api.wallet.topup(creditsToTopup, { checkout: true });
      const url = (res as any)?.checkoutUrl;
      if (url) {
        window.location.href = url as string;
      }
    } catch (e) {
      alert('No se pudo iniciar la recarga.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monedero</h1>
        <p className="text-gray-500 mt-1">Recarga tus créditos y revisa tus movimientos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-500">Créditos disponibles</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{userCredits}</div>
        </div>

        <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">Cantidad a recargar (créditos)</label>
              <input
                type="number"
                min={1}
                value={creditsToTopup}
                onChange={(e) => setCreditsToTopup(Math.max(1, Number(e.target.value) || 1))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <button
              onClick={handleTopup}
              disabled={loading}
              className="px-4 py-2 bg-gray-900 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Redirigiendo...' : 'Recargar con tarjeta'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Serás redirigido a un checkout seguro. Al completar, tus créditos se acreditarán automáticamente.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Movimientos</h2>
        </div>
        <div className="p-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Créditos</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(ledger?.items || []).map((m: any) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-sm text-gray-700">{new Date(m.createdAt).toLocaleString('es-ES')}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{m.type}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{m.reason}</td>
                  <td className={`px-4 py-2 text-sm text-right font-semibold ${m.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>{m.type === 'CREDIT' ? '+' : '-'}{m.credits}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-700">{m.balanceAfter}</td>
                </tr>
              ))}
              {(!ledger?.items || ledger.items.length === 0) && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>Sin movimientos</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



