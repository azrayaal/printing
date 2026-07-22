import { useEffect, useState } from 'react'
import Receipt from './Receipt'
import Icon from './Icon'
import { buildEscPos, escPosPreview } from '../mock/escpos'

/**
 * Modal preview struk + aksi cetak.
 * Props: { trx, printType, copyNumber, onClose, onReprint }
 */
export default function ReceiptModal({ trx, printType, copyNumber, onClose, onReprint }) {
  const [tab, setTab] = useState('struk')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  if (!trx) return null
  const raw = buildEscPos(trx, printType)

  const handleReprint = async () => {
    setBusy(true)
    await onReprint?.()
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 backdrop-blur-sm">
      <div className="card my-8 w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between bg-brand-grad px-6 py-4 text-white">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/80">Preview Cetak</p>
            <p className="text-lg font-semibold">{trx.pos_number}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/15" title="Tutup">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-ink-300/30 px-6 pt-4">
          {[
            ['struk', 'Struk 80mm'],
            ['escpos', 'Raw ESC/POS'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={
                'rounded-t-lg px-4 py-2 text-xs font-bold uppercase tracking-wide transition ' +
                (tab === key
                  ? 'bg-canvas text-brand-500'
                  : 'text-ink-400 hover:text-ink-700')
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto bg-canvas p-6">
          {tab === 'struk' ? (
            <Receipt trx={trx} printType={printType} copyNumber={copyNumber} />
          ) : (
            <div>
              {/* struk tetap ter-mount agar tombol Print tetap berfungsi dari tab ini */}
              <div className="print-only">
                <Receipt trx={trx} printType={printType} copyNumber={copyNumber} />
              </div>
              <p className="mb-2 text-xs text-ink-500">
                Respons <span className="font-mono">GET /api/transactions/{trx.trx_id}/escpos</span>{' '}
                &mdash; byte kontrol ditampilkan sebagai <span className="font-mono">&lt;HEX&gt;</span>.
              </p>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 text-[11px] leading-relaxed text-emerald-300">
                {escPosPreview(raw)}
              </pre>
              <button
                className="btn-ghost mt-3"
                onClick={() => navigator.clipboard?.writeText(raw)}
              >
                <Icon name="copy" /> Salin raw command
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <p className="text-xs text-ink-400">
            Copy #{copyNumber} &middot; tipe{' '}
            <span className="font-semibold uppercase text-ink-700">{printType}</span>
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={onClose}>
              Tutup
            </button>
            {onReprint && (
              <button className="btn-dark" onClick={handleReprint} disabled={busy}>
                <Icon name="copy" /> {busy ? 'Memproses' : 'Cetak Ulang'}
              </button>
            )}
            <button className="btn-primary" onClick={() => window.print()}>
              <Icon name="printer" /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
