import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { getQueues, getTransactions } from '../mock/api'
import { formatDateTime, formatTime, isToday, rp } from '../utils/format'

function StatCard({ icon, grad, label, value, foot }) {
  return (
    <div className="card relative px-4 pb-4 pt-4">
      <div className="flex items-start justify-between">
        <span
          className={`-mt-8 grid h-14 w-14 place-items-center rounded-xl text-white shadow-soft ${grad}`}
        >
          <Icon name={icon} className="h-6 w-6" />
        </span>
        <div className="text-right">
          <p className="label-xs">{label}</p>
          <p className="text-2xl font-bold text-ink-700">{value}</p>
        </div>
      </div>
      <div className="mt-4 border-t border-ink-300/30 pt-3 text-xs text-ink-400">{foot}</div>
    </div>
  )
}

export default function Dashboard() {
  const [rows, setRows] = useState([])
  const [queues, setQueues] = useState([])

  useEffect(() => {
    getTransactions().then(setRows)
    getQueues().then(setQueues)
  }, [])

  const today = rows.filter((r) => isToday(r.trx_date))
  const omzetToday = today.reduce((s, r) => s + Number(r.grand_total), 0)
  const printsToday = today.reduce((s, r) => s + r.print_count, 0)
  const waiting = queues.filter((q) => q.status === 'waiting')
  const called = queues.filter((q) => q.status === 'called')

  return (
    <div className="space-y-6 pt-4">
      <div className="grid gap-6 pt-8 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon="receipt"
          grad="bg-dark-grad"
          label="Transaksi Hari Ini"
          value={today.length}
          foot={`${rows.length} transaksi total tercatat`}
        />
        <StatCard
          icon="money"
          grad="bg-brand-grad"
          label="Omzet Hari Ini"
          value={rp(omzetToday)}
          foot="Termasuk pajak 11%"
        />
        <StatCard
          icon="printer"
          grad="bg-success-grad"
          label="Struk Dicetak"
          value={printsToday}
          foot="Tercatat di tabel print_log"
        />
        <StatCard
          icon="bell"
          grad="bg-info-grad"
          label="Antrian Menunggu"
          value={waiting.length}
          foot={`${called.length} sedang dipanggil · ${queues.length} tiket hari ini`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <h2 className="text-base font-semibold text-ink-700">Transaksi Terakhir</h2>
              <p className="text-xs text-ink-400">5 transaksi terbaru dari seluruh outlet</p>
            </div>
            <Link to="/riwayat" className="btn-ghost">
              Lihat Semua
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">No. POS</th>
                  <th className="th">Waktu</th>
                  <th className="th">Kasir</th>
                  <th className="th text-right">Total</th>
                  <th className="th text-center">Cetak</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r) => (
                  <tr key={r.trx_id} className="hover:bg-canvas/60">
                    <td className="td font-medium">
                      <Link to={`/transaksi/${r.trx_id}`} className="hover:text-brand-500">
                        {r.pos_number}
                      </Link>
                    </td>
                    <td className="td text-ink-500">{formatDateTime(r.trx_date)}</td>
                    <td className="td text-ink-500">{r.cashier_name}</td>
                    <td className="td text-right font-semibold">{rp(r.grand_total)}</td>
                    <td className="td text-center text-ink-500">{r.print_count}x</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td className="td text-center text-ink-400" colSpan={5}>
                      Belum ada transaksi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between bg-ink-900 px-6 py-5 text-white">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/50">Sedang dipanggil</p>
              <p className="text-3xl font-bold leading-tight">
                {called[called.length - 1]?.queue_number || '—'}
              </p>
            </div>
            <Link to="/antrian/layar" className="btn bg-white/10 text-white hover:bg-white/20">
              Layar Antrian
            </Link>
          </div>
          <div className="divide-y divide-ink-300/25">
            {waiting.slice(0, 4).map((q) => (
              <div key={q.queue_id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink-700">{q.queue_number}</p>
                  <p className="text-[11px] text-ink-400">{q.service_name}</p>
                </div>
                <span className="text-xs text-ink-400">{formatTime(q.created_at)}</span>
              </div>
            ))}
            {!waiting.length && (
              <p className="px-6 py-5 text-sm text-ink-400">Tidak ada antrian menunggu.</p>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-ink-700">Alur yang Dibuktikan POC</h2>
          <ol className="mt-4 space-y-4">
            {[
              ['Ambil antrian', 'Pelanggan memilih layanan di kios, tiket A-001 tercetak otomatis.'],
              ['Transaksi kasir', 'Kasir memanggil nomor, memilih layanan cetak, diskon, dan metode bayar.'],
              ['Penomoran otomatis', 'pos_number POS-{outlet}-{YYYYMMDD}-{0001} reset harian per outlet; line_number urut per transaksi.'],
              ['Cetak struk & log', 'Struk thermal 80mm plus raw ESC/POS; tiap cetak menambah baris print_log.'],
            ].map(([title, desc], i) => (
              <li key={title} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-bold text-brand-500">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-700">{title}</p>
                  <p className="text-xs leading-relaxed text-ink-400">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link to="/kasir" className="btn-primary mt-6 w-full">
            <Icon name="cart" /> Mulai Transaksi
          </Link>
        </div>
        </div>
      </div>
    </div>
  )
}
