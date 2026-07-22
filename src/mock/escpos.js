/**
 * Pembentuk raw ESC/POS command | bukti konsep untuk printer thermal fisik.
 * Di backend nanti string ini bisa dikirim langsung ke printer via
 * node-thermal-printer / net socket ke port 9100.
 */
import { formatDateTime, rupiah } from '../utils/format'

const ESC = '\x1B'
const GS = '\x1D'

const CMD = {
  INIT: ESC + '@',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  SIZE_DOUBLE: GS + '!' + '\x11',
  SIZE_NORMAL: GS + '!' + '\x00',
  FEED: '\x0A',
  CUT: GS + 'V' + '\x42' + '\x00',
  DRAWER: ESC + 'p' + '\x00' + '\x19' + '\xFA',
}

const WIDTH = 32 // karakter per baris pada font A, kertas 80mm

const line = (ch = '-') => ch.repeat(WIDTH)
const pad = (left, right) =>
  left + ' '.repeat(Math.max(1, WIDTH - left.length - right.length)) + right

export function buildEscPos(trx, printType = 'original') {
  const out = []
  const push = (s = '') => out.push(s + CMD.FEED)

  out.push(CMD.INIT)
  out.push(CMD.ALIGN_CENTER)

  if (printType === 'reprint') {
    out.push(CMD.BOLD_ON + CMD.SIZE_DOUBLE)
    push('** REPRINT **')
    out.push(CMD.SIZE_NORMAL + CMD.BOLD_OFF)
  }

  out.push(CMD.BOLD_ON + CMD.SIZE_DOUBLE)
  push(trx.outlet.outlet_name.toUpperCase())
  out.push(CMD.SIZE_NORMAL + CMD.BOLD_OFF)
  push(trx.outlet.address || '')
  push('Telp. ' + (trx.outlet.phone || '-'))
  out.push(CMD.ALIGN_LEFT)
  push(line('='))
  push(pad('No. POS', trx.pos_number))
  if (trx.queue_number) push(pad('No. Antrian', trx.queue_number))
  push(pad('Tanggal', formatDateTime(trx.trx_date)))
  push(pad('Kasir', trx.cashier.cashier_name))
  push(pad('Pelanggan', trx.customer?.customer_name || 'Umum'))
  push(line('-'))

  trx.lines.forEach((l) => {
    push(`${l.line_number}. ${l.item_name}`.slice(0, WIDTH))
    push(pad(`   ${l.qty} ${l.uom} x ${rupiah(l.unit_price)}`, rupiah(l.subtotal_line)))
    if (Number(l.discount_line) > 0) push(pad('   Diskon item', '-' + rupiah(l.discount_line)))
  })

  push(line('-'))
  push(pad('Subtotal', rupiah(trx.subtotal)))
  push(pad('Diskon', rupiah(trx.discount)))
  push(pad('Pajak (11%)', rupiah(trx.tax)))
  out.push(CMD.BOLD_ON)
  push(pad('TOTAL', rupiah(trx.grand_total)))
  out.push(CMD.BOLD_OFF)
  push(pad(`Bayar (${trx.payment_method.toUpperCase()})`, rupiah(trx.paid_amount)))
  push(pad('Kembali', rupiah(trx.change_amount)))
  push(line('-'))

  out.push(CMD.ALIGN_CENTER)
  push('Terima Kasih')
  push('Barang yang sudah dibeli')
  push('tidak dapat ditukar')
  push(line('='))
  push()
  push()
  out.push(CMD.CUT)

  return out.join('')
}

/** Raw ESC/POS untuk tiket antrian (kertas 80mm, nomor dicetak ukuran ganda). */
export function buildQueueEscPos(ticket) {
  const out = []
  const push = (s = '') => out.push(s + CMD.FEED)

  out.push(CMD.INIT, CMD.ALIGN_CENTER)
  out.push(CMD.BOLD_ON)
  push(ticket.outlet.outlet_name.toUpperCase())
  out.push(CMD.BOLD_OFF)
  push(ticket.outlet.address || '')
  push(line('='))
  push('NOMOR ANTRIAN')
  out.push(CMD.BOLD_ON + GS + '!' + '\x33') // lebar & tinggi 4x
  push(ticket.queue_number)
  out.push(CMD.SIZE_NORMAL + CMD.BOLD_OFF)
  push(ticket.service_name.toUpperCase())
  push(line('-'))
  out.push(CMD.ALIGN_LEFT)
  push(pad('Waktu', formatDateTime(ticket.created_at)))
  push(pad('Menunggu', `${ticket.waiting_ahead ?? 0} antrian`))
  push(pad('Estimasi', `~${ticket.estimate_minutes ?? 0} menit`))
  push(line('-'))
  out.push(CMD.ALIGN_CENTER)
  push('Mohon menunggu dipanggil')
  push(line('='))
  push()
  out.push(CMD.CUT)

  return out.join('')
}

/** Versi yang bisa dibaca manusia | escape byte kontrol jadi <HEX>. */
export function escPosPreview(raw) {
  return raw.replace(/[\x00-\x1F]/g, (c) => {
    if (c === '\x0A') return '\n'
    return `<${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}>`
  })
}
