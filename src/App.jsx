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
import { currentUser, getOutlets, logout as apiLogout } from './mock/api'

function Protected({ user, children }) {
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
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
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/kasir" element={<Kasir user={user} />} />
                  <Route path="/riwayat" element={<Riwayat />} />
                  <Route path="/transaksi/:id" element={<DetailTransaksi />} />
                  <Route path="/antrian/layar" element={<LayarAntrian />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </Protected>
          }
        />
      </Routes>
    </ToastProvider>
  )
}
