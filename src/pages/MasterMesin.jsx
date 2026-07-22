import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon'
import Modal, { Field, PageHeader } from '../components/Modal'
import { useToast } from '../components/Toast'
import { deleteMachine, getMachines, getOutlets, getProducts, saveMachine } from '../mock/api'
import { MACHINE_TYPES } from '../mock/seed'

const TYPE_LABEL = {
  offset: 'Offset',
  digital: 'Digital',
  risso: 'Risograph',
  outdoor: 'Outdoor / Large Format',
}

const kosong = {
  machine_code: '',
  machine_name: '',
  machine_type: 'digital',
  capacity_per_day: 1000,
  capacity_uom: 'Lembar',
  outlet_id: 1,
  is_active: true,
}

/** BRD 1 — Master Mesin Cetak. */
export default function MasterMesin() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [outlets, setOutlets] = useState([])
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    getMachines().then(setRows)
    getProducts().then(setProducts)
  }, [])

  useEffect(() => {
    load()
    getOutlets().then(setOutlets)
  }, [load])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await saveMachine(form)
      toast(form.machine_id ? 'Mesin diperbarui.' : 'Mesin baru ditambahkan.')
      setForm(null)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const hapus = async (m) => {
    if (!confirm(`Hapus mesin ${m.machine_name}?`)) return
    try {
      await deleteMachine(m.machine_id)
      toast('Mesin dihapus.')
      load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const jumlahProduk = (id) => products.filter((p) => p.machine_ids?.includes(id)).length

  return (
    <div className="space-y-6 pt-2">
      <div className="card overflow-hidden">
        <PageHeader
          title="Master Mesin Cetak"
          desc="Kapasitas per hari menjadi dasar kalkulasi beban mesin dan estimasi selesai SPK"
        >
          <button className="btn-primary" onClick={() => setForm({ ...kosong })}>
            <Icon name="plus" /> Mesin Baru
          </button>
        </PageHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Kode</th>
                <th className="th">Nama Mesin</th>
                <th className="th">Tipe</th>
                <th className="th text-right">Kapasitas / Hari</th>
                <th className="th">Outlet</th>
                <th className="th text-center">Produk Terhubung</th>
                <th className="th text-center">Status</th>
                <th className="th text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.machine_id} className="hover:bg-canvas/60">
                  <td className="td font-mono text-xs text-ink-500">{m.machine_code}</td>
                  <td className="td font-medium text-ink-700">{m.machine_name}</td>
                  <td className="td">
                    <span className="rounded-md bg-canvas px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                      {TYPE_LABEL[m.machine_type]}
                    </span>
                  </td>
                  <td className="td text-right">
                    {Number(m.capacity_per_day).toLocaleString('id-ID')}{' '}
                    <span className="text-ink-400">{m.capacity_uom}</span>
                  </td>
                  <td className="td text-ink-500">
                    {outlets.find((o) => o.outlet_id === m.outlet_id)?.outlet_name || '-'}
                  </td>
                  <td className="td text-center text-ink-500">{jumlahProduk(m.machine_id)}</td>
                  <td className="td text-center">
                    <span
                      className={
                        'rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ' +
                        (m.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-canvas text-ink-400')
                      }
                    >
                      {m.is_active ? 'aktif' : 'nonaktif'}
                    </span>
                  </td>
                  <td className="td text-right">
                    <button className="btn-ghost px-3 py-1.5" onClick={() => setForm({ ...m })}>
                      Ubah
                    </button>
                    <button
                      className="ml-1 px-2 py-1.5 text-ink-300 hover:text-brand-500"
                      onClick={() => hapus(m)}
                      title="Hapus"
                    >
                      <Icon name="trash" />
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="td text-center text-ink-400" colSpan={8}>
                    Belum ada mesin terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <Modal
          title={form.machine_id ? 'Ubah Mesin' : 'Mesin Baru'}
          subtitle="Perubahan tercatat permanen di audit log"
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
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Kode Mesin">
              <input
                className="input"
                value={form.machine_code}
                onChange={(e) => setForm({ ...form, machine_code: e.target.value })}
                placeholder="MSN-DIG-02"
              />
            </Field>
            <Field label="Nama Mesin">
              <input
                className="input"
                value={form.machine_name}
                onChange={(e) => setForm({ ...form, machine_name: e.target.value })}
                placeholder="Digital Konica C3070"
              />
            </Field>
            <Field label="Tipe">
              <select
                className="input"
                value={form.machine_type}
                onChange={(e) => setForm({ ...form, machine_type: e.target.value })}
              >
                {MACHINE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
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
            <Field label="Kapasitas per Hari" hint="dasar estimasi SPK">
              <input
                type="number"
                min="1"
                className="input"
                value={form.capacity_per_day}
                onChange={(e) => setForm({ ...form, capacity_per_day: e.target.value })}
              />
            </Field>
            <Field label="Satuan Kapasitas">
              <input
                className="input"
                value={form.capacity_uom}
                onChange={(e) => setForm({ ...form, capacity_uom: e.target.value })}
                placeholder="Lembar / m2"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink-500 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Mesin aktif dan dapat menerima SPK
            </label>
          </form>
        </Modal>
      )}
    </div>
  )
}
