import * as React from "react"
import { cn } from "./lib/utils"

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

interface SelectContextType {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined);

const useSelectContext = () => {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within a Select");
  }
  return context;
};

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ className, children, value, onValueChange, disabled, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const selectRef = React.useRef<HTMLDivElement>(null);
    
    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      };

      if (open) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [open]);
    
    const contextValue = React.useMemo(() => ({
      value,
      onValueChange,
      open,
      setOpen,
      disabled
    }), [value, onValueChange, open, disabled]);

    return (
      <SelectContext.Provider value={contextValue}>
        <div
          ref={(node) => {
            selectRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }
          }}
          className={cn("relative", className)}
          {...props}
        >
          {children}
        </div>
      </SelectContext.Provider>
    )
  }
)
Select.displayName = "Select"

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen, disabled } = useSelectContext();

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled) return;
      // Only left-click or touch/pen
      if (e.pointerType === 'mouse' && (e as React.MouseEvent).button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(!open);
    };
    
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onPointerDown={handlePointerDown}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-colors",
          className
        )}
        {...props}
      >
        {children}
        <svg
          className={cn(
            "h-4 w-4 opacity-50 transition-transform duration-200",
            open && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & {
  placeholder?: string;
  children?: React.ReactNode;
}>(
  ({ className, placeholder, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("block truncate text-gray-900 font-medium", className)}
      {...props}
    >
      {children || placeholder}
    </span>
  )
)
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { open } = useSelectContext();
    
    if (!open) return null;
    
    return (
      <div
        ref={ref}
        role="listbox"
        className={cn(
          "absolute top-full left-0 z-[9999] min-w-[8rem] w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg mt-1 pointer-events-auto",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
  value: string;
}>(
  ({ className, children, value, ...props }, ref) => {
    const { value: selectedValue, onValueChange, setOpen } = useSelectContext();
    const isSelected = selectedValue === value;
    
    const handlePointerDown = (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onValueChange?.(value);
      setOpen(false);
    };
    
    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        tabIndex={-1}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm text-gray-900 outline-none hover:bg-gray-100 focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors",
          isSelected && "bg-gray-100 font-medium",
          className
        )}
        data-value={value}
        onPointerDown={handlePointerDown}
        {...props}
      >
        {isSelected && (
          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
        {children}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
