"use client";

import dynamic from "next/dynamic";

// Client-only components (prevent SSR to avoid hydration mismatches)
const ConditionalNavigationNoSSR = dynamic(
  () => import("./ConditionalNavigation").then((m) => ({ default: m.ConditionalNavigation })),
  { ssr: false }
);

const BottomNavigationNoSSR = dynamic(
  () => import("./BottomNavigation"),
  { ssr: false }
);

export function ClientNavigation() {
  return (
    <>
      <ConditionalNavigationNoSSR />
      <BottomNavigationNoSSR />
    </>
  );
}