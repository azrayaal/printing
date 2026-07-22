const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

export const rupiah = (n) => nf.format(Math.round(Number(n) || 0))
export const rp = (n) => 'Rp ' + rupiah(n)

const p2 = (n) => String(n).padStart(2, '0')

export function formatDateTime(iso) {
  const d = new Date(iso)
  return `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}

export function formatDate(iso) {
  const d = new Date(iso)
  return `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}`
}

export function formatTime(iso) {
  const d = new Date(iso)
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
}

export const isToday = (iso) => {
  const a = new Date(iso)
  const b = new Date()
  return a.toDateString() === b.toDateString()
}
