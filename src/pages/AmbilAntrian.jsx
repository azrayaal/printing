import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import QueueTicket from '../components/QueueTicket'
import { findCustomerByPhone, getOutlets, getQueues, takeQueue } from '../mock/api'
import { formatTime } from '../utils/format'

const SERVICES = [
  {
    code: 'A',
    name: 'Cetak Dokumen',
    desc: 'A4, F4, A5, A3 | hitam putih maupun full color, scan dokumen',
    tone: 'bg-info-grad',
    icon: 'receipt',
  },
  {
    code: 'B',
    name: 'Cetak Foto',
    desc: 'Pas foto 2x3 / 3x4 / 4x6, cetak foto 4x4, 4R, 10R, edit foto',
    tone: 'bg-brand-grad',
    icon: 'copy',
  },
  {
    code: 'C',
    name: 'Desain & Custom',
    desc: 'Desain custom, undangan, banner, stiker, kartu nama, mug, kaos',
    tone: 'bg-warn-grad',
    icon: 'code',
  },
  {
    code: 'D',
    name: 'Ambil Pesanan',
    desc: 'Pengambilan hasil cetak, jilid, dan laminating yang sudah selesai',
    tone: 'bg-success-grad',
    icon: 'store',
  },
]

/**
 * Layar kios untuk pelanggan | dipakai tanpa login, biasanya dipasang
 * pada tablet di pintu masuk toko.
 */
export default function AmbilAntrian() {
  const [outlets, setOutlets] = useState([])
  const [outletId, setOutletId] = useState(1)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [known, setKnown] = useState(null) // hasil auto-pull data pelanggan
  const [queues, setQueues] = useState([])
  const [ticket, setTicket] = useState(null)
  const [busy, setBusy] = useState('')
  const [clock, setClock] = useState(new Date())

  const refresh = () => getQueues(outletId).then(setQueues)

  useEffect(() => {
    getOutlets().then(setOutlets)
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletId])

  // Input antrian via nomor HP (BRD 2): tarik data pelanggan + warning blacklist
  useEffect(() => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 8) return setKnown(null)
    const t = setTimeout(() => {
      findCustomerByPhone(digits).then((c) => {
        setKnown(c)
        if (c) setName(c.customer_name)
      })
    }, 350)
    return () => clearTimeout(t)
  }, [phone])

  // tutup tiket otomatis setelah 25 detik agar kios siap untuk pelanggan berikutnya
  useEffect(() => {
    if (!ticket) return
    const t = setTimeout(() => setTicket(null), 25000)
    return () => clearTimeout(t)
  }, [ticket])

  const take = async (code) => {
    setBusy(code)
    try {
      const t = await takeQueue({
        outlet_id: outletId,
        service_code: code,
        customer_name: name,
        phone,
      })
      setTicket(t)
      setName('')
      setPhone('')
      setKnown(null)
      refresh()
      setTimeout(() => window.print(), 400)
    } finally {
      setBusy('')
    }
  }

  const waiting = queues.filter((q) => q.status === 'waiting')
  const nowServing = queues.filter((q) => q.status === 'called')
  const outlet = outlets.find((o) => o.outlet_id === outletId)

  return (
    <div className="min-h-screen bg-ink-900 text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="no-print flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-grad">
              <Icon name="printer" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-semibold">{outlet?.outlet_name || 'Memuat…'}</p>
              <p className="text-xs text-white/50">{outlet?.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={outletId}
              onChange={(e) => setOutletId(Number(e.target.value))}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              {outlets.map((o) => (
                <option key={o.outlet_id} value={o.outlet_id} className="text-ink-700">
                  {o.outlet_name}
                </option>
              ))}
            </select>
            <div className="rounded-lg bg-white/5 px-4 py-2 text-right">
              <p className="font-mono text-xl font-semibold leading-none">
                {formatTime(clock.toISOString())}
              </p>
              <p className="text-[11px] text-white/50">Waktu setempat</p>
            </div>
            <Link
              to={`/antrian/display?outlet=${outletId}`}
              className="btn bg-white/10 text-white hover:bg-white/20"
            >
              Papan Layar Tunggu
            </Link>
          </div>
        </header>

        <div className="no-print mt-10 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/40">
            Selamat datang
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Pilih layanan untuk mengambil nomor antrian</h1>
          <p className="mt-2 text-sm text-white/50">
            Nomor tiket tercetak otomatis dan dipanggil sesuai urutan di setiap loket.
          </p>
        </div>

        <div className="no-print mx-auto mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-white/40">
              Nomor HP
            </label>
            <input
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-400"
              placeholder="08xxxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-white/40">
              Nama (terisi otomatis bila terdaftar)
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-400"
              placeholder="Tulis nama Anda"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {known && (
            <div
              className={
                'sm:col-span-2 rounded-2xl border p-4 ' +
                (known.risk_level === 'blocked'
                  ? 'border-brand-400 bg-brand-500/20'
                  : known.risk_level === 'warning'
                    ? 'border-amber-400 bg-amber-500/20'
                    : 'border-white/15 bg-white/5')
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {known.customer_name}
                    <span className="ml-2 rounded bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase">
                      {known.customer_type}
                    </span>
                  </p>
                  <p className="text-xs text-white/60">
                    Total belanja {known.total_spent.toLocaleString('id-ID')}
                    {known.credit_limit
                      ? ` · piutang ${known.outstanding.toLocaleString('id-ID')} dari limit ${known.credit_limit.toLocaleString('id-ID')}`
                      : ''}
                  </p>
                </div>
                {known.risk_level && (
                  <span className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide">
                    {known.risk_level === 'blocked' ? 'Tolak Otomatis' : 'Perhatian'}
                  </span>
                )}
              </div>
              {known.risk_level && (
                <p className="mt-2 text-sm font-semibold">
                  {known.risk_reason} — arahkan pelanggan ke kepala toko sebelum order diterima.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="no-print mt-8 grid gap-5 sm:grid-cols-2">
          {SERVICES.map((s) => {
            const antre = waiting.filter((q) => q.service_code === s.code).length
            return (
              <button
                key={s.code}
                onClick={() => take(s.code)}
                disabled={!!busy}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-left transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.08] disabled:opacity-60"
              >
                <div className="flex items-start justify-between">
                  <span className={`grid h-14 w-14 place-items-center rounded-xl ${s.tone}`}>
                    <Icon name={s.icon} className="h-6 w-6" />
                  </span>
                  <span className="text-4xl font-bold tracking-tight text-white/25 group-hover:text-white/40">
                    {s.code}
                  </span>
                </div>
                <p className="mt-4 text-lg font-semibold">{s.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/50">{s.desc}</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                  <span className="text-white/50">{antre} orang menunggu</span>
                  <span className="font-semibold text-white">
                    {busy === s.code ? 'Memproses…' : 'Ambil Nomor'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="no-print mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">
            Sedang dipanggil
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {nowServing.length ? (
              nowServing.map((q) => (
                <div key={q.queue_id} className="rounded-xl bg-brand-grad px-5 py-3">
                  <p className="text-2xl font-bold leading-none">{q.queue_number}</p>
                  <p className="mt-1 text-[11px] text-white/80">{q.counter}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/40">Belum ada nomor yang dipanggil.</p>
            )}
          </div>
        </div>
      </div>

      {ticket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-4 backdrop-blur">
          <div className="w-full max-w-sm">
            <QueueTicket ticket={ticket} />
            <div className="no-print mt-4 flex gap-2">
              <button className="btn-ghost flex-1 bg-white" onClick={() => setTicket(null)}>
                Tutup
              </button>
              <button className="btn-primary flex-1" onClick={() => window.print()}>
                <Icon name="printer" /> Cetak Ulang Tiket
              </button>
            </div>
            <p className="no-print mt-3 text-center text-[11px] text-white/40">
              Layar akan kembali otomatis dalam beberapa detik.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
