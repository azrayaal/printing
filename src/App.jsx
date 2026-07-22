import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { ToastProvider } from './components/Toast'
import Dashboard from './pages/Dashboard'
import Kasir from './pages/Kasir'
import Riwayat from './pages/Riwayat'
import DetailTransaksi from './pages/DetailTransaksi'
import Login from './pages/Login'
import AmbilAntrian from './pages/AmbilAntrian'
import LayarAntrian from './pages/LayarAntrian'
import DisplayAntrian from './pages/DisplayAntrian'
import MasterMesin from './pages/MasterMesin'
import MasterProduk from './pages/MasterProduk'
import MasterCustomer from './pages/MasterCustomer'
import ManajemenUser from './pages/ManajemenUser'
import Pengaturan from './pages/Pengaturan'
import AuditLog from './pages/AuditLog'
import { currentUser, getOutlets, logout as apiLogout } from './mock/api'
import { can } from './mock/roles'

function Protected({ user, children }) {
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

/** Rute yang tidak boleh diakses peran tertentu (BRD 1). */
function Guard({ user, cap, children }) {
  if (!can(user, cap))
    return (
      <div className="card mt-4 p-10 text-center">
        <p className="text-sm font-semibold text-ink-700">Akses ditolak</p>
        <p className="mt-1 text-xs text-ink-400">
          Peran {user?.role} tidak memiliki kemampuan <span className="font-mono">{cap}</span>.
          Hubungi Owner bila akses ini dibutuhkan.
        </p>
      </div>
    )
  return children
}

export default function App() {
  const [user, setUser] = useState(() => currentUser())
  const [outlet, setOutlet] = useState(null)

  useEffect(() => {
    if (!user) return setOutlet(null)
    getOutlets().then((o) => setOutlet(o.find((x) => x.outlet_id === user.outlet_id) || o[0]))
  }, [user])

  const handleLogout = () => {
    apiLogout()
    setUser(null)
  }

  const g = (cap, el) => (
    <Guard user={user} cap={cap}>
      {el}
    </Guard>
  )

  return (
    <ToastProvider>
      <Routes>
        {/* halaman publik — tanpa sidebar */}
        <Route path="/login" element={<Login onLogin={setUser} />} />
        <Route path="/antrian/ambil" element={<AmbilAntrian />} />
        <Route path="/antrian/display" element={<DisplayAntrian />} />

        {/* halaman internal — perlu login */}
        <Route
          path="*"
          element={
            <Protected user={user}>
              <Layout user={user} outlet={outlet} onLogout={handleLogout}>
                <Routes>
                  <Route path="/" element={g('dashboard', <Dashboard />)} />
                  <Route path="/kasir" element={g('kasir', <Kasir user={user} />)} />
                  <Route path="/riwayat" element={g('riwayat', <Riwayat />)} />
                  <Route path="/transaksi/:id" element={g('riwayat', <DetailTransaksi />)} />
                  <Route path="/antrian/layar" element={g('antrian', <LayarAntrian />)} />
                  <Route path="/master/mesin" element={g('master.machine', <MasterMesin />)} />
                  <Route path="/master/produk" element={g('master.product', <MasterProduk />)} />
                  <Route path="/master/customer" element={g('master.customer', <MasterCustomer />)} />
                  <Route path="/master/user" element={g('master.user', <ManajemenUser />)} />
                  <Route path="/master/pengaturan" element={g('master.setting', <Pengaturan />)} />
                  <Route path="/audit" element={g('audit.read', <AuditLog />)} />
                  <Route
                    path="*"
                    element={<Navigate to={can(user, 'dashboard') ? '/' : '/antrian/layar'} replace />}
                  />
                </Routes>
              </Layout>
            </Protected>
          }
        />
      </Routes>
    </ToastProvider>
  )
}
