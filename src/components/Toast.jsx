import { createContext, useCallback, useContext, useState } from 'react'
import Icon from './Icon'

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

const tone = {
  success: 'bg-success-grad',
  error: 'bg-brand-grad',
  info: 'bg-info-grad',
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setItems((v) => [...v, { id, message, type }])
    setTimeout(() => setItems((v) => v.filter((t) => t.id !== id)), 3500)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="no-print fixed bottom-6 right-6 z-[60] flex w-80 flex-col gap-3">
        {items.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-card ${tone[t.type] || tone.info}`}
          >
            <Icon name={t.type === 'error' ? 'close' : 'check'} className="mt-0.5 h-4 w-4" />
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
