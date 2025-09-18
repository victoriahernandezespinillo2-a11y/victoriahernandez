"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QrCodeIcon, CameraIcon, CheckCircleIcon, ExclamationTriangleIcon, StopIcon } from "@heroicons/react/24/outline";

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
    product: { id: string; name: string };
    status: string;
    createdAt: string;
    itemsRequiringCheckIn?: Array<{ id: string; name: string; quantity: number }>;
    alreadyRedeemed?: boolean;
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
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [lastScanText, setLastScanText] = useState<string>("");
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string>("");
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [checkInLoading, setCheckInLoading] = useState<boolean>(false);
  const [checkInError, setCheckInError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // BarcodeDetector availability check
  useEffect(() => {
    const BD = (globalThis as any).BarcodeDetector;
    setHasBarcodeDetector(Boolean(BD));
  }, []);

  const stopCamera = useCallback(() => {
    const video = videoRef.current;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    setCameraActive(false);
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setVerifyError("");
    setSuccess("");
    setVerifyResult(null);
    setLastScanText("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setCameraActive(true);
      if (hasBarcodeDetector) {
        setScanning(true);
      }
    } catch (e: any) {
      setVerifyError("No se pudo acceder a la cámara. Conceda permisos o use la entrada manual.");
    }
  }, [hasBarcodeDetector]);

  // Scan loop using BarcodeDetector
  useEffect(() => {
    if (!scanning || !hasBarcodeDetector) return;
    let cancelled = false;
    let rafId = 0 as number | undefined as any;

    const detector = new (globalThis as any).BarcodeDetector({ formats: ["qr_code"] });

    const detect = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (video && !video.paused && !video.ended) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const raw = String(barcodes[0].rawValue ?? "");
              if (raw && raw !== lastScanText) {
                setLastScanText(raw);
                const token = extractTokenFromText(raw);
                if (token) {
                  setScanning(false);
                  // Vibración para feedback táctil en móviles
                  if (navigator.vibrate) {
                    navigator.vibrate(100);
                  }
                  await handleVerify(token);
                }
              }
          }
        } catch {
          // ignore transient detector errors
        }
      }
      rafId = requestAnimationFrame(detect);
    };

    rafId = requestAnimationFrame(detect);
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [scanning, hasBarcodeDetector, lastScanText]);

  const handleVerify = useCallback(async (tokenInput?: string) => {
    setVerifyError("");
    setSuccess("");
    setVerifyResult(null);
    const token = tokenInput ?? extractTokenFromText(lastScanText ?? "");
    if (!token) {
      setVerifyError("No se pudo extraer un token válido del QR escaneado.");
      return;
    }
    setVerifying(true);
    try {
      // Intentar primero con reservas
      let res = await fetch(`/api/access/verify?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: { "Accept": "application/json" },
        credentials: "include",
      });
      
      let data = (await res.json()) as VerifyResponse;
      
      // Si no es una reserva, intentar con pedidos
      if (!res.ok || !data.ok) {
        res = await fetch(`/api/orders/verify?token=${encodeURIComponent(token)}`, {
          method: "GET",
          headers: { "Accept": "application/json" },
          credentials: "include",
        });
        data = (await res.json()) as any;
      }
      
      if (!res.ok || !data.ok) {
        setVerifyError(data.error || "No autorizado o fuera de ventana horaria");
        setVerifyResult(null);
        return;
      }
      setVerifyResult(data);
    } catch (e: any) {
      setVerifyError("Error verificando acceso");
    } finally {
      setVerifying(false);
    }
  }, [lastScanText]);

  const handleCheckIn = useCallback(async () => {
    if (!verifyResult) return;
    
    setCheckInError("");
    setSuccess("");
    setCheckInLoading(true);
    
    try {
      let res: Response;
      
      // Determinar si es una reserva o un pedido
      if (verifyResult.reservation?.id) {
        // Check-in de reserva
        res = await fetch(`/api/admin/reservations/${verifyResult.reservation.id}/check-in`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        });
      } else if (verifyResult.order?.id) {
        // Check-in de pedido
        res = await fetch(`/api/admin/orders/${verifyResult.order.id}/check-in`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        });
      } else {
        throw new Error("No se puede determinar el tipo de check-in");
      }
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Error en check-in");
      }
      
      const result = await res.json();
      setSuccess("Check-in registrado correctamente");
      
      // Vibración para feedback táctil en móviles
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      // Detener cámara si sigue abierta
      stopCamera();
    } catch (e: any) {
      setCheckInError(e?.message || "Error realizando check-in");
    } finally {
      setCheckInLoading(false);
    }
  }, [verifyResult, stopCamera]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 safe-area-inset-top safe-area-inset-bottom">
      {/* Header móvil optimizado */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <QrCodeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                  Control de Acceso
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Escanea el QR para verificar acceso
                </p>
              </div>
            </div>
            {cameraActive ? (
              <button
                onClick={stopCamera}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all duration-200 active:scale-95"
              >
                <StopIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Detener</span>
              </button>
            ) : (
              <button
                onClick={startCamera}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-all duration-200 active:scale-95 shadow-lg"
              >
                <CameraIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Activar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Escáner de QR principal */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header del escáner */}
          <div className="px-4 py-4 sm:px-6 sm:py-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                <CameraIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Escáner de QR
              </h2>
            </div>
          </div>

          {/* Alerta de compatibilidad */}
          {!hasBarcodeDetector && (
            <div className="mx-4 mt-4 sm:mx-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-800 dark:text-amber-200">Navegador no compatible</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Para usar el escáner de QR, abre esta página en Chrome o Edge modernos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Área de cámara */}
          <div className="p-4 sm:p-6">
            <div className="relative aspect-square sm:aspect-video w-full bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover" 
                muted 
                playsInline 
                style={{ transform: 'scaleX(-1)' }} // Espejo para mejor UX
              />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800">
                  <div className="text-center px-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                      <CameraIcon className="h-8 w-8 sm:h-10 sm:w-10 text-primary-600 dark:text-primary-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Cámara inactiva
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                      Toca el botón para activar la cámara y comenzar a escanear códigos QR
                    </p>
                    <button
                      onClick={startCamera}
                      className="inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-all duration-200 active:scale-95 shadow-lg text-sm sm:text-base font-medium"
                    >
                      <CameraIcon className="h-5 w-5" /> 
                      <span>Activar Cámara</span>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Overlay de escaneo cuando está activo */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Marco de escaneo */}
                  <div className="absolute inset-4 border-2 border-primary-500 rounded-xl">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-500 rounded-br-lg"></div>
                  </div>
                  
                  {/* Indicador de escaneo */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-8 h-8 border-2 border-white rounded-full animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Último QR escaneado */}
            {lastScanText && (
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Último QR escaneado:</p>
                <p className="text-sm font-mono text-slate-800 dark:text-slate-200 break-all">{lastScanText}</p>
              </div>
            )}

            {/* Consejos de escaneo */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">💡</span>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 text-sm">Consejos para escanear</h4>
                  <ul className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                    <li>• Mantén el QR a 15-25 cm de la cámara</li>
                    <li>• Asegúrate de que haya buena iluminación</li>
                    <li>• Mantén el código QR centrado en el marco</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resultados de verificación */}
        {verifyError && (
          <div className="mt-4 sm:mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">Error de verificación</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">{verifyError}</p>
          </div>
        )}

        {verifyResult?.ok && (verifyResult.reservation || verifyResult.order) && (
          <div className="mt-4 sm:mt-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 sm:p-6">
            {/* Header de éxito */}
            <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300 mb-4 sm:mb-6">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">Acceso Válido</h3>
            </div>
            
            {/* Información de Reserva */}
            {verifyResult.reservation && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
                    <span className="text-lg">🏟️</span>
                  </div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-base sm:text-lg">Reserva de Cancha</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-slate-600 dark:text-slate-400 font-medium">ID de Reserva</p>
                    <p className="font-mono text-slate-800 dark:text-slate-200 text-xs sm:text-sm break-all">{verifyResult.reservation.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Usuario</p>
                    <p className="text-slate-800 dark:text-slate-200">{verifyResult.reservation.user.name || ""}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 break-all">{verifyResult.reservation.user.email || ""}</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Centro / Cancha</p>
                    <p className="text-slate-800 dark:text-slate-200">{verifyResult.reservation.court.center} / {verifyResult.reservation.court.name}</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Horario</p>
                    <div className="flex flex-col sm:flex-row sm:gap-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Inicio</p>
                        <p className="text-slate-800 dark:text-slate-200 text-sm">{new Date(verifyResult.reservation.startTime).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Fin</p>
                        <p className="text-slate-800 dark:text-slate-200 text-sm">{new Date(verifyResult.reservation.endTime).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Información de Pedido */}
            {verifyResult.order && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center">
                    <span className="text-lg">🛒</span>
                  </div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-base sm:text-lg">Pedido de Productos</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                  <div className="space-y-1">
                    <p className="text-slate-600 dark:text-slate-400 font-medium">ID de Pedido</p>
                    <p className="font-mono text-slate-800 dark:text-slate-200 text-xs sm:text-sm break-all">{verifyResult.order.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Usuario</p>
                    <p className="text-slate-800 dark:text-slate-200">{verifyResult.order.user.name || ""}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 break-all">{verifyResult.order.user.email || ""}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Estado</p>
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      verifyResult.order.status === 'PAID' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}>
                      {verifyResult.order.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Productos a canjear</p>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">{verifyResult.order.itemsRequiringCheckIn?.length || 0} productos</p>
                  </div>
                </div>
                
                {verifyResult.order.itemsRequiringCheckIn && verifyResult.order.itemsRequiringCheckIn.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">Lista de productos:</p>
                    <div className="space-y-2">
                      {verifyResult.order.itemsRequiringCheckIn.map((item: any, index: number) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                          <span className="text-slate-800 dark:text-slate-200 text-sm font-medium">{item.name}</span>
                          <span className="text-slate-500 dark:text-slate-400 text-sm">(x{item.quantity})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {verifyResult.order.alreadyRedeemed && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium text-sm">Este pedido ya fue canjeado</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Botón de acción */}
            <div className="flex justify-center sm:justify-end">
              <button
                onClick={handleCheckIn}
                disabled={checkInLoading || (verifyResult.order?.alreadyRedeemed)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 shadow-lg text-sm sm:text-base font-medium"
              >
                {checkInLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Registrando...</span>
                  </>
                ) : verifyResult.order?.alreadyRedeemed ? (
                  <>
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <span>Ya canjeado</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>Registrar Check-in</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {checkInError && (
          <div className="mt-4 sm:mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">Error en check-in</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">{checkInError}</p>
          </div>
        )}

        {success && (
          <div className="mt-4 sm:mt-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
              <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">¡Check-in exitoso!</span>
            </div>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">{success}</p>
          </div>
        )}
      </div>
    </div>
  );
}




