"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

interface InstallPwaButtonProps {
  label?: string;
  className?: string;
  iconClassName?: string;
}

export default function InstallPwaButton({ label = "Descargar App", className = "", iconClassName = "fas fa-mobile-alt" }: InstallPwaButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setSupported(true);
    };
    // @ts-ignore
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      // @ts-ignore
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const onClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        // We could check userChoice if needed
      } catch {
        // ignore
      }
    } else {
      // Simple instructions fallback for PWA installation
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const isAndroid = /android/i.test(navigator.userAgent);
      if (isIOS) {
        alert("Para instalar: comparte (icono) > 'Añadir a pantalla de inicio'.");
      } else if (isAndroid) {
        alert("Para instalar: abre el menú del navegador (⋮) > 'Añadir a pantalla principal'.");
      } else {
        alert("Para instalar esta app: en el navegador, usa 'Instalar app' o arrastra el icono a la barra de aplicaciones.");
      }
    }
  };

  return (
    <button onClick={onClick} className={className} aria-label={label} title={supported ? "Instalar app" : "Cómo instalar la app"}>
      <i className={`${iconClassName} text-sm`}></i>
      <span className="text-sm">{label}</span>
    </button>
  );
}






























