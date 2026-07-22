import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import Modal, { Field, PageHeader } from '../components/Modal'
import { useToast } from '../components/Toast'
import { deleteProduct, getMachines, getProducts, getSettings, saveProduct } from '../mock/api'
import { CATEGORY_LABEL } from '../mock/seed'
import { rupiah } from '../utils/format'

const kosong = {
  item_code: '',
  item_name: '',
  category: 'A',
  uom: 'Lembar',
  price: 0,
  cost: 0,
  lead_time_hours: 2,
  machine_ids: [],
  price_tiers: [{ min_qty: 1, price_b2c: 0, price_b2b: 0 }],
  is_active: true,
}

const marginOf = (p) => (p.cost ? Math.round(((p.price - p.cost) / p.cost) * 100) : 100)

/** BRD 1 — Master Produk & Harga: tier per quantity, HPP, SLA, mesin kompatibel. */
export default function MasterProduk() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [machines, setMachines] = useState([])
  const [setting, setSetting] = useState({ min_margin_percent: 20 })
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => getProducts().then(setRows), [])

  useEffect(() => {
    load()
    getMachines().then(setMachines)
    getSettings().then(setSetting)
  }, [load])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return rows.filter(
      (p) =>
        (!cat || p.category === cat) &&
        (!t || p.item_name.toLowerCase().includes(t) || p.item_code.toLowerCase().includes(t)),
    )
  }, [rows, q, cat])

  const submit = async (e) => {
    e?.preventDefault()
    setBusy(true)
    try {
      await saveProduct(form)
      toast(form.product_id ? 'Produk diperbarui.' : 'Produk baru ditambahkan.')
      setForm(null)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const hapus = async (p) => {
    if (!confirm(`Hapus produk ${p.item_name}?`)) return
    try {
      await deleteProduct(p.product_id)
      toast('Produk dihapus.')
      load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const setTier = (i, key, val) =>
    setForm((f) => {
      const t = [...f.price_tiers]
      t[i] = { ...t[i], [key]: Number(val) || 0 }
      return { ...f, price_tiers: t }
    })

  return (
    <div className="space-y-6 pt-2">
      <div className="card overflow-hidden">
        <PageHeader
          title="Master Produk & Harga"
          desc="Tier harga per quantity untuk B2C dan B2B, HPP, SLA lead-time, dan mesin kompatibel"
        >
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300"
            />
            <input
              className="input w-56 pl-9"
              placeholder="Cari produk"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="input w-44" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Semua kategori</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button className="btn-primary" onClick={() => setForm({ ...kosong })}>
            <Icon name="plus" /> Produk Baru
          </button>
        </PageHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Kode</th>
                <th className="th">Produk</th>
                <th className="th text-right">HPP</th>
                <th className="th text-right">Harga Dasar</th>
                <th className="th text-center">Margin</th>
                <th className="th">Tier Qty</th>
                <th className="th text-center">SLA</th>
                <th className="th">Mesin</th>
                <th className="th text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const m = marginOf(p)
                return (
                  <tr key={p.product_id} className="hover:bg-canvas/60">
                    <td className="td font-mono text-xs text-ink-500">{p.item_code}</td>
                    <td className="td">
                      <p className="font-medium text-ink-700">{p.item_name}</p>
                      <p className="text-[11px] text-ink-400">
                        {CATEGORY_LABEL[p.category]} · per {p.uom}
                      </p>
                    </td>
                    <td className="td text-right text-ink-500">{rupiah(p.cost)}</td>
                    <td className="td text-right font-semibold">{rupiah(p.price)}</td>
                    <td className="td text-center">
                      <span
                        className={
                          'rounded-md px-2 py-1 text-[10px] font-bold ' +
                          (m < setting.min_margin_percent
                            ? 'bg-brand-50 text-brand-600'
                            : 'bg-emerald-50 text-emerald-700')
                        }
                      >
                        {m}%
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex flex-wrap gap-1">
                        {p.price_tiers?.map((t) => (
                          <span
                            key={t.min_qty}
                            className="rounded bg-canvas px-1.5 py-0.5 text-[10px] text-ink-500"
                            title={`B2C ${rupiah(t.price_b2c)} · B2B ${rupiah(t.price_b2b)}`}
                          >
                            ≥{t.min_qty}: {rupiah(t.price_b2c)}/{rupiah(t.price_b2b)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="td text-center text-ink-500">{p.lead_time_hours} jam</td>
                    <td className="td text-[11px] text-ink-500">
                      {p.machine_ids?.length
                        ? p.machine_ids
                            .map((id) => machines.find((m2) => m2.machine_id === id)?.machine_code)
                            .filter(Boolean)
                            .join(', ')
                        : 'manual / tanpa mesin'}
                    </td>
                    <td className="td text-right">
                      <button
                        className="btn-ghost px-3 py-1.5"
                        onClick={() =>
                          setForm({ ...p, price_tiers: p.price_tiers?.map((t) => ({ ...t })) || [] })
                        }
                      >
                        Ubah
                      </button>
                      <button
                        className="ml-1 px-2 py-1.5 text-ink-300 hover:text-brand-500"
                        onClick={() => hapus(p)}
                        title="Hapus"
                      >
                        <Icon name="trash" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr>
                  <td className="td text-center text-ink-400" colSpan={9}>
                    Tidak ada produk yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <Modal
          wide
          title={form.product_id ? 'Ubah Produk' : 'Produk Baru'}
          subtitle={`Margin minimal berlaku ${setting.min_margin_percent}% terhadap HPP`}
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
            <Field label="Kode Item">
              <input
                className="input"
                value={form.item_code}
                onChange={(e) => setForm({ ...form, item_code: e.target.value })}
                placeholder="DOC-A4-CL"
              />
            </Field>
            <Field label="Nama Produk">
              <input
                className="input"
                value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              />
            </Field>
            <Field label="Kategori / Prefix Antrian">
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {k} — {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Satuan">
              <input
                className="input"
                value={form.uom}
                onChange={(e) => setForm({ ...form, uom: e.target.value })}
              />
            </Field>
            <Field label="HPP" hint="dasar pengunci margin">
              <input
                type="number"
                className="input"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </Field>
            <Field label="Harga Dasar (B2C qty 1)">
              <input
                type="number"
                className="input"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </Field>
            <Field label="SLA Lead-Time (jam)" hint="dasar estimasi selesai">
              <input
                type="number"
                className="input"
                value={form.lead_time_hours}
                onChange={(e) => setForm({ ...form, lead_time_hours: e.target.value })}
              />
            </Field>
            <Field label="Margin saat ini">
              <div className="rounded-lg bg-canvas px-3 py-2 text-sm font-semibold text-ink-700">
                {marginOf({ price: Number(form.price), cost: Number(form.cost) })}%{' '}
                <span className="text-[11px] font-normal text-ink-400">
                  (minimal {setting.min_margin_percent}%)
                </span>
              </div>
            </Field>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="label-xs">Tier Harga per Quantity</label>
                <button
                  type="button"
                  className="text-xs font-bold uppercase text-brand-500"
                  onClick={() =>
                    setForm({
                      ...form,
                      price_tiers: [
                        ...form.price_tiers,
                        { min_qty: 1, price_b2c: Number(form.price), price_b2b: Number(form.price) },
                      ],
                    })
                  }
                >
                  + Tambah tier
                </button>
              </div>
              <table className="mt-2 w-full">
                <thead>
                  <tr>
                    <th className="th">Min. Qty</th>
                    <th className="th">Harga B2C</th>
                    <th className="th">Harga B2B</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody>
                  {form.price_tiers.map((t, i) => (
                    <tr key={i}>
                      <td className="td">
                        <input
                          type="number"
                          min="1"
                          className="input py-1.5"
                          value={t.min_qty}
                          onChange={(e) => setTier(i, 'min_qty', e.target.value)}
                        />
                      </td>
                      <td className="td">
                        <input
                          type="number"
                          className="input py-1.5"
                          value={t.price_b2c}
                          onChange={(e) => setTier(i, 'price_b2c', e.target.value)}
                        />
                      </td>
                      <td className="td">
                        <input
                          type="number"
                          className="input py-1.5"
                          value={t.price_b2b}
                          onChange={(e) => setTier(i, 'price_b2b', e.target.value)}
                        />
                      </td>
                      <td className="td text-right">
                        <button
                          type="button"
                          className="text-ink-300 hover:text-brand-500"
                          onClick={() =>
                            setForm({
                              ...form,
                              price_tiers: form.price_tiers.filter((_, j) => j !== i),
                            })
                          }
                        >
                          <Icon name="trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:col-span-2">
              <label className="label-xs">Mesin Kompatibel</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {machines.map((m) => {
                  const aktif = form.machine_ids?.includes(m.machine_id)
                  return (
                    <button
                      key={m.machine_id}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          machine_ids: aktif
                            ? form.machine_ids.filter((x) => x !== m.machine_id)
                            : [...(form.machine_ids || []), m.machine_id],
                        })
                      }
                      className={
                        'rounded-lg border px-3 py-2 text-xs font-semibold transition ' +
                        (aktif
                          ? 'border-brand-500 bg-brand-50 text-brand-600'
                          : 'border-ink-300/50 text-ink-500 hover:border-brand-500')
                      }
                    >
                      {m.machine_code}
                      <span className="ml-1 font-normal text-ink-400">{m.machine_name}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-[11px] text-ink-400">
                Assignment mesin pada SPK nanti hanya menampilkan mesin yang dipilih di sini
                (dynamic machine filtering).
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
