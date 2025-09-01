'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useUserProfile } from '@/lib/hooks';
import { 
  CreditCard, 
  Wallet, 
  ArrowUp, 
  ArrowDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Minus,
  Euro,
  Smartphone,
  Shield,
  Zap,
  Gift,
  Star,
  TrendingUp,
  History
} from 'lucide-react';

export default function WalletPage() {
  const router = useRouter();
  const { profile, loading: profileLoading, getProfile } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState<{ items: any[]; pagination: any } | null>(null);
  const [creditsToTopup, setCreditsToTopup] = useState<number>(50);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const userCredits = useMemo(() => Number(profile?.creditsBalance ?? 0), [profile]);

  const loadLedger = async () => {
    try {
      const res = await api.wallet.ledger({ page: 1, limit: 20 });
      setLedger(res);
    } catch (e) {
      setLedger({ items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
    }
  };

  useEffect(() => {
    // Cargar saldo actual y ledger
    getProfile().catch(() => {});
    loadLedger();

    // Verificar parámetros de URL para mostrar mensajes de pago
    const urlParams = new URLSearchParams(window.location.search);
    const payment = urlParams.get('payment');
    const orderId = urlParams.get('orderId');

    if (payment === 'success') {
      setShowSuccessMessage(true);
      setPaymentMessage('¡Recarga completada con éxito! Tus créditos han sido añadidos a tu monedero.');

      // Refrescar perfil para reflejar el nuevo saldo (sin recargar toda la página)
      getProfile()
        .then(() => loadLedger())
        .catch(() => {});

      // Limpiar la query en la URL manteniendo la ruta
      router.replace('/dashboard/wallet');
    } else if (payment === 'cancel') {
      setShowErrorMessage(true);
      setPaymentMessage('Recarga cancelada. No se realizó ningún cargo.');

      router.replace('/dashboard/wallet');
    }

    // Ocultar mensajes después de 5 segundos
    const t = setTimeout(() => {
      setShowSuccessMessage(false);
      setShowErrorMessage(false);
    }, 5000);
    return () => clearTimeout(t);
  }, [getProfile, router]);

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

      {/* Mensajes de éxito/error */}
      {showSuccessMessage && (
        <div className="mx-4 sm:mx-6 mt-4 p-4 bg-green-100 border-l-4 border-green-500 rounded-r-lg">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <div>
              <p className="text-green-800 font-medium">¡Pago exitoso!</p>
              <p className="text-green-700 text-sm">{paymentMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      {showErrorMessage && (
        <div className="mx-4 sm:mx-6 mt-4 p-4 bg-red-100 border-l-4 border-red-500 rounded-r-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <p className="text-red-800 font-medium">Pago cancelado</p>
              <p className="text-red-700 text-sm">{paymentMessage}</p>
            </div>
          </div>
        </div>
      )}

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
          <div className="text-3xl sm:text-4xl font-bold mb-2">{profileLoading ? '…' : userCredits}</div>
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
          
          {/* Quick Amount Buttons - Expandido */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
              {[10, 25, 50, 100, 200, 500].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setCreditsToTopup(amount)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                    creditsToTopup === amount
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                      : 'border-gray-200 hover:border-blue-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-lg font-bold">{amount}</div>
                  <div className="text-xs opacity-70">créditos</div>
                  <div className="text-xs text-green-600 font-medium">€{amount}</div>
                </button>
              ))}
            </div>
            
            {/* Custom Amount Input - Mejorado */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  💰 Cantidad personalizada
                </label>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={creditsToTopup}
                      onChange={(e) => setCreditsToTopup(Math.max(1, Math.min(10000, Number(e.target.value) || 1)))}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-xl font-bold text-center focus:border-blue-500 focus:ring-0 transition-all duration-200 bg-white"
                      placeholder="Cantidad"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 font-medium">
                      créditos
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-400">=</div>
                  <div className="bg-green-100 border-2 border-green-200 rounded-xl px-4 py-4 min-w-[100px] text-center">
                    <div className="text-lg font-bold text-green-700">€{creditsToTopup}</div>
                    <div className="text-xs text-green-600">euros</div>
                  </div>
                </div>
                
                {/* Validaciones visuales */}
                <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
                  <span>Mínimo: 1 crédito</span>
                  <span>Máximo: 10.000 créditos</span>
                </div>
                
                {creditsToTopup > 1000 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-blue-700 text-sm">
                      <Star className="h-4 w-4" />
                      <span>¡Recarga grande! Ideal para usuarios frecuentes</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Quick Add/Subtract Buttons */}
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => setCreditsToTopup(Math.max(1, creditsToTopup - 10))}
                  className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                  title="Restar 10 créditos"
                >
                  <Minus className="h-5 w-5" />
                </button>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCreditsToTopup(creditsToTopup + 10)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                  >
                    +10
                  </button>
                  <button
                    onClick={() => setCreditsToTopup(creditsToTopup + 50)}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                  >
                    +50
                  </button>
                </div>
                
                <button
                  onClick={() => setCreditsToTopup(Math.min(10000, creditsToTopup + 10))}
                  className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                  title="Añadir 10 créditos"
                >
                  <Plus className="h-5 w-5" />
                </button>
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
                    <span>Recargar con Redsys</span>
                  </>
                )}
              </button>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <Shield className="h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Pago seguro protegido por Redsys. Tus créditos se acreditarán automáticamente tras la confirmación.</span>
              </div>
              
              {/* Información adicional - Como billeteras digitales */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">💡 Consejos de recarga</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Recarga <strong>50+ créditos</strong> para actividades frecuentes</li>
                      <li>• Los créditos <strong>no caducan</strong> nunca</li>
                      <li>• Usa cantidades redondas para facilitar el control</li>
                      <li>• Recarga en lotes grandes para menos transacciones</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Información de uso y beneficios */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Beneficios del Monedero</h2>
            </div>
            <p className="text-sm text-gray-500">Ventajas de usar créditos en lugar de pagos individuales</p>
          </div>
          
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Zap className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Pagos Instantáneos</h4>
                  <p className="text-sm text-gray-600">Reserva sin esperas, pago inmediato desde tu saldo</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Mayor Seguridad</h4>
                  <p className="text-sm text-gray-600">Menos transacciones bancarias, datos más protegidos</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Euro className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Control de Gastos</h4>
                  <p className="text-sm text-gray-600">Presupuesta tu actividad deportiva de forma simple</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <History className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Historial Completo</h4>
                  <p className="text-sm text-gray-600">Seguimiento detallado de todos tus movimientos</p>
                </div>
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





