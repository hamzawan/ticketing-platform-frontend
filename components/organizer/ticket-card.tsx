import { memo } from "react";
import { resolveQrSrc, type TicketItem } from "@/lib/api";

const TICKET_STATUS_STYLES: Record<string, string> = {
  entered: "bg-red-50 text-red-700",
  valid: "bg-emerald-50 text-emerald-700",
  active: "bg-emerald-50 text-emerald-700",
  issued: "bg-emerald-50 text-emerald-700",
  refunded: "bg-slate-100 text-slate-600",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold">{label}</div>
      <div className="text-xs break-all leading-snug">{value}</div>
    </div>
  );
}

export const TicketCard = memo(function TicketCard({
  ticket,
  onCheck,
}: {
  ticket: TicketItem;
  onCheck: (ticket: TicketItem) => void;
}) {
  const qrSrc = resolveQrSrc(ticket.qr_code);
  const status = (ticket.status ?? "").toLowerCase();

  return (
    <article className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col gap-4">
      <div className="aspect-square w-full max-w-52 mx-auto flex items-center justify-center">
        {qrSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrSrc}
            alt={`QR code for ticket ${ticket.ticket_code}`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain [image-rendering:pixelated]"
          />
        ) : (
          <div className="w-full h-full rounded-xl bg-secondary flex items-center justify-center text-xs text-muted-foreground">
            QR unavailable
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Field label="Ticket Code:" value={ticket.ticket_code} />
        <div>
          <div className="text-xs font-bold">Status:</div>
          <span
            className={`inline-block mt-1 text-xs font-semibold uppercase rounded-full px-3 py-1 ${
              TICKET_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"
            }`}
          >
            {ticket.status}
          </span>
        </div>
        <Field label="Ticket ID:" value={ticket.id} />
      </div>

      <button
        type="button"
        onClick={() => onCheck(ticket)}
        className="mt-auto w-full rounded-lg bg-[#1f1f1f] text-white text-sm py-2.5 hover:bg-black transition-colors"
      >
        Check Ticket
      </button>
    </article>
  );
});
