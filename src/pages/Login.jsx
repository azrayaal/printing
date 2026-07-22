import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { login, resetDatabase } from '../mock/api'

const DEMO = [
  { username: 'owner', password: 'owner123', role: 'Owner | super admin' },
  { username: 'kepala', password: 'toko123', role: 'Kepala Toko' },
  { username: 'rina', password: 'kasir123', role: 'Admin/Kasir | Loket 1' },
  // { username: 'cs', password: 'cs123', role: 'CS/Desainer' },
  { username: 'operator', password: 'operator123', role: 'Operator produksi' },
]

export default function Login({ onLogin }) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const session = await login(username, password)
      onLogin(session)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const fill = (acc) => {
    setUsername(acc.username)
    setPassword(acc.password)
    setError('')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-900">
      {/* latar dekoratif | gradient murni, tanpa aset eksternal */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,#3b3f6b_0%,transparent_55%),radial-gradient(circle_at_85%_80%,#d81b60_0%,transparent_50%),linear-gradient(160deg,#101322,#1a2035_60%,#241a2d)]" />
      <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-6 sm:px-12">
          <div className="flex items-center gap-3 text-white">
            {/* <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-grad">
              <Icon name="printer" className="h-5 w-5" />
            </span> */}
            <div className="leading-tight">
              <p className="text-sm font-semibold">Sumber Jaya Digital Printing</p>
              <p className="text-[11px] text-white/50">POS Invoice &amp; Antrian</p>
            </div>
          </div>
          <Link to="/antrian/ambil" className="btn bg-white/10 text-white hover:bg-white/20">
            Kios Ambil Antrian
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="w-full max-w-sm">
            <form onSubmit={submit} className="card overflow-visible p-0">
              <div className="-mt-6 mx-4 rounded-xl bg-brand-grad px-6 py-6 text-center text-white shadow-raised">
                <p className="text-lg font-semibold">Masuk</p>
                <p className="mt-1 text-[11px] text-white/80">
                  Gunakan akun kasir atau supervisor
                </p>
              </div>

              <div className="p-6 pt-7">
                {error && (
                  <div className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-600">
                    {error}
                  </div>
                )}

                <label className="label-xs">Username</label>
                <input
                  className="input mb-4 mt-1"
                  value={username}
                  autoFocus
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="rina"
                />

                <label className="label-xs">Password</label>
                <input
                  type="password"
                  className="input mt-1"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />

                <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-ink-500">
                  <button
                    type="button"
                    onClick={() => setRemember((v) => !v)}
                    className={
                      'relative h-5 w-9 rounded-full transition ' +
                      (remember ? 'bg-brand-500' : 'bg-ink-300/60')
                    }
                    aria-pressed={remember}
                  >
                    <span
                      className={
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ' +
                        (remember ? 'left-[18px]' : 'left-0.5')
                      }
                    />
                  </button>
                  Ingat saya di perangkat ini
                </label>

                <button className="btn-primary mt-6 w-full py-3" disabled={busy}>
                  {busy ? 'Memverifikasi…' : 'Masuk'}
                </button>
              </div>
            </form>

            <div className="mt-6 rounded-2xl bg-white/5 p-4 backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                Akun demo | klik untuk mengisi
              </p>
              <div className="mt-3 space-y-2">
                {DEMO.map((a) => (
                  <button
                    key={a.username}
                    type="button"
                    onClick={() => fill(a)}
                    className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left transition hover:bg-white/15"
                  >
                    <span>
                      <span className="block text-xs font-semibold text-white">{a.username}</span>
                      <span className="block text-[11px] text-white/50">{a.role}</span>
                    </span>
                    <span className="font-mono text-[11px] text-white/60">{a.password}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>

        <div className="relative mx-auto -mt-2 max-w-sm px-4 pb-2 text-center">
          <button
            type="button"
            onClick={() => {
              resetDatabase()
              setError('')
              setUsername('')
              setPassword('')
              alert('Data demo dimuat ulang. Silakan masuk kembali.')
            }}
            className="text-[11px] text-white/40 underline decoration-dotted hover:text-white/70"
          >
            Muat ulang data demo bila akun tidak dikenali
          </button>
        </div>

        <footer className="relative px-6 pb-6 text-center text-[11px] text-white/40">
          POC POS Invoice Printing | modul ERP. Data demo tersimpan lokal di browser.
        </footer>
      </div>
    </div>
  )
}
