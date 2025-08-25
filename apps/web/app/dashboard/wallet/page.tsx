'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { 
  CreditCard, 
  Wallet, 
  ArrowUp, 
  ArrowDown,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-6">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mi Monedero</h1>
            <p className="text-sm text-gray-500">Gestiona tus créditos fácilmente</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 space-y-6 mt-6">
        {/* Balance Card - Mobile Optimized */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Wallet className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium opacity-90">Saldo Disponible</span>
            </div>
            <div className="p-1 bg-white/20 rounded-full">
               <CheckCircle className="h-4 w-4" />
             </div>
          </div>
          <div className="text-3xl sm:text-4xl font-bold mb-2">{userCredits}</div>
          <div className="text-sm opacity-90">créditos disponibles</div>
        </div>

        {/* Quick Topup Options - Mobile First */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Recargar Créditos</h2>
            </div>
            <p className="text-sm text-gray-500">Selecciona la cantidad que deseas recargar</p>
          </div>
          
          {/* Quick Amount Buttons */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[25, 50, 100].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setCreditsToTopup(amount)}
                  className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                    creditsToTopup === amount
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="text-lg font-bold">{amount}</div>
                  <div className="text-xs opacity-70">créditos</div>
                </button>
              ))}
            </div>
            
            {/* Custom Amount Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad personalizada
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    value={creditsToTopup}
                    onChange={(e) => setCreditsToTopup(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold focus:border-blue-500 focus:ring-0 transition-colors"
                    placeholder="Ingresa cantidad"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                    créditos
                  </div>
                </div>
              </div>
              
              {/* Topup Button */}
              <button
                onClick={handleTopup}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Redirigiendo...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    <span>Recargar con Tarjeta</span>
                  </>
                )}
              </button>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Pago 100% seguro. Tus créditos se acreditarán automáticamente.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History - Mobile Optimized */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
               <Clock className="h-5 w-5 text-gray-600" />
               <h2 className="text-lg font-semibold text-gray-900">Historial de Movimientos</h2>
             </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {(ledger?.items || []).length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                   <Clock className="h-8 w-8 text-gray-400" />
                 </div>
                <p className="text-gray-500 text-sm">No hay movimientos aún</p>
                <p className="text-gray-400 text-xs mt-1">Tus transacciones aparecerán aquí</p>
              </div>
            ) : (
              (ledger?.items || []).map((m: any) => {
                const isCredit = m.type === 'CREDIT';
                const date = new Date(m.createdAt);
                const formattedDate = date.toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                });
                const formattedTime = date.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                
                return (
                  <div key={m.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`p-2 rounded-full ${
                          isCredit 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {isCredit ? (
                             <ArrowUp className="h-4 w-4" />
                           ) : (
                             <ArrowDown className="h-4 w-4" />
                           )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {m.reason}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              isCredit 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {isCredit ? 'Ingreso' : 'Gasto'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{formattedDate}</span>
                            <span>•</span>
                            <span>{formattedTime}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className={`text-lg font-bold ${
                          isCredit ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {isCredit ? '+' : '-'}{m.credits}
                        </div>
                        <div className="text-xs text-gray-500">
                          Saldo: {m.balanceAfter}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



