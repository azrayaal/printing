// Data seed — mencerminkan isi backend/db/seed.sql
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

  // Akun demo — password sengaja ditampilkan di halaman login untuk POC
  user_account: [
    {
      user_id: 1,
      username: 'rina',
      password: 'kasir123',
      full_name: 'Rina Kartika',
      role: 'Kasir',
      cashier_id: 1,
      outlet_id: 1,
    },
    {
      user_id: 2,
      username: 'budi',
      password: 'kasir123',
      full_name: 'Budi Santoso',
      role: 'Kasir',
      cashier_id: 2,
      outlet_id: 1,
    },
    {
      user_id: 3,
      username: 'supervisor',
      password: 'admin123',
      full_name: 'Dian Prasetyo',
      role: 'Supervisor',
      cashier_id: null,
      outlet_id: 1,
    },
  ],

  customer: [
    { customer_id: 1, customer_name: 'Umum', phone: null },
    { customer_id: 2, customer_name: 'Andi Pratama', phone: '081234567890' },
    { customer_id: 3, customer_name: 'CV Mitra Abadi', phone: '02177001122' },
    { customer_id: 4, customer_name: 'Dewi Lestari', phone: '085611223344' },
    { customer_id: 5, customer_name: 'SMA Negeri 3 Bogor', phone: '0251900123' },
  ],

  // Kategori layanan sekaligus prefix nomor antrian
  service: [
    { service_code: 'A', service_name: 'Cetak Dokumen' },
    { service_code: 'B', service_name: 'Cetak Foto' },
    { service_code: 'C', service_name: 'Desain & Custom' },
    { service_code: 'D', service_name: 'Ambil Pesanan' },
  ],

  product: [
    // --- A. Cetak Dokumen -------------------------------------------------
    { product_id: 1, item_code: 'DOC-A4-BW', item_name: 'Cetak A4 Hitam Putih', category: 'A', uom: 'Lembar', price: 500 },
    { product_id: 2, item_code: 'DOC-A4-CL', item_name: 'Cetak A4 Full Color', category: 'A', uom: 'Lembar', price: 1500 },
    { product_id: 3, item_code: 'DOC-F4-BW', item_name: 'Cetak F4 Hitam Putih', category: 'A', uom: 'Lembar', price: 700 },
    { product_id: 4, item_code: 'DOC-A5-CL', item_name: 'Cetak A5 Full Color', category: 'A', uom: 'Lembar', price: 1000 },
    { product_id: 5, item_code: 'DOC-A3-CL', item_name: 'Cetak A3 Full Color', category: 'A', uom: 'Lembar', price: 4000 },
    { product_id: 6, item_code: 'DOC-A3-BW', item_name: 'Cetak A3 Hitam Putih', category: 'A', uom: 'Lembar', price: 2000 },
    { product_id: 7, item_code: 'DOC-SCN', item_name: 'Scan Dokumen A4', category: 'A', uom: 'Lembar', price: 1000 },

    // --- B. Cetak Foto ----------------------------------------------------
    { product_id: 8, item_code: 'FTO-2X3', item_name: 'Pas Foto 2x3 (isi 6)', category: 'B', uom: 'Set', price: 15000 },
    { product_id: 9, item_code: 'FTO-3X4', item_name: 'Pas Foto 3x4 (isi 6)', category: 'B', uom: 'Set', price: 17000 },
    { product_id: 10, item_code: 'FTO-4X6', item_name: 'Pas Foto 4x6 (isi 4)', category: 'B', uom: 'Set', price: 20000 },
    { product_id: 11, item_code: 'FTO-4X4', item_name: 'Cetak Foto 4x4 cm', category: 'B', uom: 'Lembar', price: 5000 },
    { product_id: 12, item_code: 'FTO-4R', item_name: 'Cetak Foto 4R Glossy', category: 'B', uom: 'Lembar', price: 4000 },
    { product_id: 13, item_code: 'FTO-10R', item_name: 'Cetak Foto 10R + Bingkai', category: 'B', uom: 'Pcs', price: 55000 },
    { product_id: 14, item_code: 'FTO-EDT', item_name: 'Edit Foto / Ganti Background', category: 'B', uom: 'File', price: 10000 },

    // --- C. Desain & Custom ----------------------------------------------
    { product_id: 15, item_code: 'DSN-CTM', item_name: 'Jasa Desain Custom', category: 'C', uom: 'Desain', price: 75000 },
    { product_id: 16, item_code: 'DSN-UND', item_name: 'Desain Undangan Digital', category: 'C', uom: 'Desain', price: 120000 },
    { product_id: 17, item_code: 'PRM-BNR', item_name: 'Banner Flexi 280gr', category: 'C', uom: 'm2', price: 25000 },
    { product_id: 18, item_code: 'PRM-STK', item_name: 'Stiker Vinyl A3+ Custom', category: 'C', uom: 'Lembar', price: 22000 },
    { product_id: 19, item_code: 'PRM-KTN', item_name: 'Kartu Nama Art Carton (100 pcs)', category: 'C', uom: 'Box', price: 65000 },
    { product_id: 20, item_code: 'PRM-MUG', item_name: 'Mug Custom Sablon', category: 'C', uom: 'Pcs', price: 45000 },
    { product_id: 21, item_code: 'PRM-KAO', item_name: 'Kaos Sablon DTF Custom', category: 'C', uom: 'Pcs', price: 95000 },

    // --- D. Finishing / Ambil Pesanan ------------------------------------
    { product_id: 22, item_code: 'FIN-JLD', item_name: 'Jilid Spiral Kawat', category: 'D', uom: 'Buku', price: 15000 },
    { product_id: 23, item_code: 'FIN-JSF', item_name: 'Jilid Softcover Lem Panas', category: 'D', uom: 'Buku', price: 25000 },
    { product_id: 24, item_code: 'FIN-LMA', item_name: 'Laminating A4 Glossy', category: 'D', uom: 'Lembar', price: 5000 },
    { product_id: 25, item_code: 'FIN-LMK', item_name: 'Laminating KTP / Kartu', category: 'D', uom: 'Pcs', price: 3000 },
  ],
}

export const CATEGORY_LABEL = {
  A: 'Cetak Dokumen',
  B: 'Cetak Foto',
  C: 'Desain & Custom',
  D: 'Finishing & Pesanan',
}

export const TAX_RATE = 0.11
