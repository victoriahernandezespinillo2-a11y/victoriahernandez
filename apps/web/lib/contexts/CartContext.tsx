'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// Tipos del carrito
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
  category: string;
  sku: string;
  stockQty: number;
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  isOpen: boolean;
}

// Acciones del carrito
export type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; qty: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CART'; payload: CartItem[] }
  | { type: 'TOGGLE_CART' }
  | { type: 'CLOSE_CART' };

// Estado inicial
const initialState: CartState = {
  items: [],
  total: 0,
  itemCount: 0,
  isOpen: false,
};

// Reducer del carrito
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.productId === action.payload.productId);
      
      if (existingItem) {
        // Actualizar cantidad si ya existe
        const updatedItems = state.items.map(item =>
          item.productId === action.payload.productId
            ? { ...item, qty: Math.min(item.qty + action.payload.qty, item.stockQty) }
            : item
        );
        
        return calculateCartTotals({ ...state, items: updatedItems });
      } else {
        // Agregar nuevo item
        const newItems = [...state.items, action.payload];
        return calculateCartTotals({ ...state, items: newItems });
      }
    }

    case 'UPDATE_QUANTITY': {
      const updatedItems = state.items.map(item =>
        item.productId === action.payload.productId
          ? { ...item, qty: Math.max(1, Math.min(action.payload.qty, item.stockQty)) }
          : item
      );
      
      return calculateCartTotals({ ...state, items: updatedItems });
    }

    case 'REMOVE_ITEM': {
      const filteredItems = state.items.filter(item => item.productId !== action.payload);
      return calculateCartTotals({ ...state, items: filteredItems });
    }

    case 'CLEAR_CART': {
      return { ...initialState, isOpen: state.isOpen };
    }

    case 'SET_CART': {
      return calculateCartTotals({ ...state, items: action.payload });
    }

    case 'TOGGLE_CART': {
      return { ...state, isOpen: !state.isOpen };
    }

    case 'CLOSE_CART': {
      return { ...state, isOpen: false };
    }

    default:
      return state;
  }
}

// Función para calcular totales del carrito
function calculateCartTotals(state: CartState): CartState {
  const total = state.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const itemCount = state.items.reduce((sum, item) => sum + item.qty, 0);
  
  return {
    ...state,
    total: Number(total.toFixed(2)),
    itemCount,
  };
}

// Contexto del carrito
const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  addToCart: (product: any, qty: number) => void;
  updateQuantity: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  closeCart: () => void;
  isInCart: (productId: string) => boolean;
  getCartItem: (productId: string) => CartItem | undefined;
} | null>(null);

// Hook personalizado para usar el carrito
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de CartProvider');
  }
  return context;
}

// Proveedor del contexto
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Función para agregar al carrito
  const addToCart = (product: any, qty: number) => {
    const cartItem: CartItem = {
      id: `${product.id}_${Date.now()}`, // ID único para el item del carrito
      productId: product.id,
      name: product.name,
      price: Number(product.priceEuro || 0),
      qty,
      image: product.media?.[0]?.url,
      category: product.category,
      sku: product.sku,
      stockQty: product.stockQty || 0,
    };

    dispatch({ type: 'ADD_ITEM', payload: cartItem });
  };

  // Función para actualizar cantidad
  const updateQuantity = (productId: string, qty: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, qty } });
  };

  // Función para remover del carrito
  const removeFromCart = (productId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: productId });
  };

  // Función para limpiar carrito
  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  // Función para alternar visibilidad del carrito
  const toggleCart = () => {
    dispatch({ type: 'TOGGLE_CART' });
  };

  // Función para cerrar carrito
  const closeCart = () => {
    dispatch({ type: 'CLOSE_CART' });
  };

  // Función para verificar si un producto está en el carrito
  const isInCart = (productId: string) => {
    return state.items.some(item => item.productId === productId);
  };

  // Función para obtener un item del carrito
  const getCartItem = (productId: string) => {
    return state.items.find(item => item.productId === productId);
  };

  // Persistencia del carrito en localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('polideportivo_cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          dispatch({ type: 'SET_CART', payload: parsedCart });
        }
      } catch (error) {
        console.error('Error al cargar carrito desde localStorage:', error);
        localStorage.removeItem('polideportivo_cart');
      }
    }
  }, []);

  // Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('polideportivo_cart', JSON.stringify(state.items));
  }, [state.items]);

  const value = {
    state,
    dispatch,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    toggleCart,
    closeCart,
    isInCart,
    getCartItem,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}








































