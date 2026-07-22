/**
 * Mock API layer.
 *
 * Semua fungsi di file ini meniru kontrak REST backend Express/PostgreSQL
 * (lihat docs/schema.sql). Persistensi memakai localStorage sehingga data
 * bertahan setelah refresh, persis seperti aplikasi dengan database.
 *
 * Saat backend nyata siap, cukup ganti isi fungsi-fungsi di bawah dengan
 * fetch() ke endpoint yang namanya sudah sama:
 *
 *   POST /api/auth/login              GET  /api/auth/me
 *   GET  /api/products                GET  /api/outlets
 *   GET  /api/cashiers                GET  /api/customers
 *   GET  /api/services
 *   POST /api/queues                  GET  /api/queues
 *   POST /api/queues/call-next        PATCH /api/queues/:id
 *   POST /api/transactions            GET  /api/transactions
 *   GET  /api/transactions/:id        POST /api/transactions/:id/print
 *   GET  /api/transactions/:id/escpos
 */
import { seed, TAX_RATE } from './seed'
import { buildEscPos } from './escpos'

const KEY = 'poc_pos_db_v2'
const AUTH_KEY = 'poc_pos_auth_v2'
const LATENCY = 220 // ms | mensimulasikan round-trip jaringan

const wait = (ms = LATENCY) => new Promise((r) => setTimeout(r, ms))
const clone = (v) => JSON.parse(JSON.stringify(v))
const round2 = (n) => Math.round(n * 100) / 100

function ymd(date) {
  const d = new Date(date)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ store */

function emptyDb() {
  return {
    ...clone(seed),
    pos_transaction: [],
    pos_transaction_line: [],
    print_log: [],
    queue_ticket: [],
    sequences: { trx_id: 0, line_id: 0, print_id: 0, queue_id: 0 },
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* korup / storage mati → jatuh ke seed */
  }
  const db = withDemoData(emptyDb())
  save(db)
  return db
}

function save(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* abaikan quota error di POC */
  }
}

let db = null
const state = () => (db ??= load())

export function resetDatabase() {
  db = withDemoData(emptyDb())
  save(db)
}

/* ------------------------------------------------------------------ auth */

/** POST /api/auth/login */
export async function login(username, password) {
  await wait(320)
  const user = state().user_account.find(
    (u) => u.username.toLowerCase() === String(username).trim().toLowerCase(),
  )
  if (!user || user.password !== password) throw new Error('Username atau password salah')

  const session = {
    user_id: user.user_id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    cashier_id: user.cashier_id,
    outlet_id: user.outlet_id,
    token: 'poc-' + user.user_id + '-' + ymd(new Date()),
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify(session))
  return session
}

/** GET /api/auth/me */
export function currentUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem(AUTH_KEY)
}

/* ------------------------------------------------ nomor & trigger sintetis */

/**
 * Padanan fungsi generate_pos_number() di PostgreSQL.
 * Format: POS-{outlet_code}-{YYYYMMDD}-{running 4 digit, reset harian per outlet}
 */
function generatePosNumber(d, outlet, trxDate) {
  const prefix = `POS-${outlet.outlet_code}-${ymd(trxDate)}-`
  const running = d.pos_transaction.filter((t) => t.pos_number.startsWith(prefix)).length + 1
  return prefix + String(running).padStart(4, '0')
}

/**
 * Nomor antrian: {service_code}-{running 3 digit}, reset harian per outlet
 * per layanan. Contoh: A-001, B-007.
 */
function generateQueueNumber(d, outletId, serviceCode, date) {
  const stamp = ymd(date)
  const running =
    d.queue_ticket.filter(
      (q) =>
        q.outlet_id === outletId &&
        q.service_code === serviceCode &&
        ymd(q.created_at) === stamp,
    ).length + 1
  return `${serviceCode}-${String(running).padStart(3, '0')}`
}

/** Padanan trigger trg_line_number: MAX(line_number)+1 per trx_id. */
function nextLineNumber(d, trxId) {
  const used = d.pos_transaction_line.filter((l) => l.trx_id === trxId)
  return used.reduce((m, l) => Math.max(m, l.line_number), 0) + 1
}

/* ------------------------------------------------------------ master data */

export async function getOutlets() {
  await wait(80)
  return clone(state().outlet)
}

export async function getCashiers(outletId) {
  await wait(80)
  const rows = state().cashier
  return clone(outletId ? rows.filter((c) => c.outlet_id === Number(outletId)) : rows)
}

export async function getCustomers() {
  await wait(80)
  return clone(state().customer)
}

/** POST /api/customers | daftarkan pelanggan baru dari layar kasir */
export async function createCustomer({ customer_name, phone = '' }) {
  await wait(140)
  const d = state()
  const name = String(customer_name || '').trim()
  if (!name) throw new Error('Nama pelanggan wajib diisi')

  const existing = d.customer.find(
    (c) => c.customer_name.toLowerCase() === name.toLowerCase(),
  )
  if (existing) return clone(existing)

  const row = {
    customer_id: Math.max(...d.customer.map((c) => c.customer_id)) + 1,
    customer_name: name,
    phone: phone.trim() || null,
  }
  d.customer.push(row)
  save(d)
  return clone(row)
}

export async function getServices() {
  await wait(60)
  return clone(state().service)
}

export async function getProducts(q = '') {
  await wait(80)
  const term = q.trim().toLowerCase()
  const rows = state().product.filter(
    (p) =>
      !term ||
      p.item_name.toLowerCase().includes(term) ||
      p.item_code.toLowerCase().includes(term),
  )
  return clone(rows)
}

/* ----------------------------------------------------------------- antrian */

/** POST /api/queues | kios pengambilan nomor antrian */
export async function takeQueue({ outlet_id, service_code, customer_name = '' }) {
  await wait(260)
  const d = state()
  const outlet = d.outlet.find((o) => o.outlet_id === Number(outlet_id))
  const service = d.service.find((s) => s.service_code === service_code)
  if (!outlet) throw new Error('Outlet tidak ditemukan')
  if (!service) throw new Error('Layanan tidak dikenal')

  const now = new Date().toISOString()
  const waitingAhead = d.queue_ticket.filter(
    (q) => q.outlet_id === outlet.outlet_id && q.status === 'waiting' && ymd(q.created_at) === ymd(now),
  ).length

  const ticket = {
    queue_id: ++d.sequences.queue_id,
    queue_number: generateQueueNumber(d, outlet.outlet_id, service.service_code, now),
    outlet_id: outlet.outlet_id,
    service_code: service.service_code,
    service_name: service.service_name,
    customer_name: customer_name.trim() || null,
    status: 'waiting', // waiting → called → served | skipped
    created_at: now,
    called_at: null,
    served_at: null,
    counter: null,
    cashier_id: null,
    trx_id: null,
  }
  d.queue_ticket.push(ticket)
  save(d)

  return clone({ ...ticket, outlet, waiting_ahead: waitingAhead, estimate_minutes: waitingAhead * 4 })
}

/** GET /api/queues?outlet_id=&date=today */
export async function getQueues(outletId) {
  await wait(100)
  const d = state()
  const today = ymd(new Date())
  return clone(
    d.queue_ticket
      .filter(
        (q) =>
          ymd(q.created_at) === today && (!outletId || q.outlet_id === Number(outletId)),
      )
      .sort((a, b) => a.queue_id - b.queue_id)
      .map((q) => ({
        ...q,
        cashier_name: d.cashier.find((c) => c.cashier_id === q.cashier_id)?.cashier_name || null,
      })),
  )
}

/** POST /api/queues/call-next | panggil antrian berikutnya ke sebuah loket */
export async function callNextQueue({ outlet_id, counter, cashier_id, service_code = null }) {
  await wait(200)
  const d = state()
  const today = ymd(new Date())

  // antrian yang sedang dipanggil di loket ini dianggap selesai dilayani
  d.queue_ticket
    .filter((q) => q.counter === counter && q.status === 'called' && ymd(q.created_at) === today)
    .forEach((q) => {
      q.status = 'served'
      q.served_at = new Date().toISOString()
    })

  const next = d.queue_ticket.find(
    (q) =>
      q.outlet_id === Number(outlet_id) &&
      q.status === 'waiting' &&
      ymd(q.created_at) === today &&
      (!service_code || q.service_code === service_code),
  )
  if (!next) {
    save(d)
    throw new Error('Tidak ada antrian menunggu')
  }

  next.status = 'called'
  next.called_at = new Date().toISOString()
  next.counter = counter
  next.cashier_id = Number(cashier_id) || null
  save(d)
  return clone(next)
}

/** PATCH /api/queues/:id | ubah status (served / skipped) */
export async function updateQueueStatus(queueId, status) {
  await wait(120)
  const d = state()
  const q = d.queue_ticket.find((x) => x.queue_id === Number(queueId))
  if (!q) throw new Error('Nomor antrian tidak ditemukan')
  q.status = status
  if (status === 'served') q.served_at = new Date().toISOString()
  save(d)
  return clone(q)
}

/* ----------------------------------------------------------- transactions */

/**
 * POST /api/transactions
 * payload: { outlet_id, cashier_id, customer_id, queue_id?, discount,
 *            payment_method, paid_amount,
 *            lines: [{ item_code, item_name, qty, uom, unit_price, discount_line }] }
 */
export async function createTransaction(payload) {
  await wait()
  const d = state()

  const outlet = d.outlet.find((o) => o.outlet_id === Number(payload.outlet_id))
  const cashier = d.cashier.find((c) => c.cashier_id === Number(payload.cashier_id))
  if (!outlet) throw new Error('Outlet tidak ditemukan')
  if (!cashier) throw new Error('Kasir tidak ditemukan')
  if (!payload.lines?.length) throw new Error('Keranjang masih kosong')

  const trxDate = new Date().toISOString()
  const subtotal = round2(
    payload.lines.reduce((s, l) => s + l.qty * l.unit_price - (l.discount_line || 0), 0),
  )
  const discount = round2(Number(payload.discount) || 0)
  if (discount > subtotal) throw new Error('Diskon melebihi subtotal')
  const tax = round2((subtotal - discount) * TAX_RATE)
  const grandTotal = round2(subtotal - discount + tax)
  const paid = round2(Number(payload.paid_amount) || 0)
  if (paid < grandTotal) throw new Error('Jumlah bayar kurang dari total tagihan')

  const queue = payload.queue_id
    ? d.queue_ticket.find((q) => q.queue_id === Number(payload.queue_id))
    : null

  const trx = {
    trx_id: ++d.sequences.trx_id,
    pos_number: generatePosNumber(d, outlet, trxDate),
    outlet_id: outlet.outlet_id,
    cashier_id: cashier.cashier_id,
    customer_id: Number(payload.customer_id) || 1,
    queue_number: queue?.queue_number || null,
    trx_date: trxDate,
    subtotal,
    discount,
    tax,
    grand_total: grandTotal,
    payment_method: payload.payment_method || 'cash',
    paid_amount: paid,
    change_amount: round2(paid - grandTotal),
    status: 'paid',
    odoo_sync_status: 'pending',
  }
  d.pos_transaction.push(trx)

  for (const l of payload.lines) {
    d.pos_transaction_line.push({
      line_id: ++d.sequences.line_id,
      trx_id: trx.trx_id,
      line_number: nextLineNumber(d, trx.trx_id),
      item_code: l.item_code,
      item_name: l.item_name,
      qty: Number(l.qty),
      uom: l.uom,
      unit_price: Number(l.unit_price),
      discount_line: Number(l.discount_line) || 0,
      subtotal_line: round2(l.qty * l.unit_price - (l.discount_line || 0)),
    })
  }

  if (queue) {
    queue.status = 'served'
    queue.served_at = trxDate
    queue.trx_id = trx.trx_id
    queue.cashier_id = cashier.cashier_id
  }

  save(d)
  return getTransaction(trx.trx_id)
}

/** GET /api/transactions */
export async function getTransactions() {
  await wait(120)
  const d = state()
  return d.pos_transaction
    .slice()
    .sort((a, b) => b.trx_id - a.trx_id)
    .map((t) => ({
      ...t,
      outlet_name: d.outlet.find((o) => o.outlet_id === t.outlet_id)?.outlet_name,
      cashier_name: d.cashier.find((c) => c.cashier_id === t.cashier_id)?.cashier_name,
      customer_name: d.customer.find((c) => c.customer_id === t.customer_id)?.customer_name,
      item_count: d.pos_transaction_line.filter((l) => l.trx_id === t.trx_id).length,
      print_count: d.print_log.filter((p) => p.trx_id === t.trx_id).length,
    }))
}

/** GET /api/transactions/:id | header + lines + print history */
export async function getTransaction(id) {
  await wait(120)
  const d = state()
  const trx = d.pos_transaction.find((t) => t.trx_id === Number(id))
  if (!trx) throw new Error('Transaksi tidak ditemukan')
  return clone({
    ...trx,
    outlet: d.outlet.find((o) => o.outlet_id === trx.outlet_id),
    cashier: d.cashier.find((c) => c.cashier_id === trx.cashier_id),
    customer: d.customer.find((c) => c.customer_id === trx.customer_id),
    lines: d.pos_transaction_line
      .filter((l) => l.trx_id === trx.trx_id)
      .sort((a, b) => a.line_number - b.line_number),
    prints: d.print_log
      .filter((p) => p.trx_id === trx.trx_id)
      .sort((a, b) => a.copy_number - b.copy_number),
  })
}

/**
 * POST /api/transactions/:id/print
 * body: { print_type: 'original' | 'reprint', printed_by }
 * Mengembalikan data lengkap untuk render struk.
 */
export async function logPrint(id, { print_type = 'original', printed_by = 'system' } = {}) {
  await wait(150)
  const d = state()
  const trx = d.pos_transaction.find((t) => t.trx_id === Number(id))
  if (!trx) throw new Error('Transaksi tidak ditemukan')

  const copyNumber = d.print_log.filter((p) => p.trx_id === trx.trx_id).length + 1
  const entry = {
    print_id: ++d.sequences.print_id,
    trx_id: trx.trx_id,
    printed_by,
    printed_at: new Date().toISOString(),
    print_type: copyNumber === 1 ? print_type : 'reprint',
    copy_number: copyNumber,
  }
  d.print_log.push(entry)
  save(d)

  const full = await getTransaction(trx.trx_id)
  return { print: entry, transaction: full }
}

/** GET /api/transactions/:id/escpos */
export async function getEscPos(id, printType = 'original') {
  const trx = await getTransaction(id)
  return buildEscPos(trx, printType)
}

/* ------------------------------------------------------------ demo seeding */

function withDemoData(d) {
  const at = (daysAgo, hour, minute = 15) => {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    date.setHours(hour, minute, 0, 0)
    return date
  }

  const mkTrx = (date, outletId, cashierId, customerId, method, items, discount = 0, queueNumber = null) => {
    const outlet = d.outlet.find((o) => o.outlet_id === outletId)
    const lines = items.map(([code, qty]) => {
      const p = d.product.find((x) => x.item_code === code)
      return {
        item_code: p.item_code,
        item_name: p.item_name,
        qty,
        uom: p.uom,
        unit_price: p.price,
        discount_line: 0,
        subtotal_line: p.price * qty,
      }
    })
    const subtotal = lines.reduce((s, l) => s + l.subtotal_line, 0)
    const tax = round2((subtotal - discount) * TAX_RATE)
    const grand = round2(subtotal - discount + tax)
    const paid = Math.ceil(grand / 5000) * 5000

    const trx = {
      trx_id: ++d.sequences.trx_id,
      pos_number: generatePosNumber(d, outlet, date),
      outlet_id: outletId,
      cashier_id: cashierId,
      customer_id: customerId,
      queue_number: queueNumber,
      trx_date: date.toISOString(),
      subtotal,
      discount,
      tax,
      grand_total: grand,
      payment_method: method,
      paid_amount: paid,
      change_amount: round2(paid - grand),
      status: 'paid',
      odoo_sync_status: 'pending',
    }
    d.pos_transaction.push(trx)
    lines.forEach((l) => {
      d.pos_transaction_line.push({
        line_id: ++d.sequences.line_id,
        trx_id: trx.trx_id,
        line_number: nextLineNumber(d, trx.trx_id),
        ...l,
      })
    })
    d.print_log.push({
      print_id: ++d.sequences.print_id,
      trx_id: trx.trx_id,
      printed_by: d.cashier.find((c) => c.cashier_id === cashierId).cashier_name,
      printed_at: date.toISOString(),
      print_type: 'original',
      copy_number: 1,
    })
    return trx
  }

  const mkQueue = (date, outletId, serviceCode, status, opts = {}) => {
    const t = {
      queue_id: ++d.sequences.queue_id,
      queue_number: generateQueueNumber(d, outletId, serviceCode, date),
      outlet_id: outletId,
      service_code: serviceCode,
      service_name: d.service.find((s) => s.service_code === serviceCode).service_name,
      customer_name: opts.customer_name || null,
      status,
      created_at: date.toISOString(),
      called_at: status === 'waiting' ? null : date.toISOString(),
      served_at: status === 'served' ? date.toISOString() : null,
      counter: status === 'waiting' ? null : opts.counter || 'Loket 1',
      cashier_id: status === 'waiting' ? null : opts.cashier_id || 1,
      trx_id: opts.trx_id || null,
    }
    d.queue_ticket.push(t)
    return t
  }

  /* --- transaksi historis --- */
  mkTrx(at(2, 9), 1, 1, 1, 'cash', [['DOC-A4-BW', 40], ['FIN-JLD', 1]])
  mkTrx(at(1, 11), 1, 2, 2, 'qris', [['FTO-3X4', 2], ['FTO-EDT', 1]])
  const t3 = mkTrx(at(1, 16), 2, 3, 5, 'debit', [['PRM-BNR', 6], ['DSN-CTM', 1]], 25000)

  /* --- hari ini: antrian yang sudah dilayani + transaksinya --- */
  const q1 = mkQueue(at(0, 8, 5), 1, 'A', 'served', { counter: 'Loket 1', cashier_id: 1 })
  const trxA = mkTrx(at(0, 8, 12), 1, 1, 3, 'cash', [['DOC-A4-CL', 25], ['FIN-LMA', 3]], 0, q1.queue_number)
  q1.trx_id = trxA.trx_id

  const q2 = mkQueue(at(0, 9, 2), 1, 'B', 'served', { counter: 'Loket 2', cashier_id: 2, customer_name: 'Dewi' })
  const trxB = mkTrx(at(0, 9, 10), 1, 2, 4, 'qris', [['FTO-4X4', 8], ['FTO-4R', 4]], 0, q2.queue_number)
  q2.trx_id = trxB.trx_id

  const q3 = mkQueue(at(0, 10, 20), 1, 'C', 'served', { counter: 'Loket 1', cashier_id: 1 })
  const trxC = mkTrx(at(0, 10, 35), 1, 1, 5, 'debit', [['PRM-KTN', 2], ['DSN-CTM', 1]], 15000, q3.queue_number)
  q3.trx_id = trxC.trx_id

  /* --- antrian aktif hari ini --- */
  mkQueue(at(0, 10, 45), 1, 'A', 'called', { counter: 'Loket 2', cashier_id: 2 })
  mkQueue(at(0, 10, 50), 1, 'A', 'waiting')
  mkQueue(at(0, 10, 52), 1, 'B', 'waiting', { customer_name: 'Andi' })
  mkQueue(at(0, 10, 58), 1, 'C', 'waiting')
  mkQueue(at(0, 11, 3), 1, 'D', 'waiting')

  // satu contoh reprint agar print_log terlihat berlapis
  d.print_log.push({
    print_id: ++d.sequences.print_id,
    trx_id: t3.trx_id,
    printed_by: 'Sari Amelia',
    printed_at: new Date(new Date(t3.trx_date).getTime() + 5 * 60000).toISOString(),
    print_type: 'reprint',
    copy_number: 2,
  })

  return d
}
