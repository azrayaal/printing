// Data seed — mencerminkan isi backend/db/seed.sql
const r = (n) => Math.round(n / 10) * 10

/**
 * Tier harga per quantity (BRD 1: Master Produk & Harga).
 * Semakin besar qty, semakin murah; B2B selalu lebih rendah dari B2C.
 */
const tiers = (p) => [
  { min_qty: 1, price_b2c: p, price_b2b: r(p * 0.92) },
  { min_qty: 50, price_b2c: r(p * 0.9), price_b2b: r(p * 0.84) },
  { min_qty: 250, price_b2c: r(p * 0.82), price_b2b: r(p * 0.75) },
]

/** Ringkas: [kode, nama, kategori, satuan, harga, HPP, jam SLA, mesin] */
const P = [
  ['DOC-A4-BW', 'Cetak A4 Hitam Putih', 'A', 'Lembar', 500, 220, 2, [2, 3]],
  ['DOC-A4-CL', 'Cetak A4 Full Color', 'A', 'Lembar', 1500, 700, 2, [2]],
  ['DOC-F4-BW', 'Cetak F4 Hitam Putih', 'A', 'Lembar', 700, 300, 2, [2, 3]],
  ['DOC-A5-CL', 'Cetak A5 Full Color', 'A', 'Lembar', 1000, 450, 2, [2]],
  ['DOC-A3-CL', 'Cetak A3 Full Color', 'A', 'Lembar', 4000, 1900, 3, [2]],
  ['DOC-A3-BW', 'Cetak A3 Hitam Putih', 'A', 'Lembar', 2000, 850, 3, [2, 3]],
  ['DOC-SCN', 'Scan Dokumen A4', 'A', 'Lembar', 1000, 200, 1, [2]],
  ['DOC-NCR', 'Nota NCR 3 Rangkap (1 rim)', 'A', 'Rim', 385000, 240000, 48, [1]],
  ['FTO-2X3', 'Pas Foto 2x3 (isi 6)', 'B', 'Set', 15000, 6000, 1, [2]],
  ['FTO-3X4', 'Pas Foto 3x4 (isi 6)', 'B', 'Set', 17000, 6800, 1, [2]],
  ['FTO-4X6', 'Pas Foto 4x6 (isi 4)', 'B', 'Set', 20000, 8000, 1, [2]],
  ['FTO-4X4', 'Cetak Foto 4x4 cm', 'B', 'Lembar', 5000, 2000, 1, [2]],
  ['FTO-4R', 'Cetak Foto 4R Glossy', 'B', 'Lembar', 4000, 1600, 1, [2]],
  ['FTO-10R', 'Cetak Foto 10R + Bingkai', 'B', 'Pcs', 55000, 28000, 6, [2]],
  ['FTO-EDT', 'Edit Foto / Ganti Background', 'B', 'File', 10000, 2000, 2, []],
  ['DSN-CTM', 'Jasa Desain Custom', 'C', 'Desain', 75000, 20000, 24, []],
  ['DSN-UND', 'Desain Undangan Digital', 'C', 'Desain', 120000, 35000, 48, []],
  ['PRM-BNR', 'Banner Flexi 280gr', 'C', 'm2', 25000, 13000, 4, [4]],
  ['PRM-STK', 'Stiker Vinyl A3+ Custom', 'C', 'Lembar', 22000, 10000, 6, [4]],
  ['PRM-KTN', 'Kartu Nama Art Carton (100 pcs)', 'C', 'Box', 65000, 32000, 24, [1]],
  ['PRM-MUG', 'Mug Custom Sablon', 'C', 'Pcs', 45000, 22000, 24, []],
  ['PRM-KAO', 'Kaos Sablon DTF Custom', 'C', 'Pcs', 95000, 52000, 48, []],
  ['FIN-JLD', 'Jilid Spiral Kawat', 'D', 'Buku', 15000, 6000, 2, []],
  ['FIN-JSF', 'Jilid Softcover Lem Panas', 'D', 'Buku', 25000, 11000, 4, []],
  ['FIN-LMA', 'Laminating A4 Glossy', 'D', 'Lembar', 5000, 1800, 1, []],
  ['FIN-LMK', 'Laminating KTP / Kartu', 'D', 'Pcs', 3000, 900, 1, []],
]

export const seed = {
  outlet: [
    {
      outlet_id: 1,
      outlet_code: '01',
      outlet_name: 'Sumber Jaya Digital Printing',
      address: 'Jl. Pajajaran No.15, Bogor',
      phone: '0251-812345',
    },
    {
      outlet_id: 2,
      outlet_code: '02',
      outlet_name: 'Sumber Jaya Printing Depok',
      address: 'Jl. Margonda Raya No.88, Depok',
      phone: '021-7788990',
    },
  ],

  cashier: [
    { cashier_id: 1, cashier_name: 'Rina Kartika', outlet_id: 1, counter: 'Loket 1' },
    { cashier_id: 2, cashier_name: 'Budi Santoso', outlet_id: 1, counter: 'Loket 2' },
    { cashier_id: 3, cashier_name: 'Sari Amelia', outlet_id: 2, counter: 'Loket 1' },
  ],

  /**
   * Master Mesin Cetak (BRD 1). Kapasitas per hari menjadi dasar
   * kalkulasi beban mesin dan estimasi selesai SPK.
   */
  machine: [
    {
      machine_id: 1,
      machine_code: 'MSN-OFF-01',
      machine_name: 'Offset Ryobi 522',
      machine_type: 'offset',
      capacity_per_day: 20000,
      capacity_uom: 'Lembar',
      outlet_id: 1,
      is_active: true,
    },
    {
      machine_id: 2,
      machine_code: 'MSN-DIG-01',
      machine_name: 'Digital Konica C3070',
      machine_type: 'digital',
      capacity_per_day: 6000,
      capacity_uom: 'Lembar',
      outlet_id: 1,
      is_active: true,
    },
    {
      machine_id: 3,
      machine_code: 'MSN-RIS-01',
      machine_name: 'Risograph EZ 371',
      machine_type: 'risso',
      capacity_per_day: 15000,
      capacity_uom: 'Lembar',
      outlet_id: 1,
      is_active: true,
    },
    {
      machine_id: 4,
      machine_code: 'MSN-OUT-01',
      machine_name: 'Outdoor Epson SureColor',
      machine_type: 'outdoor',
      capacity_per_day: 120,
      capacity_uom: 'm2',
      outlet_id: 1,
      is_active: true,
    },
    {
      machine_id: 5,
      machine_code: 'MSN-DIG-02',
      machine_name: 'Digital Xerox V180 (Depok)',
      machine_type: 'digital',
      capacity_per_day: 5000,
      capacity_uom: 'Lembar',
      outlet_id: 2,
      is_active: true,
    },
  ],

  /**
   * Peran mengikuti BRD 1: Owner (super admin), Kepala Toko,
   * Admin/Kasir, CS/Desainer, Operator.
   */
  user_account: [
    {
      user_id: 1,
      username: 'owner',
      password: 'owner123',
      full_name: 'Hendra Wijaya',
      role: 'Owner',
      cashier_id: null,
      outlet_id: 1,
      is_active: true,
    },
    {
      user_id: 2,
      username: 'kepala',
      password: 'toko123',
      full_name: 'Dian Prasetyo',
      role: 'Kepala Toko',
      cashier_id: null,
      outlet_id: 1,
      is_active: true,
    },
    {
      user_id: 3,
      username: 'rina',
      password: 'kasir123',
      full_name: 'Rina Kartika',
      role: 'Admin/Kasir',
      cashier_id: 1,
      outlet_id: 1,
      is_active: true,
    },
    {
      user_id: 4,
      username: 'budi',
      password: 'kasir123',
      full_name: 'Budi Santoso',
      role: 'Admin/Kasir',
      cashier_id: 2,
      outlet_id: 1,
      is_active: true,
    },
    {
      user_id: 5,
      username: 'cs',
      password: 'cs123',
      full_name: 'Nadia Putri',
      role: 'CS/Desainer',
      cashier_id: null,
      outlet_id: 1,
      is_active: true,
    },
    {
      user_id: 6,
      username: 'operator',
      password: 'operator123',
      full_name: 'Agus Salim',
      role: 'Operator',
      cashier_id: null,
      outlet_id: 1,
      is_active: true,
    },
  ],

  /**
   * Master Customer (BRD 1 & 6): tipe retail/B2B, kredit limit,
   * piutang berjalan, dan flag blacklist dua level.
   */
  customer: [
    {
      customer_id: 1,
      customer_name: 'Umum',
      phone: null,
      customer_type: 'retail',
      credit_limit: 0,
      outstanding: 0,
      total_spent: 0,
      blacklist_level: null,
      blacklist_reason: null,
    },
    {
      customer_id: 2,
      customer_name: 'Andi Pratama',
      phone: '081234567890',
      customer_type: 'retail',
      credit_limit: 0,
      outstanding: 0,
      total_spent: 1250000,
      blacklist_level: null,
      blacklist_reason: null,
    },
    {
      customer_id: 3,
      customer_name: 'CV Mitra Abadi',
      phone: '02177001122',
      customer_type: 'b2b',
      credit_limit: 15000000,
      outstanding: 4200000,
      total_spent: 48500000,
      blacklist_level: null,
      blacklist_reason: null,
    },
    {
      customer_id: 4,
      customer_name: 'Dewi Lestari',
      phone: '085611223344',
      customer_type: 'retail',
      credit_limit: 0,
      outstanding: 350000,
      total_spent: 2750000,
      blacklist_level: 'warning',
      blacklist_reason: 'Dua kali telat pelunasan lebih dari 30 hari',
    },
    {
      customer_id: 5,
      customer_name: 'SMA Negeri 3 Bogor',
      phone: '0251900123',
      customer_type: 'b2b',
      credit_limit: 25000000,
      outstanding: 1800000,
      total_spent: 96300000,
      blacklist_level: null,
      blacklist_reason: null,
    },
    {
      customer_id: 6,
      customer_name: 'PT Karya Sablon',
      phone: '081377889900',
      customer_type: 'b2b',
      credit_limit: 10000000,
      outstanding: 12400000,
      total_spent: 33100000,
      blacklist_level: 'blocked',
      blacklist_reason: 'Piutang melampaui kredit limit dan menunggak 90+ hari',
    },
  ],

  // Kategori layanan sekaligus prefix nomor antrian
  service: [
    { service_code: 'A', service_name: 'Cetak Dokumen' },
    { service_code: 'B', service_name: 'Cetak Foto' },
    { service_code: 'C', service_name: 'Desain & Custom' },
    { service_code: 'D', service_name: 'Ambil Pesanan' },
  ],

  product: P.map(([code, name, cat, uom, price, cost, lead, machines], i) => ({
    product_id: i + 1,
    item_code: code,
    item_name: name,
    category: cat,
    uom,
    price,
    cost, // HPP — dasar pengunci margin minimal
    lead_time_hours: lead, // Master Lead-Time per produk (SLA)
    machine_ids: machines,
    price_tiers: tiers(price),
    is_active: true,
  })),

  /** Parameter global yang hanya boleh diubah Owner (BRD 2 & 6). */
  setting: {
    min_margin_percent: 20, // margin jual minimal terhadap HPP
    default_credit_limit: 2000000, // kredit limit awal customer B2B baru
    ar_block_percent: 100, // piutang > n% kredit limit → order baru diblokir
    overload_alert_percent: 90, // beban mesin > n% kapasitas → alert
    tax_rate_percent: 11,
  },
}

export const CATEGORY_LABEL = {
  A: 'Cetak Dokumen',
  B: 'Cetak Foto',
  C: 'Desain & Custom',
  D: 'Finishing & Pesanan',
}

export const MACHINE_TYPES = ['offset', 'digital', 'risso', 'outdoor']

export const TAX_RATE = 0.11
