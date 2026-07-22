/**
 * Peran & hak akses — BRD 1 "Manajemen User & Role".
 *
 * Owner adalah super admin: seluruh kemampuan aktif, termasuk master data,
 * manajemen user, parameter sistem, dan audit log.
 */

export const ROLES = ['Owner', 'Kepala Toko', 'Admin/Kasir', 'CS/Desainer', 'Operator']

export const ROLE_DESC = {
  Owner: 'Super admin — seluruh master data, user, parameter sistem, dan audit log',
  'Kepala Toko': 'Operasional harian, master mesin/produk/customer, approval diskon',
  'Admin/Kasir': 'Antrian, order, transaksi, dan cetak invoice',
  'CS/Desainer': 'Antrian, detail order, dan ACC desain',
  Operator: 'Eksekusi SPK produksi di loket/mesin',
}

/** Daftar kemampuan; dipakai untuk menyaring menu maupun aksi tulis. */
export const CAPS = {
  Owner: [
    'dashboard',
    'kasir',
    'riwayat',
    'antrian',
    'master.machine',
    'master.product',
    'master.customer',
    'master.user',
    'master.setting',
    'audit.read',
    'discount.override',
    'blacklist.manage',
  ],
  'Kepala Toko': [
    'dashboard',
    'kasir',
    'riwayat',
    'antrian',
    'master.machine',
    'master.product',
    'master.customer',
    'audit.read',
    'discount.override',
    'blacklist.manage',
  ],
  'Admin/Kasir': ['dashboard', 'kasir', 'riwayat', 'antrian'],
  'CS/Desainer': ['dashboard', 'riwayat', 'antrian'],
  Operator: ['antrian'],
}

export const can = (user, cap) => !!user && (CAPS[user.role] || []).includes(cap)

/** Owner = super admin, dipakai untuk label & pintasan pemeriksaan. */
export const isSuperAdmin = (user) => user?.role === 'Owner'
