import { createContext, useContext, useState, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { ItemIcon } from '../lib/icons.jsx'

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, ...toast }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), toast.duration || 2800)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id}
            className="glass animate-fadeUp pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg"
            style={{ borderColor: (t.color || '#38bdf8') + '66', boxShadow: `0 10px 30px -12px ${(t.color || '#38bdf8')}55` }}>
            <span className="text-xl">{t.icon ? <ItemIcon icon={t.icon} size={20} /> : <Sparkles size={20} />}</span>
            <div>
              <div className="text-sm font-semibold text-white">{t.title}</div>
              {t.sub && <div className="text-xs text-slate-400">{t.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
