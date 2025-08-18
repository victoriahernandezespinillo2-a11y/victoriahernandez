"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "./Navigation";

export function ConditionalNavigation() {
  const pathname = usePathname();

  // Ocultar la navegación pública en áreas autenticadas
  const hideOnPrefixes = ["/dashboard", "/auth"];
  const shouldHide = hideOnPrefixes.some((p) => pathname?.startsWith(p));

  if (shouldHide) return null;
  return <Navigation />;
}


