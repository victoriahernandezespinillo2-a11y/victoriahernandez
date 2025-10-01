'use client';

import { useEffect, useState } from 'react';

export default function CurrentDate() {
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    setDate(new Date().toLocaleDateString('es-ES'));
  }, []);

  return <span>{date}</span>;
}








