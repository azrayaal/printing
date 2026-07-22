import { formatDateTime } from '../utils/format'

/**
 * Tiket antrian thermal 80mm. Memakai id yang sama dengan struk
 * (#receipt-print) agar aturan @media print di index.css berlaku.
 */
export default function QueueTicket({ ticket, printable = true }) {
  if (!ticket) return null

  return (
    <div
      id={printable ? 'receipt-print' : undefined}
      className={'receipt mx-auto text-center shadow-card' + (printable ? '' : ' no-print')}
    >
      <div className="rule-double" />
      <p className="text-[13px] font-bold uppercase">{ticket.outlet?.outlet_name}</p>
      <p>{ticket.outlet?.address}</p>
      <div className="rule-double" />

      <p className="mt-1 text-[11px] uppercase tracking-widest">Nomor Antrian</p>
      <p className="my-1 text-[46px] font-bold leading-none tracking-tight">
        {ticket.queue_number}
      </p>
      <p className="text-[12px] font-bold uppercase">{ticket.service_name}</p>

      <hr />
      <div className="flex justify-between text-left">
        <span>Waktu</span>
        <span>{formatDateTime(ticket.created_at)}</span>
      </div>
      <div className="flex justify-between text-left">
        <span>Menunggu</span>
        <span>{ticket.waiting_ahead ?? 0} antrian</span>
      </div>
      <div className="flex justify-between text-left">
        <span>Estimasi</span>
        <span>~{ticket.estimate_minutes ?? 0} menit</span>
      </div>
      {ticket.customer_name && (
        <div className="flex justify-between text-left">
          <span>Nama</span>
          <span>{ticket.customer_name}</span>
        </div>
      )}
      <hr />

      <p className="font-bold">Mohon menunggu dipanggil</p>
      <p>Perhatikan layar nomor antrian</p>
      <div className="rule-double" />
    </div>
  )
}
