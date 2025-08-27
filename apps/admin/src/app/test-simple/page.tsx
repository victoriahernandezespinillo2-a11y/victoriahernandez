"use client";

import { useState } from 'react';
import { Button } from '@repo/ui/button';

export default function TestSimplePage() {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h2 className="text-lg font-semibold mb-4">Modal Simple</h2>
          <p className="mb-4">Este es un modal muy simple para probar.</p>
          <Button onClick={() => setIsOpen(false)}>
            Cerrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Prueba Modal Simple</h1>
      
      <Button onClick={() => setIsOpen(true)}>
        Abrir Modal
      </Button>
      
      <div className="mt-8 space-y-2">
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} className="h-8 bg-blue-100 rounded p-2">
            Contenido {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}




