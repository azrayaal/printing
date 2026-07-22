import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { getOutlets, getQueues } from '../mock/api'
import { formatTime } from '../utils/format'
import { hentikanSuara, panggilAntrian } from '../utils/voice'

const SERVICE_TONE = {
  A: 'from-sky-500 to-blue-600',
  B: 'from-brand-400 to-brand-600',
  C: 'from-amber-400 to-orange-600',
  D: 'from-emerald-400 to-emerald-600',
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const tanggalPanjang = (d) =>
  `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`

/**
 * Papan antrian untuk layar/TV di ruang tunggu.
 *
 * Halaman ini murni tampilan: tidak ada pengambilan nomor dan tidak ada
 * tombol panggil. Datanya di-poll tiap 3 detik dari sumber yang sama
 * dengan panel kasir. Pilih outlet lewat query string, mis. ?outlet=2
 */
export default function DisplayAntrian() {
  const [params] = useSearchParams()
  const outletId = Number(params.get('outlet')) || 1

  const [outlet, setOutlet] = useState(null)
  const [queues, setQueues] = useState([])
  const [clock, setClock] = useState(new Date())
  const [flash, setFlash] = useState(null) // queue_number yang baru dipanggil
  const [sound, setSound] = useState(true)
  const lastCalled = useRef(null)

  const refresh = useCallback(() => getQueues(outletId).then(setQueues), [outletId])

  useEffect(() => {
    getOutlets().then((o) => setOutlet(o.find((x) => x.outlet_id === outletId) || o[0]))
  }, [outletId])

  useEffect(() => {
    refresh()
    const poll = setInterval(refresh, 3000)
    const tick = setInterval(() => setClock(new Date()), 1000)
    return () => {
      clearInterval(poll)
      clearInterval(tick)
    }
  }, [refresh])

  const called = queues.filter((q) => q.status === 'called')
  const waiting = queues.filter((q) => q.status === 'waiting')
  const served = queues.filter((q) => q.status === 'served')
  const current = called[called.length - 1] || null

  // sorot + umumkan saat ada nomor baru dipanggil
  useEffect(() => {
    if (!current) return
    const key = `${current.queue_number}@${current.counter}`
    if (lastCalled.current === key) return
    const first = lastCalled.current === null
    lastCalled.current = key
    if (first) return

    setFlash(current.queue_number)
    const t = setTimeout(() => setFlash(null), 6000)

    if (sound) panggilAntrian(current.queue_number, current.counter)

    return () => clearTimeout(t)
  }, [current, sound])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.()
  }

  const perCounter = ['Loket 1', 'Loket 2', 'Loket 3'].map((c) => ({
    counter: c,
    ticket: called.find((q) => q.counter === c) || null,
  }))

  return (
    <div className="min-h-screen bg-ink-900 text-white">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-8 py-6">
        {/* ---------- kepala ---------- */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-grad">
              <Icon name="printer" className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xl font-semibold leading-tight">
                {outlet?.outlet_name || 'Memuat…'}
              </p>
              <p className="text-sm text-white/45">{outlet?.address}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="font-mono text-4xl font-bold leading-none tracking-tight">
                {formatTime(clock.toISOString())}
              </p>
              <p className="mt-1 text-sm text-white/45">{tanggalPanjang(clock)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  const next = !sound
                  setSound(next)
                  if (!next) hentikanSuara()
                  // klik ini sekaligus membuka izin audio browser, lalu uji suara
                  else if (current) panggilAntrian(current.queue_number, current.counter, { repeat: 1 })
                }}
                className={
                  'rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ' +
                  (sound
                    ? 'border-brand-400/60 bg-brand-500/20 text-white'
                    : 'border-white/15 text-white/50 hover:border-white/40 hover:text-white')
                }
                title="Panggilan suara"
              >
                Suara {sound ? 'Aktif' : 'Nonaktif'}
              </button>
              <button
                onClick={toggleFullscreen}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/60 transition hover:border-white/40 hover:text-white"
              >
                Layar Penuh
              </button>
            </div>
          </div>
        </header>

        {/* ---------- panggilan utama ---------- */}
        <section className="grid flex-1 gap-8 py-8 lg:grid-cols-[1.35fr_1fr]">
          <div
            className={
              'relative overflow-hidden rounded-3xl border p-10 transition-all duration-500 ' +
              (flash
                ? 'border-brand-400 bg-brand-500/15 shadow-[0_0_80px_-20px_rgba(233,30,99,0.8)]'
                : 'border-white/10 bg-white/[0.04]')
            }
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-brand-grad" />
            <p className="text-sm font-bold uppercase tracking-[0.4em] text-white/40">
              Nomor dipanggil
            </p>

            <p
              className={
                'mt-6 text-[180px] font-bold leading-[0.85] tracking-tighter transition-opacity duration-300 ' +
                (flash ? 'animate-pulse' : '')
              }
            >
              {current?.queue_number || '|'}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              {current ? (
                <>
                  <span className="rounded-xl bg-white/10 px-6 py-3 text-2xl font-semibold">
                    {current.counter}
                  </span>
                  <span className="text-xl text-white/60">{current.service_name}</span>
                  {current.customer_name && (
                    <span className="text-xl text-white/40">a.n. {current.customer_name}</span>
                  )}
                </>
              ) : (
                <span className="text-xl text-white/40">Belum ada nomor yang dipanggil</span>
              )}
            </div>
          </div>

          {/* ---------- daftar tunggu ---------- */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/40">
                Antrian berikutnya
              </p>
              <p className="text-sm text-white/40">{waiting.length} menunggu</p>
            </div>

            <div className="mt-6 space-y-3">
              {waiting.slice(0, 6).map((q, i) => (
                <div
                  key={q.queue_id}
                  className={
                    'flex items-center gap-4 rounded-2xl px-5 py-4 ' +
                    (i === 0 ? 'bg-white/10' : 'bg-white/[0.04]')
                  }
                >
                  <span
                    className={`grid h-14 w-24 place-items-center rounded-xl bg-gradient-to-br text-2xl font-bold ${SERVICE_TONE[q.service_code]}`}
                  >
                    {q.queue_number}
                  </span>
                  <span className="flex-1">
                    <span className="block text-lg font-medium">{q.service_name}</span>
                    <span className="block text-sm text-white/40">
                      diambil {formatTime(q.created_at)}
                    </span>
                  </span>
                  {i === 0 && (
                    <span className="rounded-lg bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/70">
                      Berikutnya
                    </span>
                  )}
                </div>
              ))}
              {!waiting.length && (
                <p className="py-16 text-center text-lg text-white/30">
                  Tidak ada antrian menunggu
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ---------- status loket ---------- */}
        <section className="grid gap-5 border-t border-white/10 pt-6 lg:grid-cols-3">
          {perCounter.map((c) => (
            <div
              key={c.counter}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5"
            >
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-white/40">
                  {c.counter}
                </p>
                <p className="mt-1 text-sm text-white/50">
                  {c.ticket ? c.ticket.service_name : 'Menunggu panggilan'}
                </p>
              </div>
              <p className={'text-5xl font-bold ' + (c.ticket ? 'text-white' : 'text-white/15')}>
                {c.ticket?.queue_number || '|'}
              </p>
            </div>
          ))}
        </section>

        {/* ---------- kaki: layanan & ringkasan ---------- */}
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-6 border-t border-white/10 pt-5 text-sm">
          <div className="flex flex-wrap items-center gap-5">
            {[
              ['A', 'Cetak Dokumen'],
              ['B', 'Cetak Foto'],
              ['C', 'Desain & Custom'],
              ['D', 'Ambil Pesanan'],
            ].map(([code, name]) => (
              <span key={code} className="flex items-center gap-2 text-white/50">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br text-xs font-bold text-white ${SERVICE_TONE[code]}`}
                >
                  {code}
                </span>
                {name}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-6 text-white/40">
            <span>Selesai dilayani hari ini: {served.length}</span>
            <span>Total tiket: {queues.length}</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
