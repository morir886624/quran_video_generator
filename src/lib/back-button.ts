'use client';

import { useEffect } from 'react';

export type BackButtonHandler = () => boolean | void;

interface RegisteredHandler {
  id: string;
  priority: number;
  handler: BackButtonHandler;
}

const backHandlers: RegisteredHandler[] = [];
let counter = 0;

/**
 * Registers a back button handler. Handlers with higher priority execute first.
 * If multiple handlers have the same priority, the latest registered executes first (LIFO stack).
 * Returning false from a handler allows subsequent handlers to execute; returning true or undefined stops propagation.
 */
export function registerBackButtonHandler(
  handler: BackButtonHandler,
  priority: number = 10
): () => void {
  const id = `bh_${++counter}`;
  backHandlers.push({ id, priority, handler });
  return () => {
    const idx = backHandlers.findIndex((h) => h.id === id);
    if (idx !== -1) {
      backHandlers.splice(idx, 1);
    }
  };
}

/**
 * Executes registered back button handlers. Returns true if any handler consumed the event.
 */
export function dispatchBackButton(): boolean {
  if (backHandlers.length === 0) return false;

  // Sort descending by priority, then descending by insertion index (latest first)
  const sorted = [...backHandlers].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return backHandlers.indexOf(b) - backHandlers.indexOf(a);
  });

  for (const item of sorted) {
    try {
      const res = item.handler();
      // If handler returns false explicitly, let the next handler try. Otherwise, consider handled.
      if (res !== false) {
        return true;
      }
    } catch (e) {
      console.error('Error in back button handler:', e);
    }
  }

  return false;
}

/**
 * React hook to register a back button handler when a modal or drawer is open.
 */
export function useBackButton(isOpen: boolean, onClose: () => void, priority: number = 10) {
  useEffect(() => {
    if (!isOpen) return;

    const unregister = registerBackButtonHandler(() => {
      onClose();
      return true;
    }, priority);

    return () => {
      unregister();
    };
  }, [isOpen, onClose, priority]);
}

