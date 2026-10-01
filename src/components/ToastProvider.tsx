'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions | string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<(ToastOptions & { id: number })[]>([]);

  const showToast = useCallback((options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { message: options, type: 'info' as ToastType } : options;
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...opts, id, type: opts.type || 'info', duration: opts.duration || 3500 }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onRemove }: { toast: ToastOptions & { id: number }, onRemove: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onRemove]);

  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertCircle : Info;
  const bgClass = toast.type === 'error' 
    ? 'bg-rose-500 text-white' 
    : toast.type === 'success' 
    ? 'bg-emerald-600 text-white' 
    : 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900';

  return (
    <div className={`pointer-events-auto shadow-lg rounded-2xl px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 w-fit max-w-[90vw] ${bgClass}`}>
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={onRemove} className="ml-2 shrink-0 opacity-70 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
