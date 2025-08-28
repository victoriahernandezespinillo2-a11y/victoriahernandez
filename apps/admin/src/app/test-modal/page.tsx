"use client";

import { useState } from 'react';
import { Button } from '@repo/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody, DialogFooter } from '@repo/ui/dialog';
import { useModalScroll } from '../../hooks/useModalScroll';

export default function TestModalPage() {
  const [isOpen, setIsOpen] = useState(false);
  
  useModalScroll(isOpen);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Prueba de Modal</h1>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => setIsOpen(true)}>
            Abrir Modal de Prueba
          </Button>
        </DialogTrigger>
        
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modal de Prueba</DialogTitle>
          </DialogHeader>
          
          <DialogBody>
            <p className="text-gray-600">
              Este es un modal de prueba para verificar que el posicionamiento funcione correctamente.
            </p>
            <div className="mt-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </DialogBody>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => setIsOpen(false)}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Contenido de la página</h2>
        <div className="space-y-2">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="h-8 bg-blue-100 rounded p-2">
              Línea de contenido {i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}






