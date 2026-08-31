import { CheckCircle2, X } from "lucide-react";
import { useToastStore } from "@/store/toastStore";
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts); const dismiss = useToastStore((s) => s.dismiss);
  return <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">{toasts.map((toast) => <div key={toast.id} className="pointer-events-auto flex items-center gap-2 rounded-xl border border-[#ddd9ca] bg-white px-3.5 py-3 text-xs font-semibold text-[#35342e] shadow-[0_12px_35px_rgba(20,20,10,0.16)]"><CheckCircle2 className="h-4 w-4 text-[#687000]" /><span className="flex-1">{toast.message}</span><button onClick={() => dismiss(toast.id)} aria-label="Dismiss"><X className="h-3.5 w-3.5 text-[#8a887f]" /></button></div>)}</div>;
}
