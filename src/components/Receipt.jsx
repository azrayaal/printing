import { formatDateTime, rupiah } from '../utils/format'

const Row = ({ label, value, bold }) => (
  <div className={'flex justify-between ' + (bold ? 'font-bold' : '')}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
)

/**
 * Struk thermal 80mm. Elemen ini yang dipakai window.print() —
 * lihat aturan @media print di src/index.css.
 */
export default function Receipt({ trx, printType = 'original', copyNumber = 1, printable = true }) {
  if (!trx) return null
  const reprint = printType === 'reprint'

  return (
    <div
      id={printable ? 'receipt-print' : undefined}
      className={'receipt mx-auto shadow-card' + (printable ? '' : ' no-print')}
    >
      {reprint && (
        <div className="mb-1 border-2 border-black py-1 text-center">
          <p className="text-[15px] font-bold tracking-widest">** REPRINT **</p>
          <p className="text-[10px]">COPY #{copyNumber} &mdash; BUKAN STRUK ASLI</p>
        </div>
      )}

      <div className="rule-double" />
      <div className="text-center">
        <p className="text-[14px] font-bold uppercase tracking-wide">{trx.outlet.outlet_name}</p>
        <p>{trx.outlet.address}</p>
        <p>Telp. {trx.outlet.phone || '-'}</p>
      </div>
      <div className="rule-double" />

      <Row label="No. POS" value={trx.pos_number} />
      {trx.queue_number && <Row label="No. Antrian" value={trx.queue_number} />}
      <Row label="Tanggal" value={formatDateTime(trx.trx_date)} />
      <Row label="Kasir" value={trx.cashier.cashier_name} />
      <Row label="Pelanggan" value={trx.customer?.customer_name || 'Umum'} />

      <hr />
      <div className="flex justify-between text-[10px] font-bold uppercase">
        <span>No / Item</span>
        <span>Subtotal</span>
      </div>
      <hr />

      {trx.lines.map((l) => (
        <div key={l.line_id ?? l.line_number} className="mb-1">
          <p>
            {l.line_number}. {l.item_name}
          </p>
          <div className="flex justify-between">
            <span>
              &nbsp;&nbsp;{Number(l.qty)} {l.uom} x {rupiah(l.unit_price)}
            </span>
            <span>{rupiah(l.subtotal_line)}</span>
          </div>
          {Number(l.discount_line) > 0 && (
            <Row label="&nbsp;&nbsp;Diskon item" value={'-' + rupiah(l.discount_line)} />
          )}
        </div>
      ))}

      <hr />
      <Row label="Subtotal" value={rupiah(trx.subtotal)} />
      <Row label="Diskon" value={rupiah(trx.discount)} />
      <Row label="Pajak (11%)" value={rupiah(trx.tax)} />
      <div className="my-1 border-t border-black" />
      <Row label="TOTAL" value={rupiah(trx.grand_total)} bold />
      <Row label={`Bayar (${trx.payment_method.toUpperCase()})`} value={rupiah(trx.paid_amount)} />
      <Row label="Kembali" value={rupiah(trx.change_amount)} />
      <hr />

      <div className="text-center">
        <p className="font-bold">Terima Kasih</p>
        <p>Barang yang sudah dibeli tidak dapat ditukar</p>
      </div>
      <div className="rule-double" />
      <p className="text-center text-[9px]">
        {trx.pos_number} / copy {copyNumber}
      </p>
    </div>
  )
}
