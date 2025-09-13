import * as React from "react"
import { cn } from "./lib/utils"

// Hook personalizado para manejar el estado del Dialog
const useDialog = (initialOpen = false) => {
  const [open, setOpen] = React.useState(initialOpen);
  
  const openDialog = React.useCallback(() => setOpen(true), []);
  const closeDialog = React.useCallback(() => setOpen(false), []);
  const toggleDialog = React.useCallback(() => setOpen(prev => !prev), []);
  
  return {
    open,
    setOpen,
    openDialog,
    closeDialog,
    toggleDialog
  };
};

interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ className, children, open, onOpenChange, ...props }, ref) => {
    // Si el modal está abierto, renderizar el contenido del modal
    if (open) {
      return (
        <div
          ref={ref}
          className={cn("relative", className)}
          {...props}
        >
          {children}
        </div>
      );
    }
    
    // Si el modal está cerrado, solo renderizar el trigger
    return (
      <div
        ref={ref}
        className={cn("relative", className)}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type === DialogTrigger) {
            return child;
          }
          return null;
        })}
      </div>
    );
  }
)
Dialog.displayName = "Dialog"

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
  }
>(({ className, children, asChild, onClick, ...props }, ref) => {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Si hay un onClick personalizado, ejecutarlo primero
    if (onClick) {
      onClick(event);
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        // Ejecutar el onClick del botón hijo primero
        if ((children.props as any)?.onClick) {
          (children.props as any).onClick(event);
        }
        // Luego ejecutar el onClick del DialogTrigger
        handleClick(event);
      }
    } as any);
  }
  
  return (
    <button
      ref={ref}
      className={cn("", className)}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
})
DialogTrigger.displayName = "DialogTrigger"

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onClose, ...props }, ref) => {
    const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && onClose) {
        onClose();
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };

    // Extraer clases de ancho máximo del className pasado
    const maxWidthClass = className?.match(/max-w-\w+/)?.[0] || 'max-w-2xl';

    return (
      <div
        ref={ref}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50" />
        
        {/* Modal Content */}
        <div className={cn(
          "relative z-10 bg-white rounded-lg shadow-xl border border-gray-200 w-full max-h-[90vh] flex flex-col",
          maxWidthClass
        )}>
          {children}
        </div>
      </div>
    );
  }
)
DialogContent.displayName = "DialogContent"

const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6 pb-0", className)}
    {...props}
  />
))
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold text-gray-900", className)}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6 pt-0 flex-1 overflow-y-auto", className)}
    {...props}
  />
))
DialogBody.displayName = "DialogBody"

const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-end space-x-2 p-6 pt-0", className)}
    {...props}
  />
))
DialogFooter.displayName = "DialogFooter"

export { 
  Dialog, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogBody, 
  DialogFooter,
  useDialog 
}
