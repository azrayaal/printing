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
import { can, ROLES } from './roles'
import { buildEscPos } from './escpos'

const KEY = 'poc_pos_db'
const AUTH_KEY = 'poc_pos_auth'

/**
 * Naikkan angka ini setiap kali struktur atau isi seed berubah.
 * Data lama di localStorage otomatis dibuang dan diseed ulang, sehingga
 * akun / master data baru langsung tersedia tanpa perlu clear storage manual.
 */
const SEED_VERSION = 3
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
  const s = clone(seed)
  return {
    __seed_version: SEED_VERSION,
    ...s,
    pos_transaction: [],
    pos_transaction_line: [],
    print_log: [],
    queue_ticket: [],
    audit_log: [],
    sequences: {
      trx_id: 0,
      line_id: 0,
      print_id: 0,
      queue_id: 0,
      log_id: 0,
      machine_id: Math.max(...s.machine.map((m) => m.machine_id)),
      product_id: Math.max(...s.product.map((p) => p.product_id)),
      customer_id: Math.max(...s.customer.map((c) => c.customer_id)),
      user_id: Math.max(...s.user_account.map((u) => u.user_id)),
    },
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.__seed_version === SEED_VERSION) return parsed
      // seed sudah berubah → buang data lama beserta sesi login lama
      localStorage.removeItem(AUTH_KEY)
    }
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
  if (user.is_active === false) throw new Error('Akun dinonaktifkan. Hubungi Owner.')

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
    if (!raw) return null
    const sesi = JSON.parse(raw)
    // Sesi menggantung (user sudah dihapus / data diseed ulang) dianggap keluar
    const masih = state().user_account.find(
      (u) => u.user_id === sesi.user_id && u.username === sesi.username && u.is_active !== false,
    )
    if (!masih) {
      localStorage.removeItem(AUTH_KEY)
      return null
    }
    return { ...sesi, role: masih.role }
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem(AUTH_KEY)
}

/* ---------------------------------------------------- audit log & otorisasi */

/**
 * Comprehensive Audit Log (BRD 1) — hanya bisa ditambah, tidak ada
 * fungsi ubah maupun hapus di seluruh lapisan API ini.
 */
function audit(action, entity, entity_id, detail) {
  const d = state()
  const actor = currentUser()
  d.audit_log.push({
    log_id: ++d.sequences.log_id,
    at: new Date().toISOString(),
    actor: actor?.full_name || 'system',
    username: actor?.username || 'system',
    role: actor?.role || '-',
    action, // create | update | delete | approve | login
    entity, // machine | product | customer | user | setting | transaction | queue
    entity_id: entity_id ?? null,
    detail,
  })
}

/** GET /api/audit-logs */
export async function getAuditLogs({ entity = '', q = '' } = {}) {
  await wait(120)
  requireCap('audit.read')
  const term = q.trim().toLowerCase()
  return clone(
    state()
      .audit_log.filter(
        (l) =>
          (!entity || l.entity === entity) &&
          (!term ||
            l.detail.toLowerCase().includes(term) ||
            l.actor.toLowerCase().includes(term) ||
            l.action.includes(term)),
      )
      .sort((a, b) => b.log_id - a.log_id),
  )
}

function requireCap(cap) {
  const user = currentUser()
  if (!can(user, cap)) throw new Error('Akses ditolak untuk peran ' + (user?.role || 'tamu'))
  return user
}

/* --------------------------------------------------------- parameter sistem */

/** GET /api/settings */
export async function getSettings() {
  await wait(60)
  return clone(state().setting)
}

/** PUT /api/settings — hanya Owner */
export async function saveSettings(patch) {
  await wait(180)
  requireCap('master.setting')
  const d = state()
  const before = clone(d.setting)
  d.setting = { ...d.setting, ...patch }
  const ubah = Object.keys(patch)
    .filter((k) => before[k] !== d.setting[k])
    .map((k) => `${k}: ${before[k]} → ${d.setting[k]}`)
  if (ubah.length) audit('update', 'setting', null, 'Parameter sistem — ' + ubah.join(', '))
  save(d)
  return clone(d.setting)
}

/* --------------------------------------------------------------- master mesin */

/** GET /api/machines */
export async function getMachines(outletId) {
  await wait(90)
  const rows = state().machine
  return clone(outletId ? rows.filter((m) => m.outlet_id === Number(outletId)) : rows)
}

/** POST/PUT /api/machines */
export async function saveMachine(payload) {
  await wait(180)
  requireCap('master.machine')
  const d = state()
  if (!payload.machine_name?.trim()) throw new Error('Nama mesin wajib diisi')
  if (!(Number(payload.capacity_per_day) > 0)) throw new Error('Kapasitas per hari harus lebih dari 0')

  if (payload.machine_id) {
    const m = d.machine.find((x) => x.machine_id === Number(payload.machine_id))
    if (!m) throw new Error('Mesin tidak ditemukan')
    Object.assign(m, payload, {
      machine_id: m.machine_id,
      capacity_per_day: Number(payload.capacity_per_day),
      outlet_id: Number(payload.outlet_id),
    })
    audit('update', 'machine', m.machine_id, `Ubah mesin ${m.machine_code} — ${m.machine_name}`)
    save(d)
    return clone(m)
  }

  const row = {
    ...payload,
    machine_id: ++d.sequences.machine_id,
    capacity_per_day: Number(payload.capacity_per_day),
    outlet_id: Number(payload.outlet_id),
    is_active: payload.is_active !== false,
  }
  d.machine.push(row)
  audit('create', 'machine', row.machine_id, `Mesin baru ${row.machine_code} — ${row.machine_name}`)
  save(d)
  return clone(row)
}

/** DELETE /api/machines/:id */
export async function deleteMachine(id) {
  await wait(150)
  requireCap('master.machine')
  const d = state()
  const m = d.machine.find((x) => x.machine_id === Number(id))
  if (!m) throw new Error('Mesin tidak ditemukan')
  const dipakai = d.product.filter((p) => p.machine_ids?.includes(m.machine_id))
  if (dipakai.length)
    throw new Error(`Mesin masih terpasang pada ${dipakai.length} produk. Lepaskan dulu.`)
  d.machine = d.machine.filter((x) => x.machine_id !== m.machine_id)
  audit('delete', 'machine', m.machine_id, `Hapus mesin ${m.machine_code}`)
  save(d)
  return true
}

/* -------------------------------------------------------------- master produk */

/** POST/PUT /api/products */
export async function saveProduct(payload) {
  await wait(180)
  requireCap('master.product')
  const d = state()
  if (!payload.item_name?.trim()) throw new Error('Nama produk wajib diisi')
  if (!payload.item_code?.trim()) throw new Error('Kode item wajib diisi')
  if (!(Number(payload.price) > 0)) throw new Error('Harga dasar harus lebih dari 0')
  if (Number(payload.cost) >= Number(payload.price))
    throw new Error('HPP tidak boleh sama atau melebihi harga dasar')

  const bentrok = d.product.find(
    (p) =>
      p.item_code.toLowerCase() === payload.item_code.trim().toLowerCase() &&
      p.product_id !== Number(payload.product_id),
  )
  if (bentrok) throw new Error('Kode item sudah dipakai produk lain')

  const tiers = (payload.price_tiers || [])
    .filter((t) => Number(t.min_qty) > 0)
    .map((t) => ({
      min_qty: Number(t.min_qty),
      price_b2c: Number(t.price_b2c),
      price_b2b: Number(t.price_b2b),
    }))
    .sort((a, b) => a.min_qty - b.min_qty)

  const body = {
    item_code: payload.item_code.trim().toUpperCase(),
    item_name: payload.item_name.trim(),
    category: payload.category || 'A',
    uom: payload.uom || 'Pcs',
    price: Number(payload.price),
    cost: Number(payload.cost),
    lead_time_hours: Number(payload.lead_time_hours) || 1,
    machine_ids: (payload.machine_ids || []).map(Number),
    price_tiers: tiers.length ? tiers : [{ min_qty: 1, price_b2c: Number(payload.price), price_b2b: Number(payload.price) }],
    is_active: payload.is_active !== false,
  }

  if (payload.product_id) {
    const p = d.product.find((x) => x.product_id === Number(payload.product_id))
    if (!p) throw new Error('Produk tidak ditemukan')
    const hargaLama = p.price
    Object.assign(p, body)
    audit(
      'update',
      'product',
      p.product_id,
      hargaLama !== p.price
        ? `Ubah harga ${p.item_code}: ${hargaLama} → ${p.price} (beserta tier)`
        : `Ubah produk ${p.item_code} — ${p.item_name}`,
    )
    save(d)
    return clone(p)
  }

  const row = { ...body, product_id: ++d.sequences.product_id }
  d.product.push(row)
  audit('create', 'product', row.product_id, `Produk baru ${row.item_code} — ${row.item_name}`)
  save(d)
  return clone(row)
}

/** DELETE /api/products/:id */
export async function deleteProduct(id) {
  await wait(150)
  requireCap('master.product')
  const d = state()
  const p = d.product.find((x) => x.product_id === Number(id))
  if (!p) throw new Error('Produk tidak ditemukan')
  d.product = d.product.filter((x) => x.product_id !== p.product_id)
  audit('delete', 'product', p.product_id, `Hapus produk ${p.item_code}`)
  save(d)
  return true
}

/**
 * Harga berlaku menurut tier quantity dan tipe customer (BRD 1).
 * Mengembalikan { unit_price, tier, margin_percent, below_min }
 */
export function resolvePrice(product, qty = 1, customerType = 'retail', minMarginPercent = 0) {
  const tiers = [...(product.price_tiers || [])].sort((a, b) => a.min_qty - b.min_qty)
  const tier =
    tiers.filter((t) => qty >= t.min_qty).pop() ||
    tiers[0] || { min_qty: 1, price_b2c: product.price, price_b2b: product.price }
  const unit_price = customerType === 'b2b' ? tier.price_b2b : tier.price_b2c
  const margin_percent = product.cost ? ((unit_price - product.cost) / product.cost) * 100 : 100
  return {
    unit_price,
    tier,
    margin_percent: round2(margin_percent),
    below_min: margin_percent < minMarginPercent,
  }
}

/**
 * Pengunci margin minimal (BRD 2). Mengembalikan info apakah harga
 * setelah diskon masih di atas ambang yang dikonfigurasi Owner.
 */
export function checkMargin(lines, discount, minMarginPercent) {
  const hpp = lines.reduce((s, l) => s + (Number(l.cost) || 0) * l.qty, 0)
  const jual =
    lines.reduce((s, l) => s + l.qty * l.unit_price - (l.discount_line || 0), 0) -
    (Number(discount) || 0)
  const margin = hpp ? ((jual - hpp) / hpp) * 100 : 100
  const minimum = hpp * (1 + minMarginPercent / 100)
  return {
    hpp: round2(hpp),
    jual: round2(jual),
    margin_percent: round2(margin),
    min_selling: round2(minimum),
    max_discount: round2(Math.max(0, jual + (Number(discount) || 0) - minimum)),
    below_min: margin < minMarginPercent,
  }
}

/**
 * Estimasi selesai berbasis SLA produk (BRD 2): ambil lead time
 * terpanjang di keranjang, dihitung dari waktu order dibuat.
 */
export function estimateFinish(lines, from = new Date()) {
  const jam = Math.max(0, ...lines.map((l) => Number(l.lead_time_hours) || 0))
  const due = new Date(from)
  due.setHours(due.getHours() + jam)
  return { lead_time_hours: jam, due_at: due.toISOString() }
}

/* ------------------------------------------------------------ master customer */

/** POST/PUT /api/customers */
export async function saveCustomer(payload) {
  await wait(180)
  const d = state()
  const user = currentUser()
  const name = String(payload.customer_name || '').trim()
  if (!name) throw new Error('Nama pelanggan wajib diisi')

  const editing = payload.customer_id
    ? d.customer.find((c) => c.customer_id === Number(payload.customer_id))
    : null
  if (payload.customer_id && !editing) throw new Error('Pelanggan tidak ditemukan')

  // Perubahan blacklist & kredit limit butuh wewenang khusus
  const ubahBlacklist =
    editing && (editing.blacklist_level || null) !== (payload.blacklist_level || null)
  const ubahLimit = editing && Number(editing.credit_limit) !== Number(payload.credit_limit || 0)
  if ((ubahBlacklist || ubahLimit) && !can(user, 'blacklist.manage'))
    throw new Error('Hanya Kepala Toko atau Owner yang boleh mengubah blacklist / kredit limit')

  const body = {
    customer_name: name,
    phone: String(payload.phone || '').trim() || null,
    customer_type: payload.customer_type === 'b2b' ? 'b2b' : 'retail',
    credit_limit: Number(payload.credit_limit) || 0,
    blacklist_level: payload.blacklist_level || null, // null | warning | blocked
    blacklist_reason: payload.blacklist_reason?.trim() || null,
  }
  if (body.blacklist_level && !body.blacklist_reason)
    throw new Error('Alasan blacklist wajib dicatat')

  if (editing) {
    Object.assign(editing, body)
    if (ubahBlacklist)
      audit(
        'update',
        'customer',
        editing.customer_id,
        `Blacklist ${editing.customer_name} → ${body.blacklist_level || 'dicabut'}${body.blacklist_reason ? ' (' + body.blacklist_reason + ')' : ''}`,
      )
    else audit('update', 'customer', editing.customer_id, `Ubah data ${editing.customer_name}`)
    save(d)
    return clone(editing)
  }

  const kembar = d.customer.find(
    (c) =>
      c.customer_name.toLowerCase() === name.toLowerCase() ||
      (body.phone && c.phone === body.phone),
  )
  if (kembar) return clone(kembar)

  const row = {
    ...body,
    customer_id: ++d.sequences.customer_id,
    outstanding: 0,
    total_spent: 0,
    credit_limit:
      body.customer_type === 'b2b' && !body.credit_limit
        ? d.setting.default_credit_limit
        : body.credit_limit,
  }
  d.customer.push(row)
  audit('create', 'customer', row.customer_id, `Pelanggan baru ${row.customer_name}`)
  save(d)
  return clone(row)
}

/** GET /api/customers/by-phone/:phone — auto-pull data saat input antrian */
export async function findCustomerByPhone(phone) {
  await wait(120)
  const t = String(phone || '').replace(/\D/g, '')
  if (!t) return null
  const d = state()
  const c = d.customer.find((x) => (x.phone || '').replace(/\D/g, '') === t)
  return c ? clone(withRisk(c, d.setting)) : null
}

/** Status risiko customer: blacklist manual + otomatis dari piutang (BRD 6). */
export function withRisk(c, setting) {
  const limit = Number(c.credit_limit) || 0
  const ar = Number(c.outstanding) || 0
  const rasio = limit ? (ar / limit) * 100 : 0
  const otomatis = limit > 0 && rasio >= (setting?.ar_block_percent ?? 100)
  const level = c.blacklist_level || (otomatis ? 'blocked' : null)
  return {
    ...c,
    ar_ratio: round2(rasio),
    auto_blocked: otomatis,
    risk_level: level,
    risk_reason:
      c.blacklist_reason ||
      (otomatis ? `Piutang ${ar.toLocaleString('id-ID')} melampaui kredit limit` : null),
  }
}

/* ------------------------------------------------------------------ user mgmt */

/** GET /api/users */
export async function getUsers() {
  await wait(110)
  requireCap('master.user')
  return clone(state().user_account.map(({ password, ...u }) => ({ ...u, has_password: !!password })))
}

/** POST/PUT /api/users — hanya Owner */
export async function saveUser(payload) {
  await wait(200)
  requireCap('master.user')
  const d = state()
  const username = String(payload.username || '').trim().toLowerCase()
  if (!username) throw new Error('Username wajib diisi')
  if (!payload.full_name?.trim()) throw new Error('Nama lengkap wajib diisi')
  if (!ROLES.includes(payload.role)) throw new Error('Peran tidak dikenal')

  const bentrok = d.user_account.find(
    (u) => u.username === username && u.user_id !== Number(payload.user_id),
  )
  if (bentrok) throw new Error('Username sudah dipakai')

  if (payload.user_id) {
    const u = d.user_account.find((x) => x.user_id === Number(payload.user_id))
    if (!u) throw new Error('User tidak ditemukan')
    const perananLama = u.role
    Object.assign(u, {
      username,
      full_name: payload.full_name.trim(),
      role: payload.role,
      outlet_id: Number(payload.outlet_id) || u.outlet_id,
      cashier_id: payload.cashier_id ? Number(payload.cashier_id) : null,
      is_active: payload.is_active !== false,
    })
    if (payload.password) u.password = payload.password
    audit(
      'update',
      'user',
      u.user_id,
      perananLama !== u.role
        ? `Ubah peran ${u.username}: ${perananLama} → ${u.role}`
        : `Ubah user ${u.username}${payload.password ? ' (password direset)' : ''}`,
    )
    save(d)
    return clone({ ...u, password: undefined })
  }

  if (!payload.password) throw new Error('Password awal wajib diisi')
  const row = {
    user_id: ++d.sequences.user_id,
    username,
    password: payload.password,
    full_name: payload.full_name.trim(),
    role: payload.role,
    outlet_id: Number(payload.outlet_id) || 1,
    cashier_id: payload.cashier_id ? Number(payload.cashier_id) : null,
    is_active: payload.is_active !== false,
  }
  d.user_account.push(row)
  audit('create', 'user', row.user_id, `User baru ${row.username} sebagai ${row.role}`)
  save(d)
  return clone({ ...row, password: undefined })
}

/** DELETE /api/users/:id — Owner terakhir tidak boleh dihapus */
export async function deleteUser(id) {
  await wait(160)
  const me = requireCap('master.user')
  const d = state()
  const u = d.user_account.find((x) => x.user_id === Number(id))
  if (!u) throw new Error('User tidak ditemukan')
  if (u.user_id === me.user_id) throw new Error('Tidak dapat menghapus akun sendiri')
  if (u.role === 'Owner' && d.user_account.filter((x) => x.role === 'Owner').length <= 1)
    throw new Error('Minimal harus ada satu akun Owner')
  d.user_account = d.user_account.filter((x) => x.user_id !== u.user_id)
  audit('delete', 'user', u.user_id, `Hapus user ${u.username}`)
  save(d)
  return true
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
  const d = state()
  return clone(d.customer.map((c) => withRisk(c, d.setting)))
}

/** POST /api/customers | pintasan pendaftaran cepat dari layar kasir */
export async function createCustomer({ customer_name, phone = '', customer_type = 'retail' }) {
  return saveCustomer({ customer_name, phone, customer_type })
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
export async function takeQueue({ outlet_id, service_code, customer_name = '', phone = '' }) {
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

  // Input antrian via nomor HP (BRD 2): tarik data pelanggan bila terdaftar
  const digits = String(phone || '').replace(/\D/g, '')
  const pelanggan = digits
    ? d.customer.find((c) => (c.phone || '').replace(/\D/g, '') === digits)
    : null
  const risiko = pelanggan ? withRisk(pelanggan, d.setting) : null

  const ticket = {
    queue_id: ++d.sequences.queue_id,
    queue_number: generateQueueNumber(d, outlet.outlet_id, service.service_code, now),
    outlet_id: outlet.outlet_id,
    service_code: service.service_code,
    service_name: service.service_name,
    phone: digits || null,
    customer_id: pelanggan?.customer_id || null,
    customer_name: pelanggan?.customer_name || customer_name.trim() || null,
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

  return clone({
    ...ticket,
    outlet,
    customer: risiko,
    waiting_ahead: waitingAhead,
    estimate_minutes: waitingAhead * 4,
  })
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

  // Blokir order untuk customer blacklist / piutang lewat batas (BRD 6)
  const pelanggan = d.customer.find((c) => c.customer_id === (Number(payload.customer_id) || 1))
  const risiko = pelanggan ? withRisk(pelanggan, d.setting) : null
  if (risiko?.risk_level === 'blocked' && !payload.override_by)
    throw new Error(
      `Order ditolak: ${risiko.customer_name} berstatus blokir — ${risiko.risk_reason}. Butuh persetujuan supervisor.`,
    )

  // Pengunci margin minimal (BRD 2)
  const marginInfo = checkMargin(payload.lines, discount, d.setting.min_margin_percent)
  if (marginInfo.below_min && !payload.override_by)
    throw new Error(
      `Diskon melewati margin minimal ${d.setting.min_margin_percent}%. Maksimal diskon ${Math.floor(marginInfo.max_discount).toLocaleString('id-ID')}. Butuh approval supervisor.`,
    )

  const sla = estimateFinish(payload.lines, new Date(trxDate))

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
    hpp_total: marginInfo.hpp,
    margin_percent: marginInfo.margin_percent,
    lead_time_hours: sla.lead_time_hours,
    due_at: sla.due_at,
    approved_by: payload.override_by || null,
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

  if (payload.override_by)
    audit(
      'approve',
      'transaction',
      trx.trx_id,
      `Approval ${payload.override_by} atas ${trx.pos_number} (margin ${marginInfo.margin_percent}%${risiko?.risk_level === 'blocked' ? ', customer blokir' : ''})`,
    )
  audit('create', 'transaction', trx.trx_id, `Order ${trx.pos_number} — total ${trx.grand_total}`)

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
