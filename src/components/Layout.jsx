import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Icon from './Icon'

const groups = [
  {
    title: 'Menu',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
      { to: '/kasir', label: 'Kasir', icon: 'cart' },
      { to: '/riwayat', label: 'Riwayat Transaksi', icon: 'receipt' },
    ],
  },
  {
    title: 'Antrian',
    items: [
      { to: '/antrian/layar', label: 'Nomor Antrian', icon: 'bell' },
      { to: '/antrian/display', label: 'Papan Layar Tunggu', icon: 'dashboard', external: true },
      { to: '/antrian/ambil', label: 'Kios Ambil Antrian', icon: 'store', external: true },
    ],
  },
]

const crumbs = {
  '/': ['Dashboard'],
  '/kasir': ['Transaksi', 'Kasir'],
  '/riwayat': ['Transaksi', 'Riwayat'],
  '/antrian/layar': ['Antrian', 'Nomor Antrian'],
}

function SidebarLink({ item, onNavigate }) {
  // halaman publik (kios & papan layar) dibuka di tab baru agar sesi kasir tetap terbuka
  if (item.external)
    return (
      <a
        href={item.to}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10">
          <Icon name={item.icon} />
        </span>
        <span className="flex-1">{item.label}</span>
        <Icon name="code" className="h-3.5 w-3.5 opacity-50" />
      </a>
    )

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition',
          isActive
            ? 'bg-brand-grad text-white shadow-raised'
            : 'text-white/70 hover:bg-white/10 hover:text-white',
        ].join(' ')
      }
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10">
        <Icon name={item.icon} />
      </span>
      <span className="flex-1">{item.label}</span>
      {item.external && <Icon name="code" className="h-3.5 w-3.5 opacity-50" />}
    </NavLink>
  )
}

export default function Layout({ children, user, outlet, onLogout }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const trail = crumbs[pathname] || ['Transaksi', 'Detail']

  const initials = (user?.full_name || 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-full">
      {open && (
        <div
          className="no-print fixed inset-0 z-30 bg-ink-900/40 xl:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={[
          'no-print fixed inset-y-0 left-0 z-40 m-4 flex w-64 flex-col overflow-y-auto rounded-2xl bg-ink-900 p-4 shadow-card transition-transform',
          open ? 'translate-x-0' : '-translate-x-[110%]',
          'xl:translate-x-0',
        ].join(' ')}
      >
        <div className="flex items-center gap-3 px-2 pb-4">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-grad text-white">
            <Icon name="printer" className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">POS Printing</p>
            <p className="text-[11px] text-white/50">ERP Invoice Module</p>
          </div>
        </div>
        <div className="mb-4 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        <button
          onClick={() => setMenu((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-left transition hover:bg-white/10"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-grad text-xs font-bold text-white">
            {initials}
          </span>
          <span className="flex-1 leading-tight">
            <span className="block text-xs font-semibold text-white">
              {user?.full_name || 'Pengguna'}
            </span>
            <span className="block text-[11px] text-white/50">{user?.role}</span>
          </span>
          <Icon name="chevron" className={'h-4 w-4 text-white/50 transition ' + (menu ? 'rotate-180' : '')} />
        </button>

        {menu && (
          <div className="mt-2 space-y-1 rounded-xl bg-white/5 p-2">
            <p className="px-2 py-1 text-[11px] text-white/50">
              {outlet ? `${outlet.outlet_code} — ${outlet.outlet_name}` : 'Outlet aktif'}
            </p>
            <button
              onClick={() => {
                onLogout()
                navigate('/login', { replace: true })
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <Icon name="back" className="h-4 w-4" /> Keluar
            </button>
          </div>
        )}

        {groups.map((g) => (
          <div key={g.title}>
            <p className="px-4 pb-2 pt-6 text-[11px] font-bold uppercase tracking-wider text-white/40">
              {g.title}
            </p>
            <nav className="flex flex-col gap-1">
              {g.items.map((n) => (
                <SidebarLink key={n.to} item={n} onNavigate={() => setOpen(false)} />
              ))}
            </nav>
          </div>
        ))}

        <div className="mt-auto rounded-xl bg-white/5 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Mode POC</p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/60">
            Berjalan tanpa backend. Data tersimpan di browser dan mengikuti kontrak REST
            Express + PostgreSQL.
          </p>
        </div>
      </aside>

      <div className="xl:pl-72">
        <header className="no-print sticky top-0 z-20 bg-canvas/85 px-4 pt-4 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <div>
              <p className="text-xs text-ink-400">
                Pages / <span className="text-ink-700">{trail.join(' / ')}</span>
              </p>
              <h1 className="text-sm font-bold text-ink-700">{trail[trail.length - 1]}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300"
                />
                <input className="input py-2 pl-9" placeholder="Cari di sini" />
              </div>
              <span className="hidden items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-ink-500 shadow-soft sm:flex">
                <Icon name="user" className="h-4 w-4" />
                {user?.username}
              </span>
              <button className="text-ink-500 hover:text-brand-500" title="Pengaturan">
                <Icon name="settings" className="h-5 w-5" />
              </button>
              <button
                className="rounded-lg p-2 text-ink-500 hover:bg-white xl:hidden"
                onClick={() => setOpen(true)}
                title="Menu"
              >
                <Icon name="dashboard" className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 pb-10 sm:px-6">{children}</main>

        <footer className="no-print px-6 pb-6 text-xs text-ink-400">
          POC POS Invoice Printing &mdash; modul ERP. Integrasi Odoo &amp; printer thermal fisik
          menyusul.
        </footer>
      </div>
    </div>
  )
}
