import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils';

export type ToastType = 'success' | 'warning' | 'error';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

let toastId = 0;
let listeners: Array<(toasts: ToastItem[]) => void> = [];
let toasts: ToastItem[] = [];

function notify() {
  for (const listener of listeners) {
    listener([...toasts]);
  }
}

export function showToast(
  message: string,
  type: ToastType = 'success',
  duration = 3000
) {
  const id = ++toastId;
  toasts = [...toasts, { id, type, message }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  }, duration);
}

const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
};

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.push(setItems);
    return () => {
      listeners = listeners.filter(l => l !== setItems);
    };
  }, []);

  if (items.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      {items.map(t => (
        <div
          key={t.id}
          className={cn(
            'px-4 py-2 rounded-md text-white text-sm shadow-lg animate-slide-in',
            typeStyles[t.type]
          )}
        >
          {t.message}
        </div>
      ))}
    </div>,
    document.body
  );
}

// Hook for component-level usage
export function useToast() {
  return useCallback(
    (message: string, type: ToastType = 'success') => showToast(message, type),
    []
  );
}
