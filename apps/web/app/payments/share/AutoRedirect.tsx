'use client';

import { useEffect } from 'react';

interface AutoRedirectProps {
  url: string | null;
  delay?: number;
}

export default function AutoRedirect({ url, delay = 2000 }: AutoRedirectProps) {
  useEffect(() => {
    if (!url) return;
    const timer = window.setTimeout(() => {
      window.location.href = url;
    }, Math.max(0, delay));

    return () => window.clearTimeout(timer);
  }, [url, delay]);

  return null;
}

