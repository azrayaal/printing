import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import CustomerPicker from '../components/CustomerPicker'
import ReceiptModal from '../components/ReceiptModal'
import { useToast } from '../components/Toast'
import {
  createTransaction,
  getCashiers,
  getCustomers,
  getOutlets,
  getProducts,
  getQueues,
  logPrint,
} from '../mock/api'
import { rp, rupiah, formatTime } from '../utils/format'
import { CATEGORY_LABEL, TAX_RATE } from '../mock/seed'

const PAYMENTS = [
  { key: 'cash', label: 'Tunai' },
  { key: 'qris', label: 'QRIS' },
  { key: 'debit', label: 'Kartu Debit' },
]

const CATEGORIES = [
  { key: '', label: 'Semua' },
  { key: 'A', label: CATEGORY_LABEL.A },
  { key: 'B', label: CATEGORY_LABEL.B },
  { key: 'C', label: CATEGORY_LABEL.C },
  { key: 'D', label: CATEGORY_LABEL.D },
]

function LockedField({ label, icon, value, note }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label-xs">{label}</label>
        <span className="text-[11px] text-ink-400">terkunci</span>
      </div>
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-ink-300/50 bg-canvas px-3 py-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-ink-400">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-medium text-ink-700">{value}</span>
          <span className="block truncate text-[11px] text-ink-400">{note || '—'}</span>
        </span>
      </div>
    </div>
  )
}

export default function Kasir({ user }) {
  const toast = useToast()
  // Kasir terkunci pada outlet & identitasnya sendiri; hanya Supervisor
  // yang boleh berpindah outlet atau bertransaksi atas nama kasir lain.
  const locked = user?.role === 'Kasir'

  const [outlets, setOutlets] = useState([])
  const [cashiers, setCashiers] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [queues, setQueues] = useState([])

  const [outletId, setOutletId] = useState(String(user?.outlet_id || 1))
  const [cashierId, setCashierId] = useState('')
  const [customerId, setCustomerId] = useState('1')
  const [queueId, setQueueId] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  const [cart, setCart] = useState([])
  const [discount, setDiscount] = useState('')
  const [payment, setPayment] = useState('cash')
  const [paid, setPaid] = useState('')

  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(null) // { trx, printType, copyNumber }

  const refreshQueues = useCallback(() => {
    if (outletId) getQueues(outletId).then(setQueues)
  }, [outletId])

  const refreshCustomers = useCallback(() => getCustomers().then(setCustomers), [])

  useEffect(() => {
    getOutlets().then(setOutlets)
    refreshCustomers()
    getProducts().then(setProducts)
  }, [refreshCustomers])

  useEffect(() => {
    if (!outletId) return
    getCashiers(outletId).then((c) => {
      setCashiers(c)
      const mine = c.find((x) => x.cashier_id === user?.cashier_id)
      setCashierId(String(mine?.cashier_id || c[0]?.cashier_id || ''))
    })
    refreshQueues()
    const t = setInterval(refreshQueues, 8000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletId])

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase()
    return products.filter(
      (p) =>
        (!category || p.category === category) &&
        (!t || p.item_name.toLowerCase().includes(t) || p.item_code.toLowerCase().includes(t)),
    )
  }, [products, query, category])

  const activeOutlet = outlets.find((o) => String(o.outlet_id) === String(outletId))
  const activeCashier = cashiers.find((c) => String(c.cashier_id) === String(cashierId))
  const openQueues = queues.filter((q) => q.status === 'called' || q.status === 'waiting')
  const selectedQueue = queues.find((q) => String(q.queue_id) === queueId) || null

  /* ---------------------------------------------------------- keranjang */

  const addItem = (p) => {
    setCart((c) => {
      const i = c.findIndex((x) => x.item_code === p.item_code)
      if (i > -1) {
        const next = [...c]
        next[i] = { ...next[i], qty: next[i].qty + 1 }
        return next
      }
      return [
        ...c,
        {
          item_code: p.item_code,
          item_name: p.item_name,
          uom: p.uom,
          unit_price: Number(p.price),
          qty: 1,
          discount_line: 0,
        },
      ]
    })
  }

  const setQty = (code, qty) =>
    setCart((c) =>
      qty <= 0
        ? c.filter((x) => x.item_code !== code)
        : c.map((x) => (x.item_code === code ? { ...x, qty } : x)),
    )

  const setLineDiscount = (code, val) =>
    setCart((c) =>
      c.map((x) => (x.item_code === code ? { ...x, discount_line: Math.max(0, Number(val) || 0) } : x)),
    )

  const removeItem = (code) => setCart((c) => c.filter((x) => x.item_code !== code))

  /* ------------------------------------------------------------ hitungan */

  const subtotal = cart.reduce((s, l) => s + l.qty * l.unit_price - l.discount_line, 0)
  const disc = Math.min(Number(discount) || 0, subtotal)
  const tax = Math.round((subtotal - disc) * TAX_RATE * 100) / 100
  const grandTotal = Math.round((subtotal - disc + tax) * 100) / 100
  const paidNum = Number(paid) || 0
  const change = paidNum - grandTotal
  const canPay = cart.length > 0 && cashierId && paidNum >= grandTotal && grandTotal > 0

  const quickCash = useMemo(() => {
    if (!grandTotal) return []
    const base = Math.ceil(grandTotal / 1000) * 1000
    const set = new Set([base, Math.ceil(grandTotal / 50000) * 50000, Math.ceil(grandTotal / 100000) * 100000])
    return [...set].filter((v) => v >= grandTotal).sort((a, b) => a - b).slice(0, 3)
  }, [grandTotal])

  /* ------------------------------------------------------- bayar & cetak */

  const handlePay = async () => {
    setSaving(true)
    try {
      const trx = await createTransaction({
        outlet_id: outletId,
        cashier_id: cashierId,
        customer_id: customerId,
        queue_id: queueId || null,
        discount: disc,
        payment_method: payment,
        paid_amount: paidNum,
        lines: cart,
      })
      const { print, transaction } = await logPrint(trx.trx_id, {
        print_type: 'original',
        printed_by: user?.full_name || trx.cashier.cashier_name,
      })
      setPreview({ trx: transaction, printType: print.print_type, copyNumber: print.copy_number })
      setCart([])
      setDiscount('')
      setPaid('')
      setQueueId('')
      refreshQueues()
      toast(`Transaksi ${trx.pos_number} tersimpan dan tercatat di print_log.`)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReprint = async () => {
    const { print, transaction } = await logPrint(preview.trx.trx_id, {
      print_type: 'reprint',
      printed_by: user?.full_name || 'Kasir',
    })
    setPreview({ trx: transaction, printType: print.print_type, copyNumber: print.copy_number })
    toast(`Cetak ulang tercatat sebagai copy #${print.copy_number}.`)
  }

  /* ----------------------------------------------------------------- UI */

  return (
    <div className="grid gap-6 pt-2 xl:grid-cols-[1.55fr_1fr]">
      {/* --- kolom kiri: antrian & katalog --- */}
      <div className="space-y-6">
        <div className="card p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {locked ? (
              <>
                <LockedField
                  label="Outlet"
                  icon="store"
                  value={
                    activeOutlet
                      ? `${activeOutlet.outlet_code} — ${activeOutlet.outlet_name}`
                      : 'Memuat…'
                  }
                  note={activeOutlet?.address}
                />
                <LockedField
                  label="Kasir Bertugas"
                  icon="user"
                  value={activeCashier?.cashier_name || user?.full_name || '—'}
                  note={activeCashier?.counter ? `${activeCashier.counter} · ${user?.role}` : user?.role}
                />
              </>
            ) : (
              <>
                <div>
                  <label className="label-xs">Outlet</label>
                  <select
                    className="input mt-1"
                    value={outletId}
                    onChange={(e) => setOutletId(e.target.value)}
                  >
                    {outlets.map((o) => (
                      <option key={o.outlet_id} value={o.outlet_id}>
                        {o.outlet_code} &mdash; {o.outlet_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-xs">Kasir</label>
                  <select
                    className="input mt-1"
                    value={cashierId}
                    onChange={(e) => setCashierId(e.target.value)}
                  >
                    {cashiers.map((c) => (
                      <option key={c.cashier_id} value={c.cashier_id}>
                        {c.cashier_name} &middot; {c.counter}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <CustomerPicker
              customers={customers}
              value={customerId}
              onChange={setCustomerId}
              onCreated={refreshCustomers}
            />
          </div>

          <p className="mt-4 border-t border-ink-300/30 pt-3 text-[11px] text-ink-400">
            {locked
              ? 'Outlet dan nama kasir mengikuti akun yang sedang masuk dan tidak dapat diubah. Hubungi supervisor bila perlu berpindah loket.'
              : 'Sebagai supervisor, Anda dapat memilih outlet dan bertransaksi atas nama kasir mana pun.'}
          </p>
        </div>

        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink-700">Antrian Aktif</h2>
              <p className="text-xs text-ink-400">
                Pilih nomor antrian yang sedang dilayani agar tercetak di struk
              </p>
            </div>
            <button className="btn-ghost" onClick={refreshQueues}>
              <Icon name="refresh" /> Muat Ulang
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setQueueId('')}
              className={
                'rounded-lg border px-3 py-2 text-xs font-semibold transition ' +
                (queueId === ''
                  ? 'border-brand-500 bg-brand-50 text-brand-600'
                  : 'border-ink-300/50 text-ink-500 hover:border-brand-500')
              }
            >
              Tanpa antrian
            </button>
            {openQueues.map((q) => (
              <button
                key={q.queue_id}
                onClick={() => setQueueId(String(q.queue_id))}
                className={
                  'rounded-lg border px-3 py-2 text-left text-xs transition ' +
                  (String(q.queue_id) === queueId
                    ? 'border-brand-500 bg-brand-50 text-brand-600'
                    : 'border-ink-300/50 text-ink-500 hover:border-brand-500')
                }
              >
                <span className="block text-sm font-bold">{q.queue_number}</span>
                <span className="block text-[11px]">
                  {q.service_name} &middot; {formatTime(q.created_at)}
                  {q.status === 'called' ? ' · dipanggil' : ''}
                </span>
              </button>
            ))}
            {!openQueues.length && (
              <p className="py-2 text-sm text-ink-400">Tidak ada antrian menunggu saat ini.</p>
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink-700">Katalog Layanan</h2>
              <p className="text-xs text-ink-400">Klik item untuk menambah ke keranjang</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300"
              />
              <input
                className="input pl-9"
                placeholder="Cari layanan, lalu tekan Enter"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || !filtered.length) return
                  addItem(filtered[0])
                  setQuery('')
                }}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={
                  'rounded-lg px-3 py-2 text-xs font-semibold transition ' +
                  (category === c.key
                    ? 'bg-brand-grad text-white shadow-raised'
                    : 'bg-canvas text-ink-500 hover:text-brand-500')
                }
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const inCart = cart.find((x) => x.item_code === p.item_code)
              return (
              <button
                key={p.product_id}
                onClick={() => addItem(p)}
                className={
                  'group rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-soft ' +
                  (inCart
                    ? 'border-brand-500 bg-brand-50/40'
                    : 'border-ink-300/40 hover:border-brand-500')
                }
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-300">
                    {p.item_code}
                  </p>
                  {inCart ? (
                    <span className="rounded bg-brand-grad px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {inCart.qty} di keranjang
                    </span>
                  ) : (
                    <span className="rounded bg-canvas px-1.5 py-0.5 text-[9px] font-bold text-ink-400">
                      {p.category}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-semibold leading-snug text-ink-700">{p.item_name}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-brand-500">{rp(p.price)}</span>
                  <span className="text-[11px] text-ink-400">/ {p.uom}</span>
                </div>
              </button>
              )
            })}
            {!filtered.length && (
              <p className="col-span-full py-8 text-center text-sm text-ink-400">
                Layanan tidak ditemukan.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* --- kolom kanan: keranjang & pembayaran --- */}
      <div className="space-y-6">
        <div className="card overflow-hidden">
          <div className="flex items-start justify-between bg-dark-grad px-6 py-5 text-white">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/60">Keranjang</p>
              <p className="text-lg font-semibold">
                {cart.length} baris &middot; {cart.reduce((s, l) => s + l.qty, 0)} qty
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedQueue && (
                <div className="rounded-lg bg-white/10 px-3 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-wider text-white/60">Antrian</p>
                  <p className="text-lg font-bold leading-none">{selectedQueue.queue_number}</p>
                </div>
              )}
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="rounded-lg border border-white/20 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white/70 transition hover:border-white/50 hover:text-white"
                >
                  Kosongkan
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[340px] overflow-y-auto">
            {cart.length ? (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th w-10">No</th>
                    <th className="th">Item</th>
                    <th className="th text-center">Qty</th>
                    <th className="th text-right">Subtotal</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody>
                  {cart.map((l, i) => (
                    <tr key={l.item_code}>
                      <td className="td text-center font-semibold text-brand-500">{i + 1}</td>
                      <td className="td">
                        <p className="font-medium leading-tight text-ink-700">{l.item_name}</p>
                        <p className="text-[11px] text-ink-400">
                          {l.item_code} &middot; {rupiah(l.unit_price)} / {l.uom}
                        </p>
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-ink-300">
                            Diskon
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={l.discount_line || ''}
                            placeholder="0"
                            onChange={(e) => setLineDiscount(l.item_code, e.target.value)}
                            className="w-20 rounded border border-ink-300/60 px-1.5 py-0.5 text-[11px] outline-none focus:border-brand-500"
                          />
                        </div>
                      </td>
                      <td className="td">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            className="grid h-6 w-6 place-items-center rounded border border-ink-300/60 text-ink-500 hover:border-brand-500 hover:text-brand-500"
                            onClick={() => setQty(l.item_code, l.qty - 1)}
                          >
                            <Icon name="minus" className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={l.qty}
                            onChange={(e) => setQty(l.item_code, Math.max(0, Number(e.target.value)))}
                            className="w-12 rounded border border-ink-300/60 px-1 py-0.5 text-center text-sm font-semibold outline-none focus:border-brand-500"
                          />
                          <button
                            className="grid h-6 w-6 place-items-center rounded border border-ink-300/60 text-ink-500 hover:border-brand-500 hover:text-brand-500"
                            onClick={() => setQty(l.item_code, l.qty + 1)}
                          >
                            <Icon name="plus" className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="td text-right font-semibold">
                        {rupiah(l.qty * l.unit_price - l.discount_line)}
                      </td>
                      <td className="td text-right">
                        <button
                          className="text-ink-300 hover:text-brand-500"
                          onClick={() => removeItem(l.item_code)}
                          title="Hapus baris"
                        >
                          <Icon name="trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-12 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-canvas text-ink-300">
                  <Icon name="cart" className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm text-ink-400">
                  Keranjang kosong. Pilih layanan di sebelah kiri.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-ink-700">Pembayaran</h2>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-400">Subtotal</span>
              <span className="font-medium">{rp(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-ink-400">Diskon transaksi</span>
              <input
                type="number"
                min="0"
                className="input w-36 py-1.5 text-right"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-400">Pajak (11%)</span>
              <span className="font-medium">{rp(tax)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-ink-300/30 pt-3">
              <span className="text-sm font-semibold text-ink-700">Total</span>
              <span className="text-xl font-bold text-brand-500">{rp(grandTotal)}</span>
            </div>
          </div>

          <div className="mt-5">
            <label className="label-xs">Metode Pembayaran</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PAYMENTS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPayment(p.key)}
                  className={
                    'rounded-lg border px-3 py-2 text-xs font-semibold transition ' +
                    (payment === p.key
                      ? 'border-brand-500 bg-brand-50 text-brand-600'
                      : 'border-ink-300/50 text-ink-500 hover:border-brand-500')
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="label-xs">Jumlah Bayar</label>
            <input
              type="number"
              min="0"
              className="input mt-1 text-right text-lg font-semibold"
              placeholder="0"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {quickCash.map((v) => (
                <button key={v} className="btn-ghost px-3 py-1.5" onClick={() => setPaid(String(v))}>
                  {rupiah(v)}
                </button>
              ))}
              {grandTotal > 0 && (
                <button
                  className="btn-ghost px-3 py-1.5"
                  onClick={() => setPaid(String(grandTotal))}
                >
                  Uang Pas
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-canvas px-4 py-3">
            <span className="text-sm text-ink-500">Kembalian</span>
            <span
              className={
                'text-lg font-bold ' + (change < 0 ? 'text-ink-300' : 'text-emerald-600')
              }
            >
              {change < 0 ? '-' : rp(change)}
            </span>
          </div>

          <button className="btn-primary mt-5 w-full py-3" disabled={!canPay || saving} onClick={handlePay}>
            <Icon name="printer" /> {saving ? 'Menyimpan…' : 'Bayar & Cetak'}
          </button>
          {!canPay && cart.length > 0 && (
            <p className="mt-2 text-center text-[11px] text-ink-400">
              Jumlah bayar harus minimal sebesar total tagihan.
            </p>
          )}
        </div>
      </div>

      {preview && (
        <ReceiptModal
          trx={preview.trx}
          printType={preview.printType}
          copyNumber={preview.copyNumber}
          onClose={() => setPreview(null)}
          onReprint={handleReprint}
        />
      )}
    </div>
  )
}
