import { useMemo, useState } from 'react'
import Icon from './Icon'
import { createCustomer } from '../mock/api'

/**
 * Pemilih pelanggan untuk layar kasir.
 *
 * "Pelanggan" = nama yang tercetak di baris struk dan tersimpan di kolom
 * customer_id transaksi. Default-nya "Umum" untuk pembeli biasa yang tidak
 * perlu identitas. Diisi nama/instansi bila pelanggan minta struk atas nama
 * tertentu (mis. reimburse kantor, langganan sekolah) atau agar riwayat
 * pesanannya bisa ditelusuri.
 */
export default function CustomerPicker({ customers, value, onChange, onCreated }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [form, setForm] = useState(null) // { customer_name, phone }
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const selected = customers.find((c) => String(c.customer_id) === String(value))
  const isUmum = !selected || selected.customer_name === 'Umum'

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return customers
    return customers.filter(
      (c) => c.customer_name.toLowerCase().includes(t) || (c.phone || '').includes(t),
    )
  }, [customers, q])

  const pick = (c) => {
    onChange(String(c.customer_id))
    setOpen(false)
    setQ('')
    setForm(null)
  }

  const submitNew = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const c = await createCustomer(form)
      await onCreated?.()
      pick(c)
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label-xs">Pelanggan</label>
        <span className="text-[11px] text-ink-400">tercetak di struk</span>
      </div>

      <div className="mt-1 flex items-center gap-2 rounded-lg border border-ink-300/70 bg-white px-3 py-2">
        <span
          className={
            'grid h-8 w-8 shrink-0 place-items-center rounded-lg ' +
            (isUmum ? 'bg-canvas text-ink-400' : 'bg-brand-50 text-brand-500')
          }
        >
          <Icon name="user" className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-medium text-ink-700">
            {selected?.customer_name || 'Umum'}
          </span>
          <span className="block truncate text-[11px] text-ink-400">
            {isUmum ? 'Pembeli umum, tanpa nama di struk' : selected.phone || 'Tanpa nomor telepon'}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 text-xs font-bold uppercase tracking-wide text-brand-500 hover:text-brand-600"
        >
          {open ? 'Tutup' : 'Ganti'}
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-xl border border-ink-300/50 bg-white p-3 shadow-soft">
          {!form ? (
            <>
              <div className="relative">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300"
                />
                <input
                  autoFocus
                  className="input pl-9"
                  placeholder="Cari nama atau nomor telepon"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <div className="mt-2 max-h-48 overflow-y-auto">
                {filtered.map((c) => (
                  <button
                    key={c.customer_id}
                    type="button"
                    onClick={() => pick(c)}
                    className={
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-canvas ' +
                      (String(c.customer_id) === String(value) ? 'bg-brand-50' : '')
                    }
                  >
                    <span className="text-sm text-ink-700">{c.customer_name}</span>
                    <span className="text-[11px] text-ink-400">{c.phone || '—'}</span>
                  </button>
                ))}
                {!filtered.length && (
                  <p className="px-3 py-4 text-center text-xs text-ink-400">
                    Tidak ada yang cocok. Tambahkan sebagai pelanggan baru.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setForm({ customer_name: q, phone: '' })}
                className="btn-ghost mt-2 w-full"
              >
                <Icon name="plus" /> Pelanggan Baru
              </button>
            </>
          ) : (
            <form onSubmit={submitNew}>
              <label className="label-xs">Nama / Instansi</label>
              <input
                autoFocus
                className="input mb-3 mt-1"
                placeholder="mis. CV Mitra Abadi"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              />
              <label className="label-xs">Telepon (opsional)</label>
              <input
                className="input mt-1"
                placeholder="08xxxxxxxxxx"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              {err && <p className="mt-2 text-xs text-brand-600">{err}</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" className="btn-ghost flex-1" onClick={() => setForm(null)}>
                  Batal
                </button>
                <button className="btn-primary flex-1" disabled={busy}>
                  {busy ? 'Menyimpan…' : 'Simpan'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
