import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import Modal, { Field, PageHeader } from '../components/Modal'
import { useToast } from '../components/Toast'
import { currentUser, getCustomers, getSettings, getTransactions, saveCustomer } from '../mock/api'
import { can } from '../mock/roles'
import { rp } from '../utils/format'

const kosong = {
  customer_name: '',
  phone: '',
  customer_type: 'retail',
  credit_limit: 0,
  blacklist_level: '',
  blacklist_reason: '',
}

const RISK_BADGE = {
  warning: 'bg-amber-50 text-amber-700',
  blocked: 'bg-brand-50 text-brand-600',
}

/** BRD 1 & 6 — Master Customer, kredit limit, dan blacklist dua level. */
export default function MasterCustomer() {
  const toast = useToast()
  const user = currentUser()
  const boleh = can(user, 'blacklist.manage')

  const [rows, setRows] = useState([])
  const [trx, setTrx] = useState([])
  const [setting, setSetting] = useState({})
  const [q, setQ] = useState('')
  const [form, setForm] = useState(null)
  const [detail, setDetail] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => getCustomers().then(setRows), [])

  useEffect(() => {
    load()
    getSettings().then(setSetting)
    getTransactions().then(setTrx)
  }, [load])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return rows.filter(
      (c) =>
        !t || c.customer_name.toLowerCase().includes(t) || (c.phone || '').includes(t.replace(/\D/g, '')),
    )
  }, [rows, q])

  const submit = async (e) => {
    e?.preventDefault()
    setBusy(true)
    try {
      await saveCustomer({ ...form, blacklist_level: form.blacklist_level || null })
      toast(form.customer_id ? 'Data pelanggan diperbarui.' : 'Pelanggan baru ditambahkan.')
      setForm(null)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const riwayat = (c) =>
    trx.filter((t) => t.customer_id === c.customer_id).sort((a, b) => b.trx_id - a.trx_id)

  return (
    <div className="space-y-6 pt-2">
      <div className="card overflow-hidden">
        <PageHeader
          title="Master Customer"
          desc={`Tipe retail/B2B, kredit limit, piutang berjalan, dan blacklist. Blokir otomatis saat piutang mencapai ${setting.ar_block_percent ?? 100}% kredit limit`}
        >
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300"
            />
            <input
              className="input w-56 pl-9"
              placeholder="Cari nama atau nomor HP"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => setForm({ ...kosong })}>
            <Icon name="plus" /> Pelanggan Baru
          </button>
        </PageHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Nama</th>
                <th className="th">Nomor HP</th>
                <th className="th text-center">Tipe</th>
                <th className="th text-right">Kredit Limit</th>
                <th className="th text-right">Piutang</th>
                <th className="th text-right">Total Belanja</th>
                <th className="th text-center">Status</th>
                <th className="th text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.customer_id} className="cursor-pointer hover:bg-canvas/60" onClick={() => setDetail(c)}>
                  <td className="td font-medium text-ink-700">{c.customer_name}</td>
                  <td className="td font-mono text-xs text-ink-500">{c.phone || '—'}</td>
                  <td className="td text-center">
                    <span className="rounded-md bg-canvas px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                      {c.customer_type}
                    </span>
                  </td>
                  <td className="td text-right text-ink-500">{c.credit_limit ? rp(c.credit_limit) : '—'}</td>
                  <td className="td text-right">
                    <span className={c.ar_ratio >= 100 ? 'font-semibold text-brand-600' : ''}>
                      {c.outstanding ? rp(c.outstanding) : '—'}
                    </span>
                    {c.credit_limit > 0 && (
                      <span className="block text-[10px] text-ink-400">{c.ar_ratio}% limit</span>
                    )}
                  </td>
                  <td className="td text-right text-ink-500">{rp(c.total_spent)}</td>
                  <td className="td text-center">
                    {c.risk_level ? (
                      <span
                        className={
                          'rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ' +
                          RISK_BADGE[c.risk_level]
                        }
                      >
                        {c.risk_level === 'blocked' ? 'tolak otomatis' : 'perhatian'}
                        {c.auto_blocked && !c.blacklist_level ? ' (auto)' : ''}
                      </span>
                    ) : (
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        aman
                      </span>
                    )}
                  </td>
                  <td className="td text-right">
                    <button
                      className="btn-ghost px-3 py-1.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        setForm({
                          ...c,
                          blacklist_level: c.blacklist_level || '',
                          blacklist_reason: c.blacklist_reason || '',
                        })
                      }}
                    >
                      Ubah
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- form --- */}
      {form && (
        <Modal
          title={form.customer_id ? 'Ubah Pelanggan' : 'Pelanggan Baru'}
          subtitle={boleh ? 'Blacklist & kredit limit dapat diubah' : 'Blacklist & kredit limit hanya untuk Kepala Toko / Owner'}
          onClose={() => setForm(null)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setForm(null)}>
                Batal
              </button>
              <button className="btn-primary" onClick={submit} disabled={busy}>
                {busy ? 'Menyimpan…' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama / Instansi" className="sm:col-span-2">
              <input
                className="input"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              />
            </Field>
            <Field label="Nomor HP" hint="dipakai saat input antrian">
              <input
                className="input"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
              />
            </Field>
            <Field label="Tipe Customer">
              <select
                className="input"
                value={form.customer_type}
                onChange={(e) => setForm({ ...form, customer_type: e.target.value })}
              >
                <option value="retail">Retail (harga B2C)</option>
                <option value="b2b">B2B (harga B2B + kredit)</option>
              </select>
            </Field>
            <Field
              label="Kredit Limit"
              hint={form.customer_type === 'b2b' ? 'kosongkan untuk limit default' : 'khusus B2B'}
            >
              <input
                type="number"
                className="input"
                disabled={!boleh || form.customer_type !== 'b2b'}
                value={form.credit_limit || ''}
                onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
              />
            </Field>
            <Field label="Level Blacklist">
              <select
                className="input"
                disabled={!boleh}
                value={form.blacklist_level || ''}
                onChange={(e) => setForm({ ...form, blacklist_level: e.target.value })}
              >
                <option value="">Tidak ada</option>
                <option value="warning">Perhatian (kuning)</option>
                <option value="blocked">Tolak Otomatis (merah)</option>
              </select>
            </Field>
            <Field label="Alasan Blacklist" className="sm:col-span-2" hint="wajib bila level diisi">
              <input
                className="input"
                disabled={!boleh}
                value={form.blacklist_reason || ''}
                onChange={(e) => setForm({ ...form, blacklist_reason: e.target.value })}
                placeholder="mis. menunggak 90 hari"
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* --- profil & riwayat --- */}
      {detail && (
        <Modal
          wide
          title={detail.customer_name}
          subtitle={`${detail.customer_type.toUpperCase()} · ${detail.phone || 'tanpa nomor HP'}`}
          onClose={() => setDetail(null)}
          footer={
            <button className="btn-ghost" onClick={() => setDetail(null)}>
              Tutup
            </button>
          }
        >
          {detail.risk_level && (
            <div className={'mb-4 rounded-xl px-4 py-3 text-sm ' + RISK_BADGE[detail.risk_level]}>
              <p className="font-semibold uppercase">
                {detail.risk_level === 'blocked' ? 'Tolak Otomatis' : 'Perhatian'}
              </p>
              <p className="text-xs">{detail.risk_reason}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['Kredit Limit', detail.credit_limit ? rp(detail.credit_limit) : '—'],
              ['Piutang Berjalan', detail.outstanding ? rp(detail.outstanding) : '—'],
              ['Total Belanja', rp(detail.total_spent)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-canvas px-4 py-3">
                <p className="label-xs">{l}</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-700">{v}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 label-xs">Riwayat Order</p>
          <table className="mt-2 w-full">
            <thead>
              <tr>
                <th className="th">No. POS</th>
                <th className="th">Tanggal</th>
                <th className="th text-right">Total</th>
                <th className="th text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {riwayat(detail).map((t) => (
                <tr key={t.trx_id}>
                  <td className="td font-medium">{t.pos_number}</td>
                  <td className="td text-ink-500">{new Date(t.trx_date).toLocaleString('id-ID')}</td>
                  <td className="td text-right font-semibold">{rp(t.grand_total)}</td>
                  <td className="td text-center text-ink-500">{t.status}</td>
                </tr>
              ))}
              {!riwayat(detail).length && (
                <tr>
                  <td className="td text-center text-ink-400" colSpan={4}>
                    Belum ada order tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  )
}
