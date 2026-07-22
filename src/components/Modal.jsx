import { useEffect } from 'react'
import Icon from './Icon'

/** Dialog form standar untuk seluruh halaman master data. */
export default function Modal({ title, subtitle, onClose, children, footer, wide }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 backdrop-blur-sm">
      <div className={'card my-8 w-full overflow-hidden ' + (wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="flex items-start justify-between bg-brand-grad px-6 py-4 text-white">
          <div>
            <p className="text-base font-semibold">{title}</p>
            {subtitle && <p className="text-[11px] text-white/80">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/15" title="Tutup">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex justify-end gap-2 border-t border-ink-300/30 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  )
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <label className="label-xs">{label}</label>
        {hint && <span className="text-[11px] text-ink-400">{hint}</span>}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  )
}

export function PageHeader({ title, desc, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
      <div>
        <h2 className="text-base font-semibold text-ink-700">{title}</h2>
        <p className="text-xs text-ink-400">{desc}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}
