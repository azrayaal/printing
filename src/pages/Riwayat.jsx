import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import ReceiptModal from '../components/ReceiptModal'
import { useToast } from '../components/Toast'
import { getTransactions, logPrint, resetDatabase } from '../mock/api'
import { formatDateTime, rp } from '../utils/format'

const methodBadge = {
  cash: 'bg-emerald-50 text-emerald-700',
  qris: 'bg-sky-50 text-sky-700',
  debit: 'bg-amber-50 text-amber-700',
}

export default function Riwayat() {
  const toast = useToast()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(null)

  const load = () => {
    setLoading(true)
    getTransactions().then((r) => {
      setRows(r)
      setLoading(false)
    })
  }

  useEffect(load, [])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter(
      (r) =>
        r.pos_number.toLowerCase().includes(t) ||
        (r.cashier_name || '').toLowerCase().includes(t) ||
        (r.customer_name || '').toLowerCase().includes(t),
    )
  }, [rows, q])

  const reprint = async (trxId) => {
    const { print, transaction } = await logPrint(trxId, {
      print_type: 'reprint',
      printed_by: 'Supervisor',
    })
    setPreview({ trx: transaction, printType: print.print_type, copyNumber: print.copy_number })
    toast(`Cetak ulang ${transaction.pos_number} tercatat sebagai copy #${print.copy_number}.`)
    load()
  }

  const handleReset = () => {
    if (!confirm('Kembalikan data ke kondisi seed awal? Semua transaksi baru akan hilang.')) return
    resetDatabase()
    load()
    toast('Data dikembalikan ke seed awal.', 'info')
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-ink-700">Riwayat Transaksi</h2>
            <p className="text-xs text-ink-400">
              {rows.length} transaksi &middot; klik baris untuk detail line &amp; histori cetak
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300"
              />
              <input
                className="input w-64 pl-9"
                placeholder="Cari No. POS / kasir / pelanggan"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <button className="btn-ghost" onClick={load} title="Muat ulang">
              <Icon name="refresh" />
            </button>
            <button className="btn-ghost" onClick={handleReset}>
              Reset Data
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">No. POS</th>
                <th className="th">Tanggal</th>
                <th className="th">Outlet</th>
                <th className="th">Kasir</th>
                <th className="th">Pelanggan</th>
                <th className="th">Bayar</th>
                <th className="th text-right">Total</th>
                <th className="th text-center">Cetak</th>
                <th className="th text-center">Status</th>
                <th className="th text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="td text-center text-ink-400" colSpan={10}>
                    Memuat data…
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((r) => (
                  <tr
                    key={r.trx_id}
                    className="cursor-pointer hover:bg-canvas/70"
                    onClick={() => navigate(`/transaksi/${r.trx_id}`)}
                  >
                    <td className="td font-semibold text-ink-700">{r.pos_number}</td>
                    <td className="td text-ink-500">{formatDateTime(r.trx_date)}</td>
                    <td className="td text-ink-500">{r.outlet_name}</td>
                    <td className="td text-ink-500">{r.cashier_name}</td>
                    <td className="td text-ink-500">{r.customer_name}</td>
                    <td className="td">
                      <span
                        className={
                          'rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ' +
                          (methodBadge[r.payment_method] || 'bg-canvas text-ink-500')
                        }
                      >
                        {r.payment_method}
                      </span>
                    </td>
                    <td className="td text-right font-semibold">{rp(r.grand_total)}</td>
                    <td className="td text-center text-ink-500">{r.print_count}x</td>
                    <td className="td text-center">
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        {r.status}
                      </span>
                    </td>
                    <td className="td text-right">
                      <button
                        className="btn-ghost px-3 py-1.5"
                        onClick={(e) => {
                          e.stopPropagation()
                          reprint(r.trx_id)
                        }}
                      >
                        <Icon name="printer" /> Reprint
                      </button>
                    </td>
                  </tr>
                ))}

              {!loading && !filtered.length && (
                <tr>
                  <td className="td text-center text-ink-400" colSpan={10}>
                    Tidak ada transaksi yang cocok.{' '}
                    <Link to="/kasir" className="text-brand-500">
                      Buat transaksi baru
                    </Link>
                    .
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {preview && (
        <ReceiptModal
          trx={preview.trx}
          printType={preview.printType}
          copyNumber={preview.copyNumber}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
