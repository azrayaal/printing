import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon'
import Modal, { Field, PageHeader } from '../components/Modal'
import { useToast } from '../components/Toast'
import { deleteUser, getCashiers, getOutlets, getUsers, saveUser } from '../mock/api'
import { CAPS, ROLE_DESC, ROLES } from '../mock/roles'

const kosong = {
  username: '',
  full_name: '',
  role: 'Admin/Kasir',
  outlet_id: 1,
  cashier_id: '',
  password: '',
  is_active: true,
}

const ROLE_BADGE = {
  Owner: 'bg-brand-50 text-brand-600',
  'Kepala Toko': 'bg-amber-50 text-amber-700',
  'Admin/Kasir': 'bg-sky-50 text-sky-700',
  'CS/Desainer': 'bg-emerald-50 text-emerald-700',
  Operator: 'bg-canvas text-ink-500',
}

/** BRD 1 — Manajemen User & Role (khusus Owner / super admin). */
export default function ManajemenUser() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [outlets, setOutlets] = useState([])
  const [cashiers, setCashiers] = useState([])
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    getUsers()
      .then(setRows)
      .catch((e) => toast(e.message, 'error'))
  }, [toast])

  useEffect(() => {
    load()
    getOutlets().then(setOutlets)
    getCashiers().then(setCashiers)
  }, [load])

  const submit = async (e) => {
    e?.preventDefault()
    setBusy(true)
    try {
      await saveUser(form)
      toast(form.user_id ? 'Data user diperbarui.' : 'User baru dibuat.')
      setForm(null)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const hapus = async (u) => {
    if (!confirm(`Hapus user ${u.username}?`)) return
    try {
      await deleteUser(u.user_id)
      toast('User dihapus.')
      load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="card overflow-hidden">
        <PageHeader
          title="Manajemen User & Role"
          desc="Owner adalah super admin: akses penuh ke master data, user, parameter sistem, dan audit log"
        >
          <button className="btn-primary" onClick={() => setForm({ ...kosong })}>
            <Icon name="plus" /> User Baru
          </button>
        </PageHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Username</th>
                <th className="th">Nama Lengkap</th>
                <th className="th">Peran</th>
                <th className="th">Outlet</th>
                <th className="th">Loket</th>
                <th className="th text-center">Status</th>
                <th className="th text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.user_id} className="hover:bg-canvas/60">
                  <td className="td font-mono text-xs text-ink-500">{u.username}</td>
                  <td className="td font-medium text-ink-700">{u.full_name}</td>
                  <td className="td">
                    <span
                      className={
                        'rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ' +
                        ROLE_BADGE[u.role]
                      }
                    >
                      {u.role}
                    </span>
                    <span className="ml-2 text-[11px] text-ink-400">
                      {CAPS[u.role]?.length} kemampuan
                    </span>
                  </td>
                  <td className="td text-ink-500">
                    {outlets.find((o) => o.outlet_id === u.outlet_id)?.outlet_name || '-'}
                  </td>
                  <td className="td text-ink-500">
                    {cashiers.find((c) => c.cashier_id === u.cashier_id)?.counter || '—'}
                  </td>
                  <td className="td text-center">
                    <span
                      className={
                        'rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ' +
                        (u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-canvas text-ink-400')
                      }
                    >
                      {u.is_active ? 'aktif' : 'nonaktif'}
                    </span>
                  </td>
                  <td className="td text-right">
                    <button
                      className="btn-ghost px-3 py-1.5"
                      onClick={() => setForm({ ...u, password: '', cashier_id: u.cashier_id || '' })}
                    >
                      Ubah
                    </button>
                    <button
                      className="ml-1 px-2 py-1.5 text-ink-300 hover:text-brand-500"
                      onClick={() => hapus(u)}
                      title="Hapus"
                    >
                      <Icon name="trash" />
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="td text-center text-ink-400" colSpan={7}>
                    Tidak ada data atau Anda tidak berwenang melihat daftar user.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-base font-semibold text-ink-700">Matriks Peran</h2>
        <p className="text-xs text-ink-400">Kemampuan yang melekat pada setiap peran</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {ROLES.map((r) => (
            <div key={r} className="rounded-xl border border-ink-300/40 p-4">
              <div className="flex items-center gap-2">
                <span
                  className={
                    'rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ' +
                    ROLE_BADGE[r]
                  }
                >
                  {r}
                </span>
                {r === 'Owner' && (
                  <span className="text-[10px] font-bold uppercase text-brand-500">super admin</span>
                )}
              </div>
              <p className="mt-2 text-xs text-ink-500">{ROLE_DESC[r]}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {CAPS[r].map((c) => (
                  <span key={c} className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-ink-500">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {form && (
        <Modal
          title={form.user_id ? 'Ubah User' : 'User Baru'}
          subtitle="Setiap perubahan peran tercatat di audit log"
          onClose={() => setForm(null)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setForm(null)}>
                Batal
              </button>
              <button className="btn-primary" onClick={submit} disabled={busy}>
                {busy ? 'Menyimpan…' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Username">
              <input
                className="input"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </Field>
            <Field label="Nama Lengkap">
              <input
                className="input"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>
            <Field label="Peran">
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Outlet">
              <select
                className="input"
                value={form.outlet_id}
                onChange={(e) => setForm({ ...form, outlet_id: Number(e.target.value) })}
              >
                {outlets.map((o) => (
                  <option key={o.outlet_id} value={o.outlet_id}>
                    {o.outlet_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Loket Kasir" hint="untuk peran Admin/Kasir">
              <select
                className="input"
                value={form.cashier_id || ''}
                onChange={(e) => setForm({ ...form, cashier_id: e.target.value })}
              >
                <option value="">Tanpa loket</option>
                {cashiers
                  .filter((c) => c.outlet_id === Number(form.outlet_id))
                  .map((c) => (
                    <option key={c.cashier_id} value={c.cashier_id}>
                      {c.cashier_name} · {c.counter}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Password" hint={form.user_id ? 'kosongkan bila tidak diubah' : 'wajib'}>
              <input
                type="text"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink-500 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Akun aktif dan dapat login
            </label>
            <p className="text-[11px] text-ink-400 sm:col-span-2">{ROLE_DESC[form.role]}</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
