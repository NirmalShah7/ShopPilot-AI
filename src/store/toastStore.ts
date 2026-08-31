import { create } from "zustand";

interface Toast { id: string; message: string; }
interface ToastState { toasts: Toast[]; show: (message: string) => void; dismiss: (id: string) => void; }
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message) => {
    const id = `${Date.now()}-${Math.random()}`;
    set((state) => ({ toasts: [...state.toasts, { id, message }] }));
    window.setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), 2200);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
