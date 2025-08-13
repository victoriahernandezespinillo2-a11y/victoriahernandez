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
  const [manualInput, setManualInput] = useState<string>("");
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
    const token = tokenInput ?? extractTokenFromText(manualInput ?? "");
    if (!token) {
      setVerifyError("Ingrese un token o escanee un QR válido.");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch(`/api/access/verify?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: { "Accept": "application/json" },
        credentials: "include",
      });
      const data = (await res.json()) as VerifyResponse;
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
  }, [manualInput]);

  const handleCheckIn = useCallback(async () => {
    if (!verifyResult?.reservation?.id) return;
    setCheckInError("");
    setSuccess("");
    setCheckInLoading(true);
    try {
      const res = await fetch(`/api/admin/reservations/${verifyResult.reservation.id}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Error en check-in");
      }
      setSuccess("Check-in registrado correctamente");
      // detener cámara si sigue abierta
      stopCamera();
    } catch (e: any) {
      setCheckInError(e?.message || "Error realizando check-in");
    } finally {
      setCheckInLoading(false);
    }
  }, [verifyResult, stopCamera]);

  const header = useMemo(() => (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <QrCodeIcon className="h-6 w-6" /> Control de acceso
      </h1>
      <p className="text-slate-600 dark:text-slate-300 mt-1">
        Escanee el código QR del pase o ingrese el token manualmente para verificar y registrar el ingreso.
      </p>
    </div>
  ), []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {header}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Columna de escaneo */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <CameraIcon className="h-5 w-5" /> Escáner de QR
            </h2>
            {cameraActive ? (
              <button
                onClick={stopCamera}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300"
              >
                <StopIcon className="h-4 w-4" /> Detener
              </button>
            ) : (
              <button
                onClick={startCamera}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary-600 text-white hover:bg-primary-700"
              >
                <CameraIcon className="h-4 w-4" /> Activar cámara
              </button>
            )}
          </div>

          {!hasBarcodeDetector && (
            <div className="mb-3 text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3 text-sm flex gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
              <div>
                El navegador no soporta detección nativa de QR. Use la entrada manual o cambie a Chrome/Edge modernos.
              </div>
            </div>
          )}

          <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          </div>

          {lastScanText && (
            <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 break-all">
              Último QR leído: <span className="font-mono">{lastScanText}</span>
            </div>
          )}
        </div>

        {/* Columna de verificación/manual */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Verificación manual</h2>
          <label htmlFor="manual" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            URL del QR o token
          </label>
          <input
            id="manual"
            type="text"
            placeholder="Pega aquí la URL completa o el token JWT"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => handleVerify()}
              disabled={verifying}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {verifying ? "Verificando…" : "Verificar acceso"}
            </button>
            <button
              onClick={() => {
                setManualInput("");
                setVerifyError("");
                setVerifyResult(null);
                setSuccess("");
              }}
              className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Limpiar
            </button>
          </div>

          {verifyError && (
            <div className="mt-4 text-red-700 bg-red-50 border border-red-200 rounded-md p-3 text-sm">
              {verifyError}
            </div>
          )}

          {verifyResult?.ok && verifyResult.reservation && (
            <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-700 mb-2">
                <CheckCircleIcon className="h-5 w-5" /> Acceso válido
              </div>
              <div className="text-sm text-slate-800">
                <p><span className="font-medium">Reserva:</span> {verifyResult.reservation.id}</p>
                <p><span className="font-medium">Usuario:</span> {verifyResult.reservation.user.name || ""} ({verifyResult.reservation.user.email || ""})</p>
                <p><span className="font-medium">Centro / Cancha:</span> {verifyResult.reservation.court.center} / {verifyResult.reservation.court.name}</p>
                <p><span className="font-medium">Inicio:</span> {new Date(verifyResult.reservation.startTime).toLocaleString()}</p>
                <p><span className="font-medium">Fin:</span> {new Date(verifyResult.reservation.endTime).toLocaleString()}</p>
              </div>
              <div className="mt-3">
                <button
                  onClick={handleCheckIn}
                  disabled={checkInLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {checkInLoading ? "Registrando…" : "Registrar check-in"}
                </button>
              </div>
            </div>
          )}

          {checkInError && (
            <div className="mt-3 text-red-700 bg-red-50 border border-red-200 rounded-md p-3 text-sm">
              {checkInError}
            </div>
          )}
          {success && (
            <div className="mt-3 text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md p-3 text-sm">
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




