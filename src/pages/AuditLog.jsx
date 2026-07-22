import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { PageHeader } from '../components/Modal'
import { getAuditLogs } from '../mock/api'
import { formatDateTime, formatTime } from '../utils/format'

const ACTION_BADGE = {
  create: 'bg-emerald-50 text-emerald-700',
  update: 'bg-sky-50 text-sky-700',
  delete: 'bg-brand-50 text-brand-600',
  approve: 'bg-amber-50 text-amber-700',
}

const ENTITIES = [
  ['', 'Semua entitas'],
  ['machine', 'Mesin'],
  ['product', 'Produk & Harga'],
  ['customer', 'Customer & Blacklist'],
  ['user', 'User & Role'],
  ['setting', 'Parameter Sistem'],
  ['transaction', 'Transaksi & Approval'],
]

/** BRD 1 — Comprehensive Audit Log: hanya bisa dibaca, tidak dapat diubah/dihapus. */
export default function AuditLog() {
  const [rows, setRows] = useState([])
  const [entity, setEntity] = useState('')
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    getAuditLogs({ entity, q })
      .then((r) => {
        setRows(r)
        setErr('')
      })
      .catch((e) => setErr(e.message))
  }, [entity, q])

  useEffect(load, [load])

  return (
    <div className="space-y-6 pt-2">
      <div className="card overflow-hidden">
        <PageHeader
          title="Audit Log"
          desc="Setiap perubahan harga, master data, peran user, dan persetujuan tersimpan permanen — tidak dapat diedit maupun dihapus"
        >
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300"
            />
            <input
              className="input w-56 pl-9"
              placeholder="Cari keterangan atau pelaku"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="input w-52" value={entity} onChange={(e) => setEntity(e.target.value)}>
            {ENTITIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button className="btn-ghost" onClick={load}>
            <Icon name="refresh" /> Muat Ulang
          </button>
        </PageHeader>

        {err && <p className="px-6 pb-4 text-sm text-brand-600">{err}</p>}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th w-16">ID</th>
                <th className="th">Waktu</th>
                <th className="th">Pelaku</th>
                <th className="th">Peran</th>
                <th className="th text-center">Aksi</th>
                <th className="th">Entitas</th>
                <th className="th">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.log_id} className="hover:bg-canvas/60">
                  <td className="td font-mono text-xs text-ink-400">#{l.log_id}</td>
                  <td className="td text-ink-500">
                    {formatDateTime(l.at)}
                    <span className="block text-[10px] text-ink-400">{formatTime(l.at)}</span>
                  </td>
                  <td className="td font-medium text-ink-700">{l.actor}</td>
                  <td className="td text-ink-500">{l.role}</td>
                  <td className="td text-center">
                    <span
                      className={
                        'rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ' +
                        (ACTION_BADGE[l.action] || 'bg-canvas text-ink-500')
                      }
                    >
                      {l.action}
                    </span>
                  </td>
                  <td className="td font-mono text-xs text-ink-500">
                    {l.entity}
                    {l.entity_id ? `#${l.entity_id}` : ''}
                  </td>
                  <td className="td text-ink-700">{l.detail}</td>
                </tr>
              ))}
              {!rows.length && !err && (
                <tr>
                  <td className="td text-center text-ink-400" colSpan={7}>
                    Belum ada aktivitas tercatat.
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
