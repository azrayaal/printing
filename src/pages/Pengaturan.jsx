import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { PageHeader } from '../components/Modal'
import { useToast } from '../components/Toast'
import { getSettings, resetDatabase, saveSettings } from '../mock/api'
import { rp } from '../utils/format'

const FIELDS = [
  {
    key: 'min_margin_percent',
    label: 'Margin Minimal (%)',
    desc: 'Kasir tidak dapat memberi diskon yang menekan margin di bawah angka ini. Pelanggaran butuh approval supervisor.',
    suffix: '%',
  },
  {
    key: 'default_credit_limit',
    label: 'Kredit Limit Default B2B',
    desc: 'Batas kredit awal untuk customer B2B baru; dapat disesuaikan per customer.',
    money: true,
  },
  {
    key: 'ar_block_percent',
    label: 'Ambang Blokir Piutang (%)',
    desc: 'Order baru diblokir otomatis saat piutang customer mencapai persentase kredit limit ini.',
    suffix: '%',
  },
  {
    key: 'overload_alert_percent',
    label: 'Ambang Alert Overload Mesin (%)',
    desc: 'Alert dikirim ke kepala produksi saat beban mesin melewati persentase kapasitas harian.',
    suffix: '%',
  },
  {
    key: 'tax_rate_percent',
    label: 'Tarif Pajak (%)',
    desc: 'Dipakai pada perhitungan invoice.',
    suffix: '%',
  },
]

/** BRD 2 & 6 — parameter global; hanya Owner yang dapat menyimpan. */
export default function Pengaturan() {
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getSettings().then(setForm)
  }, [])

  if (!form) return <div className="card mt-4 p-10 text-center text-sm text-ink-400">Memuat…</div>

  const simpan = async () => {
    setBusy(true)
    try {
      const patch = Object.fromEntries(FIELDS.map((f) => [f.key, Number(form[f.key]) || 0]))
      const next = await saveSettings(patch)
      setForm(next)
      toast('Parameter sistem tersimpan dan tercatat di audit log.')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    if (!confirm('Kembalikan SELURUH data (master, transaksi, antrian, audit) ke kondisi seed awal?'))
      return
    resetDatabase()
    getSettings().then(setForm)
    toast('Seluruh data dikembalikan ke seed awal.', 'info')
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="card overflow-hidden">
        <PageHeader
          title="Parameter Sistem"
          desc="Konfigurasi global yang mengunci perilaku kasir, produksi, dan piutang"
        >
          <button className="btn-primary" onClick={simpan} disabled={busy}>
            <Icon name="check" /> {busy ? 'Menyimpan…' : 'Simpan Perubahan'}
          </button>
        </PageHeader>

        <div className="grid gap-5 px-6 pb-6 lg:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="rounded-xl border border-ink-300/40 p-4">
              <label className="label-xs">{f.label}</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  className="input text-right font-semibold"
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
                {f.suffix && <span className="text-sm font-semibold text-ink-400">{f.suffix}</span>}
              </div>
              {f.money && (
                <p className="mt-1 text-right text-[11px] text-ink-400">{rp(form[f.key])}</p>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-ink-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-base font-semibold text-ink-700">Data Demo</h2>
        <p className="mt-1 text-xs text-ink-400">
          Mengembalikan seluruh isi penyimpanan lokal ke seed awal: master data, transaksi, antrian,
          dan audit log.
        </p>
        <button className="btn-ghost mt-4" onClick={reset}>
          <Icon name="refresh" /> Reset Seluruh Data
        </button>
      </div>
    </div>
  )
}
