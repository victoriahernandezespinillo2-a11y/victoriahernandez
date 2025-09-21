"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { QrCodeIcon, CameraIcon, CheckCircleIcon, ExclamationTriangleIcon, StopIcon, BoltIcon } from "@heroicons/react/24/outline";
import QrScanner from 'qr-scanner';

// Desde la versión ≥1.4 de qr-scanner el worker se resuelve automáticamente, por lo que
// no es necesario establecer WORKER_PATH manualmente.

type VerifyResponse = {
  ok: boolean;
  reservation?: {
    id: string;
    user: { id: string; name?: string | null; email?: string | null };
    court: { id: string; name: string; center: string };
    startTime: string;
    endTime: string;
  };
  order?: {
    id: string;
    user: { id: string; name?: string | null; email?: string | null };
    status: string;
    createdAt: string;
    items?: Array<{ name: string; qty?: number; type?: string; requiresCheckIn?: boolean }>;
    itemsRequiringCheckIn?: Array<{ name: string; quantity: number; type?: string }>;
    alreadyRedeemed?: boolean;
    canCheckIn?: boolean;
  };
  error?: string;
};

function isLikelyJwtToken(text: string): boolean {
  return /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(text.trim());
}

function extractTokenFromText(text: string): string | null {
  const trimmed = text.trim();
  if (isLikelyJwtToken(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const tokenParam = url.searchParams.get("token");
    if (tokenParam) return tokenParam;
  } catch {
    // not a URL
  }
  // Try querystring style token=...
  const match = trimmed.match(/token=([^&\s]+)/i);
  if (match?.[1]) return match[1];
  return null;
}

export default function AccessControlPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [lastScanText, setLastScanText] = useState<string>("");
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string>("");
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [checkInLoading, setCheckInLoading] = useState<boolean>(false);
  const [checkInError, setCheckInError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  // Flash
  const [hasFlash, setHasFlash] = useState<boolean>(false);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  // Gestión de dispositivos y arranque
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [startingCamera, setStartingCamera] = useState<boolean>(false);

  // Comprobar disponibilidad de cámara y precargar lista
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (mounted) setHasCamera(false);
          return;
        }
        const available = await QrScanner.hasCamera();
        if (mounted) setHasCamera(available);
        if (available) {
          try {
            const cams = await QrScanner.listCameras();
            if (mounted && Array.isArray(cams)) {
              setAvailableCameras(cams);

              // Filtrar cámaras físicas (excluye virtuales)
              const real = cams.filter(c => !/virtual|obs|screen|fake/i.test(c.label || ''));
              if (mounted) setHasCamera(real.length > 0);
            }
          } catch {
            // ignore
          }
        }
      } catch (e) {
        if (mounted) setHasCamera(false);
      }
    };
    check();
    return () => { mounted = false; };
  }, []);
  const stopCamera = useCallback(() => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setCameraActive(false);
    setScanning(false);
  }, []);

  const handleVerify = useCallback(async (tokenInput?: string) => {
    setVerifyError("");
    setVerifyResult(null);
    setVerifying(true);

    try {
      const token = tokenInput || lastScanText;
      if (!token) {
        setVerifyError("No se proporcionó token para verificar.");
        setVerifying(false);
        return;
      }

      const extractedToken = extractTokenFromText(token);
      if (!extractedToken) {
        setVerifyError("El texto escaneado no contiene un token válido.");
        setVerifying(false);
        return;
      }

      // Primero intentar verificación de pedidos (endpoint existente)
      let response = await fetch(`/api/orders/verify?token=${encodeURIComponent(extractedToken)}`);
      if (!response.ok) {
        // Fallback legacy: intentar verificación de acceso si existiera
        response = await fetch(`/api/access/verify?token=${encodeURIComponent(extractedToken)}`);
      }

      if (!response.ok) {
        const errorData = await response.text();
        setVerifyError(`Error de verificación: ${errorData || 'Token no válido o expirado'}`);
        setVerifying(false);
        return;
      }

      const result: VerifyResponse = await response.json();
      setVerifyResult(result);
      
      if (!result.ok) {
        setVerifyError(result.error || "Error de verificación desconocido");
      }
      
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Verification error:', error);
      }
      setVerifyError("Error de red al verificar el token.");
    } finally {
      setVerifying(false);
    }
  }, [lastScanText]);

  const startCamera = useCallback(async () => {
    setVerifyError("");
    setSuccess("");
    setVerifyResult(null);

    // Evitar arranques concurrentes o redundantes
    if (startingCamera || scanning || cameraActive || qrScannerRef.current) {
      return;
    }
    setStartingCamera(true);

    // Verificar contexto seguro (HTTPS) salvo localhost
    if (window.isSecureContext === false && location.hostname !== 'localhost') {
      setVerifyError('La cámara sólo puede usarse bajo HTTPS o en localhost. Accede mediante https o usa un túnel seguro.');
      setStartingCamera(false);
      return;
    }

    // Verificación básica de soporte del navegador
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVerifyError("Tu navegador no soporta acceso a la cámara. Usa la entrada manual como alternativa.");
      setStartingCamera(false);
      return;
    }

    // Asegurar que el <video> ya esté montado
    if (!videoRef.current) {
      await new Promise((r) => setTimeout(r, 0));
    }
    if (!videoRef.current) {
      setVerifyError("Elemento de video no disponible.");
      setStartingCamera(false);
      return;
    }

    try {
      const qrScanner = new QrScanner(
        videoRef.current,
        (result: string) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('QR Code detected:', result);
          }
          const resultText = result;
          if (resultText && resultText !== lastScanText) {
            setLastScanText(resultText);
            const token = extractTokenFromText(resultText);
            if (token) {
              stopCamera();
              if (navigator.vibrate) {
                navigator.vibrate(100);
              }
              handleVerify(token);
            }
          }
        }
      );

      qrScannerRef.current = qrScanner;

      // Iniciar (solicita permisos)
      await qrScanner.start();
      setCameraActive(true);
      setScanning(true);

      // Comprobar disponibilidad de flash
      try {
        const flash = await qrScanner.hasFlash();
        setHasFlash(flash);
        setFlashOn(false);
      } catch {
        setHasFlash(false);
      }

      // Enumerar y seleccionar cámara adecuada
      try {
        const cameras = await QrScanner.listCameras();
        setAvailableCameras(cameras);

        const realCameras = cameras.filter(c => !/virtual|obs|screen|fake/i.test(c.label || ''));
        const preselected = selectedCameraId && cameras.find(c => (c as any).id === selectedCameraId);
        if (preselected && (preselected as any).id) {
          await qrScanner.setCamera((preselected as any).id);
        } else {
          const rear = realCameras.find(c => /back|rear|environment/i.test(c.label || ''));
          const chosen = rear ?? realCameras[0] ?? cameras[0];
          if (chosen && (chosen as any).id) {
            await qrScanner.setCamera((chosen as any).id);
            setSelectedCameraId((chosen as any).id);
          }
        }
      } catch (camErr) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('No fue posible enumerar/seleccionar cámaras; usando la predeterminada.', camErr);
        }
      }
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error accessing camera:', error);
      }
      let errorMessage = "No se pudo acceder a la cámara.";
      const msg = typeof error?.message === 'string' ? error.message : '';
      const name = error?.name;
      if (name === 'NotAllowedError') {
        errorMessage = "Permisos de cámara denegados. Permite el acceso a la cámara en tu navegador.";
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError' || /camera not found|no cameras? found/i.test(msg)) {
        errorMessage = "No se encontró ninguna cámara en el dispositivo.";
      } else if (name === 'NotSupportedError') {
        errorMessage = "El navegador no soporta acceso a la cámara.";
      } else if (name === 'NotReadableError') {
        errorMessage = "La cámara está siendo usada por otra aplicación.";
      } else if (/no cameras? found|no camera/i.test(msg)) {
        errorMessage = "No se encontró ninguna cámara física conectada. Conecta una webcam o usa la entrada manual.";
      } else {
        errorMessage = `No se pudo inicializar la cámara. ${msg || 'Revisa la conexión de tu webcam o usa la entrada manual.'}`;
      }
      setVerifyError(errorMessage);
      setCameraActive(false);
      setScanning(false);
    } finally {
      setStartingCamera(false);
    }
  }, [handleVerify, lastScanText, startingCamera, scanning, cameraActive, selectedCameraId]);

  // Permitir cambiar de cámara manualmente
  const switchCamera = useCallback(async (id: string) => {
    if (!qrScannerRef.current) return;
    try {
      await qrScannerRef.current.setCamera(id);
      setSelectedCameraId(id);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('No se pudo cambiar de cámara:', e);
      }
      setVerifyError("No se pudo cambiar de cámara. Intenta otra o reinicia la cámara.");
    }
  }, []);

  // Alternar flash
  const toggleFlash = useCallback(async () => {
    if (!qrScannerRef.current || !hasFlash) return;
    try {
      if (flashOn) {
        await qrScannerRef.current?.turnFlashOff?.();
      } else {
        await qrScannerRef.current?.turnFlashOn?.();
      }
      setFlashOn(!flashOn);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('Flash toggle error', e);
    }
  }, [flashOn, hasFlash]);

  const handleCheckIn = useCallback(async () => {
    if (!verifyResult) return;

    setCheckInLoading(true);
    setCheckInError("");
    setSuccess("");

    try {
      let endpoint = "";
      let id = "";

      if (verifyResult.reservation) {
        endpoint = `/api/admin/reservations/${verifyResult.reservation.id}/check-in`;
        id = verifyResult.reservation.id;
      } else if (verifyResult.order) {
        endpoint = `/api/admin/orders/${verifyResult.order.id}/check-in`;
        id = verifyResult.order.id;
      } else {
        setCheckInError("No se pudo determinar el tipo de elemento para check-in.");
        setCheckInLoading(false);
        return;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        setCheckInError(`Error en check-in: ${errorData}`);
        setCheckInLoading(false);
        return;
      }

      const result = await response.json();
      
      if (result.ok) {
        const itemName = verifyResult.reservation
          ? `Reserva ${verifyResult.reservation.court.name}`
          : (() => {
              const items = verifyResult.order?.items;
              if (items && items.length) {
                const first = items[0];
                if (first) {
                  const extra = items.length > 1 ? ` + ${items.length - 1} más` : '';
                  return `Pedido ${first.name}${extra}`;
                }
              }
              return `Pedido ${verifyResult.order?.id}`;
            })();
        
        setSuccess(`✅ Check-in exitoso para ${itemName}`);
        setVerifyResult(null);
        setLastScanText("");
        
        // Auto-hide success message after 3 segundos
        setTimeout(() => {
          setSuccess("");
        }, 3000);
      } else {
        setCheckInError(result.error || "Error desconocido en check-in");
      }
      
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Check-in error:', error);
      }
      setCheckInError("Error de red durante el check-in.");
    } finally {
      setCheckInLoading(false);
    }
  }, [verifyResult]);

  const handleManualInput = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLastScanText(value);
  }, []);

  const handleManualVerify = useCallback(() => {
    if (lastScanText.trim()) {
      handleVerify(lastScanText.trim());
    }
  }, [lastScanText, handleVerify]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        
        {/* Header Card */}
        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl shadow-xl mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-12 rounded-t-3xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <QrCodeIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Control de Acceso</h1>
                  <p className="text-blue-100 text-lg">Sistema QR de Reservas y Pedidos</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/90 backdrop-blur-sm border border-white/20 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-8 space-y-8">
            
            {/* Camera Controls */}
            <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
              {!cameraActive ? (
                <>
                  <button
                    onClick={startCamera}
                    disabled={!hasCamera || startingCamera}
                    className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-2xl"></div>
                    <CameraIcon className="h-6 w-6 mr-3 relative z-10" />
                    <span className="relative z-10">
                      {startingCamera ? 'Iniciando…' : (hasCamera ? "Iniciar Cámara" : "Cámara No Disponible")}
                    </span>
                  </button>
                  
                </>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  {availableCameras.length > 0 && (
                    <select
                      value={selectedCameraId ?? ''}
                      onChange={(e) => switchCamera(e.target.value)}
                      className="px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      title="Seleccionar cámara"
                    >
                      {availableCameras.map((cam) => (
                        <option key={cam.id} value={cam.id}>{cam.label || 'Cámara'}</option>
                      ))}
                    </select>
                  )}
                  {hasFlash && (
                    <button
                      onClick={toggleFlash}
                      className={`inline-flex items-center px-4 py-3 border border-transparent text-sm font-semibold rounded-xl transition-all duration-200 ${flashOn ? 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg shadow-yellow-500/25' : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg shadow-gray-500/25'}`}
                      title="Encender/Apagar flash"
                    >
                      <BoltIcon className="h-5 w-5 mr-2" /> {flashOn ? 'Flash Off' : 'Flash'}
                    </button>
                  )}
                  <button
                    onClick={stopCamera}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25 transition-all duration-200 transform hover:scale-105"
                  >
                    <StopIcon className="h-5 w-5 mr-2" />
                    Detener Cámara
                  </button>
                </div>
              )}
            </div>

            {/* Camera Error Display */}
            {verifyError && (
              <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/50 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 text-red-700">
                  <div className="p-2 bg-red-100 rounded-full">
                    <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                  </div>
                  <span className="font-semibold text-base">Error de verificación</span>
                </div>
                <p className="text-sm text-red-600 mt-3 leading-relaxed">{verifyError}</p>
                
                {/* Botón para solicitar permisos de cámara */}
                {verifyError.includes("cámara") && (
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {
                        setVerifyError("");
                        startCamera();
                      }}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <CameraIcon className="h-4 w-4 mr-2" />
                      Solicitar Permisos de Cámara
                    </button>
                    <button
                      onClick={() => setVerifyError("")}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Usar Entrada Manual
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 text-green-700">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
                  </div>
                  <span className="font-semibold text-base">Éxito</span>
                </div>
                <p className="text-sm text-green-600 mt-3 leading-relaxed">{success}</p>
              </div>
            )}

            {/* Video / Placeholder */}
            <div
              className={`relative rounded-3xl overflow-hidden transition-all duration-500 shadow-2xl mx-auto max-w-md ${cameraActive ? 'bg-black shadow-blue-500/10' : 'bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center h-48 sm:h-56 border border-gray-200/50'}`}
            >
              {/* Video Stream */}
              <video
                ref={videoRef}
                className={`w-full h-auto max-h-96 object-cover transition-opacity duration-500 ${cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                playsInline
                muted
              />

              {/* Placeholder cuando la cámara está inactiva */}
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="p-4 bg-white rounded-full shadow-lg">
                    <CameraIcon className="h-8 w-8 text-gray-400" aria-hidden="true" />
                  </div>
                </div>
              )}

              {/* Overlay de escaneo */}
              {cameraActive && scanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/60 backdrop-blur-sm text-white px-6 py-4 rounded-2xl border border-white/20">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span className="font-medium">Escaneando QR...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Manual Input - Solo visible si hay error de cámara */}
            {verifyError && (
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-3xl p-6 border border-gray-200/50 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <QrCodeIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  Entrada Manual
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={lastScanText}
                    onChange={handleManualInput}
                    placeholder="Pega aquí el token QR o URL..."
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-200"
                  />
                  <button
                    onClick={handleManualVerify}
                    disabled={!lastScanText.trim() || verifying}
                    className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 transition-all duration-200 transform hover:scale-105 disabled:scale-100"
                  >
                    {verifying ? "Verificando..." : "Verificar"}
                  </button>
                </div>
              </div>
            )}

            {/* Verification Results */}
            {verifyResult && verifyResult.ok && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {verifyResult.reservation ? "Reserva Encontrada" : "Pedido Encontrado"}
                </h3>
                
                {verifyResult.reservation && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Usuario:</span>
                        <p className="text-sm text-gray-900">
                          {verifyResult.reservation.user.name || verifyResult.reservation.user.email}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Cancha:</span>
                        <p className="text-sm text-gray-900">{verifyResult.reservation.court.name}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Fecha:</span>
                        <p className="text-sm text-gray-900">
                          {new Date(verifyResult.reservation.startTime).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Horario:</span>
                        <p className="text-sm text-gray-900">
                          {new Date(verifyResult.reservation.startTime).toLocaleTimeString('es-ES')} - 
                          {new Date(verifyResult.reservation.endTime).toLocaleTimeString('es-ES')}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleCheckIn}
                      disabled={checkInLoading}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {checkInLoading ? "Procesando..." : "Check-in de Reserva"}
                    </button>
                  </div>
                )}
                
                {verifyResult.order && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Usuario:</span>
                        <p className="text-sm text-gray-900">
                          {verifyResult.order.user.name || verifyResult.order.user.email}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Productos:</span>
                        <div className="text-sm text-gray-900">
                          {verifyResult.order.items && verifyResult.order.items.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1">
                              {verifyResult.order.items.map((it, idx) => (
                                <li key={idx}>
                                  {it.name} {it.qty ? `× ${it.qty}` : ''}
                                  {typeof it.requiresCheckIn === 'boolean' ? (
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${it.requiresCheckIn ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                                      {it.requiresCheckIn ? 'requiere check-in' : 'sin check-in'}
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Estado:</span>
                        <p className="text-sm text-gray-900">{verifyResult.order.status}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Fecha:</span>
                        <p className="text-sm text-gray-900">
                          {new Date(verifyResult.order.createdAt).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    
                    {verifyResult.order.itemsRequiringCheckIn && verifyResult.order.itemsRequiringCheckIn.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Productos para entregar:</span>
                        <ul className="text-sm text-gray-900 mt-1">
                          {verifyResult.order.itemsRequiringCheckIn.map((item, index) => (
                            <li key={index}>• {item.name} (x{item.quantity})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {verifyResult.order.alreadyRedeemed && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          ⚠️ Este pedido ya fue canjeado anteriormente
                        </p>
                      </div>
                    )}
                    
                    <button
                      onClick={handleCheckIn}
                      disabled={checkInLoading || verifyResult.order.alreadyRedeemed}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {checkInLoading ? "Procesando..." : "Check-in de Pedido"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Check-in Error */}
            {checkInError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-3 text-red-700">
                  <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base">Error en Check-in</span>
                </div>
                <p className="text-sm text-red-600 mt-2">{checkInError}</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}