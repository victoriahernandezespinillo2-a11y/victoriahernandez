"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QrCodeIcon, CameraIcon, CheckCircleIcon, ExclamationTriangleIcon, StopIcon } from "@heroicons/react/24/outline";
import QrScanner from 'qr-scanner';

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

  // Check camera availability
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Checking camera support...');
        }
        
        // Verificar si estamos en HTTPS (requerido para cámara)
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
          if (process.env.NODE_ENV !== 'production') {
            console.log('Not HTTPS - camera not available');
          }
          setHasCamera(false);
          return;
        }

        // Verificar soporte básico del navegador
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('MediaDevices not supported');
          }
          setHasCamera(false);
          return;
        }

        // Usar QrScanner.hasCamera()
        const hasCamera = await QrScanner.hasCamera();
        if (process.env.NODE_ENV !== 'production') {
          console.log('QrScanner.hasCamera result:', hasCamera);
        }
        
        if (hasCamera) {
          // Intentar listar cámaras para verificar permisos
          try {
            const cameras = await QrScanner.listCameras();
            if (process.env.NODE_ENV !== 'production') {
              console.log('Available cameras:', cameras);
            }
            
            // Filtrar cámaras virtuales y usar solo cámaras reales
            const realCameras = cameras.filter(camera => 
              !camera.label.toLowerCase().includes('virtual') &&
              !camera.label.toLowerCase().includes('obs') &&
              !camera.label.toLowerCase().includes('screen')
            );
            
            if (process.env.NODE_ENV !== 'production') {
              console.log('Real cameras (filtered):', realCameras);
            }
            setHasCamera(realCameras.length > 0);
          } catch (listError) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('Cannot list cameras (permission needed):', listError);
            }
            setHasCamera(true); // Asumir que hay cámara pero sin permisos
          }
        } else {
          setHasCamera(false);
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error checking camera support:', error);
        }
        setHasCamera(false);
      }
    };
    
    checkCameraSupport();
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

  const startCamera = useCallback(async () => {
    setVerifyError("");
    setSuccess("");
    setVerifyResult(null);
    
    if (!hasCamera) {
      let errorMessage = "No se encontró ninguna cámara en el dispositivo.";
      
      // Verificar el protocolo
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        errorMessage = "Se requiere HTTPS para acceder a la cámara. Usa la entrada manual como alternativa.";
      } else if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        errorMessage = "Tu navegador no soporta acceso a la cámara. Usa la entrada manual como alternativa.";
      }
      
      setVerifyError(errorMessage);
      return;
    }

    if (!videoRef.current) {
      setVerifyError("Elemento de video no disponible.");
      return;
    }

    try {
      // Verificar que el elemento video esté en el DOM
      if (!videoRef.current.isConnected) {
        setVerifyError("El elemento de video no está conectado al DOM.");
        return;
      }

      // Verificar que estemos en HTTPS (requerido para cámara)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        setVerifyError("Se requiere HTTPS para acceder a la cámara en producción.");
        return;
      }

      // Obtener lista de cámaras reales (no virtuales)
      let selectedCameraId = 'environment'; // Por defecto
      try {
        const cameras = await QrScanner.listCameras();
        if (process.env.NODE_ENV !== 'production') {
          console.log('All cameras found:', cameras.map(c => ({ id: c.id, label: c.label })));
        }
        
        // Filtrar cámaras reales más agresivamente
        const realCameras = cameras.filter(camera => {
          const label = camera.label.toLowerCase();
          const isVirtual = label.includes('virtual') || 
                           label.includes('obs') || 
                           label.includes('screen') || 
                           label.includes('fake') ||
                           label.includes('webcam') ||
                           label.includes('usb') && label.includes('camera') === false;
          
          // En móviles, preferir cámaras que no sean front-facing por defecto
          const isFrontFacing = label.includes('front') || 
                               label.includes('facing') ||
                               label.includes('user');
          
          return !isVirtual && !isFrontFacing;
        });
        
        // Si no hay cámaras reales filtradas, usar todas las no virtuales
        const fallbackCameras = cameras.filter(camera => {
          const label = camera.label.toLowerCase();
          return !label.includes('virtual') && 
                 !label.includes('obs') && 
                 !label.includes('screen') && 
                 !label.includes('fake');
        });
        
        const camerasToUse = realCameras.length > 0 ? realCameras : fallbackCameras;
        
        if (camerasToUse.length > 0) {
          const selectedCamera = camerasToUse[0];
          if (selectedCamera) {
            selectedCameraId = selectedCamera.id;
            if (process.env.NODE_ENV !== 'production') {
              console.log('Selected camera:', selectedCamera.label, selectedCameraId);
            }
          }
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.log('No suitable cameras found, using default environment camera');
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Could not list cameras, using default:', error);
        }
      }

      // Create QR Scanner instance con worker path
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
              // Vibración para feedback táctil en móviles
              if (navigator.vibrate) {
                navigator.vibrate(100);
              }
              handleVerify(token);
            }
          }
        }
      );

      qrScannerRef.current = qrScanner;
      
      await qrScanner.start();
      setCameraActive(true);
      setScanning(true);
      setVerifyError("");
      
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error accessing camera:', error);
      }
      let errorMessage = "No se pudo acceder a la cámara.";
      
      if (error.name === 'NotAllowedError') {
        errorMessage = "Permisos de cámara denegados. Haz clic en el ícono de candado 🔒 en la barra de direcciones y permite el acceso a la cámara.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No se encontró ninguna cámara en el dispositivo.";
      } else if (error.name === 'NotSupportedError') {
        errorMessage = "El navegador no soporta acceso a la cámara.";
      } else {
        errorMessage = `Error de cámara: ${error.message}. Usa la entrada manual como alternativa.`;
      }
      
      setVerifyError(errorMessage);
    }
  }, [hasCamera, lastScanText]);

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

      // Try reservation verification first
      let response = await fetch(`/api/access/verify?token=${encodeURIComponent(extractedToken)}`);
      
      if (!response.ok) {
        // If reservation verification fails, try order verification
        response = await fetch(`/api/orders/verify?token=${encodeURIComponent(extractedToken)}`);
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
          : `Pedido ${verifyResult.order?.product.name}`;
        
        setSuccess(`✅ Check-in exitoso para ${itemName}`);
        setVerifyResult(null);
        setLastScanText("");
        
        // Auto-hide success message after 3 seconds
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

  const handleManualInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <QrCodeIcon className="h-8 w-8 text-white" />
                <h1 className="text-2xl font-bold text-white">Control de Acceso</h1>
              </div>
              <div className="text-sm text-blue-100">
                Sistema QR de Reservas y Pedidos
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6 space-y-6">
            
            {/* Camera Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              {!cameraActive ? (
                <>
                  <button
                    onClick={startCamera}
                    disabled={!hasCamera}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <CameraIcon className="h-5 w-5 mr-2" />
                    {hasCamera ? "Iniciar Cámara" : "Cámara No Disponible"}
                  </button>
                  
                  {/* Botón de diagnóstico */}
                  <button
                    onClick={async () => {
                      if (process.env.NODE_ENV !== 'production') {
                        console.log('=== DIAGNÓSTICO DE CÁMARA ===');
                        console.log('Protocolo:', location.protocol);
                        console.log('Hostname:', location.hostname);
                        console.log('MediaDevices:', !!navigator.mediaDevices);
                        console.log('getUserMedia:', !!navigator.mediaDevices?.getUserMedia);
                      }
                      
                      try {
                        const hasCamera = await QrScanner.hasCamera();
                        if (process.env.NODE_ENV !== 'production') {
                          console.log('QrScanner.hasCamera():', hasCamera);
                        }
                        
                        const cameras = await QrScanner.listCameras();
                        if (process.env.NODE_ENV !== 'production') {
                          console.log('QrScanner.listCameras():', cameras);
                        }
                        
                        // Filtrar cámaras reales
                        const realCameras = cameras.filter(camera => 
                          !camera.label.toLowerCase().includes('virtual') &&
                          !camera.label.toLowerCase().includes('obs') &&
                          !camera.label.toLowerCase().includes('screen') &&
                          !camera.label.toLowerCase().includes('fake')
                        );
                        
                        if (process.env.NODE_ENV !== 'production') {
                          console.log('Real cameras (filtered):', realCameras);
                        }
                        
                        const message = `Diagnóstico completo en consola.
                        
Cámara disponible: ${hasCamera}
Total cámaras: ${cameras.length}
Cámaras reales: ${realCameras.length}

Cámaras encontradas:
${cameras.map(c => `- ${c.label}`).join('\n')}

Cámaras reales:
${realCameras.map(c => `- ${c.label}`).join('\n')}`;
                        
                        alert(message);
                      } catch (error) {
                        if (process.env.NODE_ENV !== 'production') {
                          console.error('Error en diagnóstico:', error);
                        }
                        alert(`Error en diagnóstico: ${error instanceof Error ? error.message : String(error)}`);
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    🔍 Diagnóstico
                  </button>
                </>
              ) : (
                <button
                  onClick={stopCamera}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <StopIcon className="h-5 w-5 mr-2" />
                  Detener Cámara
                </button>
              )}
            </div>

            {/* Camera Error Display */}
            {verifyError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-3 text-red-700">
                  <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base">Error de verificación</span>
                </div>
                <p className="text-sm text-red-600 mt-2">{verifyError}</p>
                
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
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-3 text-green-700">
                  <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base">Éxito</span>
                </div>
                <p className="text-sm text-green-600 mt-2">{success}</p>
              </div>
            )}

            {/* Video Container */}
            {cameraActive && (
              <div className="relative bg-black rounded-2xl overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-auto max-h-96 object-cover"
                  playsInline
                  muted
                />
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Escaneando...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual Input */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Entrada Manual</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={lastScanText}
                  onChange={handleManualInput}
                  placeholder="Pega aquí el token QR o URL..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleManualVerify}
                  disabled={!lastScanText.trim() || verifying}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {verifying ? "Verificando..." : "Verificar"}
                </button>
              </div>
            </div>

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
                        <span className="text-sm font-medium text-gray-500">Producto:</span>
                        <p className="text-sm text-gray-900">{verifyResult.order.product.name}</p>
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