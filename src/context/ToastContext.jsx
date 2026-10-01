import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const value = {
    toast: push,
    success: (m) => push(m, "success"),
    error: (m) => push(m, "error"),
    info: (m) => push(m, "info"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto anim-in flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl ${
              t.type === "success"
                ? "border-lime-400/20 bg-[#132016] text-lime-100"
                : t.type === "error"
                  ? "border-rose-400/20 bg-[#241016] text-rose-100"
                  : "border-white/10 bg-[#161824] text-white"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 size={16} className="mt-0.5 text-lime-400" />
            ) : t.type === "error" ? (
              <AlertTriangle size={16} className="mt-0.5 text-rose-400" />
            ) : (
              <Info size={16} className="mt-0.5 text-cyan-300" />
            )}
            <p className="flex-1 text-sm leading-5">{t.message}</p>
            <button
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              className="text-white/40 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
