import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { callNextQueue, currentUser, getCashiers, getQueues, updateQueueStatus } from '../mock/api'
import { formatTime } from '../utils/format'
import { panggilAntrian, suaraTersedia } from '../utils/voice'

const SERVICE_TONE = {
  A: 'bg-info-grad',
  B: 'bg-brand-grad',
  C: 'bg-warn-grad',
  D: 'bg-success-grad',
}

/**
 * Layar nomor antrian: papan panggilan untuk pelanggan sekaligus panel
 * kontrol loket untuk kasir yang sedang login.
 */
export default function LayarAntrian() {
  const user = currentUser()
  const outletId = user?.outlet_id || 1

  const [queues, setQueues] = useState([])
  const [cashiers, setCashiers] = useState([])
  const [counter, setCounter] = useState('Loket 1')
  const [filter, setFilter] = useState('')
  const [note, setNote] = useState('')
  const [sound, setSound] = useState(true)
  const [clock, setClock] = useState(new Date())

  const refresh = useCallback(() => getQueues(outletId).then(setQueues), [outletId])

  useEffect(() => {
    getCashiers(outletId).then((c) => {
      setCashiers(c)
      const mine = c.find((x) => x.cashier_id === user?.cashier_id)
      if (mine?.counter) setCounter(mine.counter)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletId])

  useEffect(() => {
    refresh()
    const poll = setInterval(refresh, 5000) // polling ringan; backend nanti bisa pakai SSE/WebSocket
    const tick = setInterval(() => setClock(new Date()), 1000)
    return () => {
      clearInterval(poll)
      clearInterval(tick)
    }
  }, [refresh])

  const waiting = queues.filter((q) => q.status === 'waiting')
  const called = queues.filter((q) => q.status === 'called')
  const served = queues.filter((q) => q.status === 'served')
  const current = called.find((q) => q.counter === counter) || called[called.length - 1] || null
  const cashierId = cashiers.find((c) => c.counter === counter)?.cashier_id

  const call = async () => {
    setNote('')
    try {
      const q = await callNextQueue({
        outlet_id: outletId,
        counter,
        cashier_id: cashierId,
        service_code: filter || null,
      })
      if (sound) panggilAntrian(q.queue_number, q.counter)
      setNote(`Memanggil ${q.queue_number} ke ${counter}.`)
    } catch (e) {
      setNote(e.message)
    }
    refresh()
  }

  const recall = () => {
    if (!current) return
    panggilAntrian(current.queue_number, current.counter)
    setNote(`Memanggil ulang ${current.queue_number}.`)
  }

  const finish = async (status) => {
    if (!current) return
    await updateQueueStatus(current.queue_id, status)
    setNote(
      status === 'served'
        ? `${current.queue_number} ditandai selesai dilayani.`
        : `${current.queue_number} dilewati.`,
    )
    refresh()
  }

  return (
    <div className="space-y-6 pt-2">
      {/* --- papan panggilan --- */}
      <div className="card overflow-hidden">
        <div className="grid gap-6 bg-ink-900 p-8 text-white lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/40">
              Sedang dipanggil
            </p>
            <p className="mt-3 text-[92px] font-bold leading-none tracking-tight">
              {current?.queue_number || '—'}
            </p>
            <p className="mt-2 text-lg text-white/70">
              {current ? `${current.service_name} · ${current.counter}` : 'Belum ada panggilan'}
            </p>
            {current?.customer_name && (
              <p className="text-sm text-white/50">a.n. {current.customer_name}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/40">
                Antrian berikutnya
              </p>
              <p className="font-mono text-sm text-white/60">{formatTime(clock.toISOString())}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {waiting.slice(0, 6).map((q) => (
                <div
                  key={q.queue_id}
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3"
                >
                  <p className="text-2xl font-bold leading-none">{q.queue_number}</p>
                  <p className="mt-1 text-[11px] text-white/50">{q.service_name}</p>
                </div>
              ))}
              {!waiting.length && (
                <p className="col-span-2 py-8 text-center text-sm text-white/40">
                  Tidak ada antrian menunggu.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* --- panel kontrol loket --- */}
        <div className="flex flex-wrap items-end gap-4 px-6 py-5">
          <div>
            <label className="label-xs">Loket</label>
            <select
              className="input mt-1 w-40"
              value={counter}
              onChange={(e) => setCounter(e.target.value)}
            >
              {['Loket 1', 'Loket 2', 'Loket 3'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-xs">Filter Layanan</label>
            <select
              className="input mt-1 w-52"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">Semua layanan</option>
              <option value="A">A — Cetak Dokumen</option>
              <option value="B">B — Cetak Foto</option>
              <option value="C">C — Desain &amp; Custom</option>
              <option value="D">D — Ambil Pesanan</option>
            </select>
          </div>
          <button className="btn-primary" onClick={call}>
            <Icon name="bell" /> Panggil Berikutnya
          </button>
          <button className="btn-ghost" onClick={recall} disabled={!current}>
            <Icon name="refresh" /> Panggil Ulang
          </button>
          <button
            className={
              'btn border ' +
              (sound
                ? 'border-brand-500 bg-brand-50 text-brand-600'
                : 'border-ink-300/60 text-ink-400')
            }
            onClick={() => setSound((v) => !v)}
            disabled={!suaraTersedia()}
            title={suaraTersedia() ? 'Panggilan suara' : 'Browser tidak mendukung suara'}
          >
            Suara {sound ? 'Aktif' : 'Mati'}
          </button>
          <button className="btn-dark" onClick={() => finish('served')} disabled={!current}>
            <Icon name="check" /> Selesai Dilayani
          </button>
          <button className="btn-ghost" onClick={() => finish('skipped')} disabled={!current}>
            Lewati
          </button>
          <Link to="/kasir" className="btn-ghost">
            <Icon name="cart" /> Buka Kasir
          </Link>
          <a href="/antrian/display" target="_blank" rel="noreferrer" className="btn-ghost">
            <Icon name="dashboard" /> Papan Layar Tunggu
          </a>
          {note && <p className="w-full text-xs text-ink-500">{note}</p>}
        </div>
      </div>

      {/* --- ringkasan + daftar --- */}
      <div className="grid gap-6 lg:grid-cols-4">
        {[
          ['Menunggu', waiting.length, 'bg-warn-grad'],
          ['Dipanggil', called.length, 'bg-info-grad'],
          ['Selesai', served.length, 'bg-success-grad'],
          ['Total Hari Ini', queues.length, 'bg-dark-grad'],
        ].map(([label, val, grad]) => (
          <div key={label} className="card flex items-center gap-4 p-5">
            <span className={`grid h-12 w-12 place-items-center rounded-xl text-white ${grad}`}>
              <Icon name="receipt" className="h-5 w-5" />
            </span>
            <div>
              <p className="label-xs">{label}</p>
              <p className="text-2xl font-bold text-ink-700">{val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-ink-700">Daftar Antrian Hari Ini</h2>
            <p className="text-xs text-ink-400">
              Nomor direset harian per outlet per layanan
            </p>
          </div>
          <button className="btn-ghost" onClick={refresh}>
            <Icon name="refresh" /> Muat Ulang
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Nomor</th>
                <th className="th">Layanan</th>
                <th className="th">Nama</th>
                <th className="th">Diambil</th>
                <th className="th">Loket</th>
                <th className="th">Petugas</th>
                <th className="th text-center">Status</th>
                <th className="th">No. POS</th>
              </tr>
            </thead>
            <tbody>
              {queues.map((q) => (
                <tr key={q.queue_id} className="hover:bg-canvas/60">
                  <td className="td">
                    <span
                      className={`inline-block rounded-md px-2.5 py-1 text-xs font-bold text-white ${SERVICE_TONE[q.service_code]}`}
                    >
                      {q.queue_number}
                    </span>
                  </td>
                  <td className="td text-ink-500">{q.service_name}</td>
                  <td className="td text-ink-500">{q.customer_name || '—'}</td>
                  <td className="td text-ink-500">{formatTime(q.created_at)}</td>
                  <td className="td text-ink-500">{q.counter || '—'}</td>
                  <td className="td text-ink-500">{q.cashier_name || '—'}</td>
                  <td className="td text-center">
                    <span
                      className={
                        'rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ' +
                        {
                          waiting: 'bg-amber-50 text-amber-700',
                          called: 'bg-sky-50 text-sky-700',
                          served: 'bg-emerald-50 text-emerald-700',
                          skipped: 'bg-canvas text-ink-400',
                        }[q.status]
                      }
                    >
                      {q.status}
                    </span>
                  </td>
                  <td className="td">
                    {q.trx_id ? (
                      <Link to={`/transaksi/${q.trx_id}`} className="text-brand-500 hover:underline">
                        Lihat transaksi
                      </Link>
                    ) : (
                      <span className="text-ink-300">belum ada</span>
                    )}
                  </td>
                </tr>
              ))}
              {!queues.length && (
                <tr>
                  <td className="td text-center text-ink-400" colSpan={8}>
                    Belum ada antrian hari ini.{' '}
                    <Link to="/antrian/ambil" className="text-brand-500">
                      Buka kios pengambilan
                    </Link>
                    .
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
