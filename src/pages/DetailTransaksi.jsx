import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import Receipt from '../components/Receipt'
import ReceiptModal from '../components/ReceiptModal'
import { useToast } from '../components/Toast'
import { getTransaction, logPrint } from '../mock/api'
import { formatDateTime, formatTime, rp, rupiah } from '../utils/format'

const Info = ({ label, value }) => (
  <div>
    <p className="label-xs">{label}</p>
    <p className="mt-0.5 text-sm font-medium text-ink-700">{value}</p>
  </div>
)

export default function DetailTransaksi() {
  const { id } = useParams()
  const toast = useToast()
  const navigate = useNavigate()
  const [trx, setTrx] = useState(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)

  const load = useCallback(() => {
    getTransaction(id)
      .then(setTrx)
      .catch((e) => setError(e.message))
  }, [id])

  useEffect(load, [load])

  if (error)
    return (
      <div className="card mt-4 p-10 text-center">
        <p className="text-sm text-ink-500">{error}</p>
        <Link to="/riwayat" className="btn-ghost mt-4">
          Kembali ke riwayat
        </Link>
      </div>
    )

  if (!trx) return <div className="card mt-4 p-10 text-center text-sm text-ink-400">Memuat…</div>

  const lastPrint = trx.prints[trx.prints.length - 1]

  const reprint = async () => {
    const { print, transaction } = await logPrint(trx.trx_id, {
      print_type: 'reprint',
      printed_by: 'Supervisor',
    })
    setTrx(transaction)
    setPreview({ trx: transaction, printType: print.print_type, copyNumber: print.copy_number })
    toast(`Cetak ulang tercatat sebagai copy #${print.copy_number}.`)
  }

  const openPreview = () =>
    setPreview({
      trx,
      printType: lastPrint?.print_type || 'original',
      copyNumber: lastPrint?.copy_number || 1,
    })

  return (
    <div className="space-y-6 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button className="btn-ghost" onClick={() => navigate('/riwayat')}>
          <Icon name="back" /> Riwayat
        </button>
        <div className="flex gap-2">
          <button className="btn-dark" onClick={openPreview}>
            <Icon name="printer" /> Preview Struk
          </button>
          <button className="btn-primary" onClick={reprint}>
            <Icon name="copy" /> Cetak Ulang
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-grad px-6 py-5 text-white">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/75">Nomor POS</p>
                <p className="text-xl font-semibold">{trx.pos_number}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider text-white/75">Grand Total</p>
                <p className="text-xl font-semibold">{rp(trx.grand_total)}</p>
              </div>
            </div>

            <div className="grid gap-5 px-6 py-5 sm:grid-cols-3">
              <Info label="Tanggal" value={formatDateTime(trx.trx_date)} />
              <Info label="Outlet" value={`${trx.outlet.outlet_code} | ${trx.outlet.outlet_name}`} />
              <Info label="Kasir" value={trx.cashier.cashier_name} />
              <Info label="Pelanggan" value={trx.customer?.customer_name || 'Umum'} />
              <Info label="No. Antrian" value={trx.queue_number || '|'} />
              <Info label="Metode Bayar" value={trx.payment_method.toUpperCase()} />
              <Info label="Status Sync Odoo" value={trx.odoo_sync_status} />
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-ink-700">Detail Baris</h2>
              <p className="text-xs text-ink-400">
                line_number di-generate otomatis oleh trigger per transaksi
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th w-14">Line</th>
                    <th className="th">Item</th>
                    <th className="th text-center">Qty</th>
                    <th className="th text-right">Harga</th>
                    <th className="th text-right">Diskon</th>
                    <th className="th text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {trx.lines.map((l) => (
                    <tr key={l.line_id}>
                      <td className="td text-center font-semibold text-brand-500">
                        {l.line_number}
                      </td>
                      <td className="td">
                        <p className="font-medium text-ink-700">{l.item_name}</p>
                        <p className="text-[11px] text-ink-400">{l.item_code}</p>
                      </td>
                      <td className="td text-center">
                        {Number(l.qty)} {l.uom}
                      </td>
                      <td className="td text-right">{rupiah(l.unit_price)}</td>
                      <td className="td text-right">{rupiah(l.discount_line)}</td>
                      <td className="td text-right font-semibold">{rupiah(l.subtotal_line)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {[
                    ['Subtotal', trx.subtotal],
                    ['Diskon', trx.discount],
                    ['Pajak (11%)', trx.tax],
                  ].map(([label, val]) => (
                    <tr key={label}>
                      <td className="td text-right text-ink-400" colSpan={5}>
                        {label}
                      </td>
                      <td className="td text-right font-medium">{rupiah(val)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="td text-right text-sm font-bold text-ink-700" colSpan={5}>
                      TOTAL
                    </td>
                    <td className="td text-right text-sm font-bold text-brand-500">
                      {rupiah(trx.grand_total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-ink-700">Histori Cetak</h2>
              <p className="text-xs text-ink-400">Isi tabel print_log untuk transaksi ini</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Copy</th>
                    <th className="th">Tipe</th>
                    <th className="th">Dicetak Oleh</th>
                    <th className="th">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {trx.prints.map((p) => (
                    <tr key={p.print_id}>
                      <td className="td font-semibold">#{p.copy_number}</td>
                      <td className="td">
                        <span
                          className={
                            'rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ' +
                            (p.print_type === 'reprint'
                              ? 'bg-brand-50 text-brand-600'
                              : 'bg-emerald-50 text-emerald-700')
                          }
                        >
                          {p.print_type}
                        </span>
                      </td>
                      <td className="td text-ink-500">{p.printed_by}</td>
                      <td className="td text-ink-500">
                        {formatDateTime(p.printed_at)} &middot; {formatTime(p.printed_at)}
                      </td>
                    </tr>
                  ))}
                  {!trx.prints.length && (
                    <tr>
                      <td className="td text-center text-ink-400" colSpan={4}>
                        Belum pernah dicetak.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-ink-700">Struk Tersimpan</h2>
          <p className="mb-4 text-xs text-ink-400">
            Tampilan sesuai kertas thermal 80mm. Gunakan tombol Preview Struk untuk mencetak.
          </p>
          <div className="overflow-x-auto rounded-xl bg-canvas p-4">
            <Receipt
              trx={trx}
              printType={lastPrint?.print_type || 'original'}
              copyNumber={lastPrint?.copy_number || 1}
              printable={false}
            />
          </div>
        </div>
      </div>

      {preview && (
        <ReceiptModal
          trx={preview.trx}
          printType={preview.printType}
          copyNumber={preview.copyNumber}
          onClose={() => setPreview(null)}
          onReprint={reprint}
        />
      )}
    </div>
  )
}
