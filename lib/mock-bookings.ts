// Temporary mock data for the Bookings screen (copied from the Figma design)
// until the bookings API is available.

export type Booking = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  eventId: string;
  eventName: string;
  ticketTypeName: string;
  quantity: number;
  totalAmount: number;
  bookingDate: string;
  status: "confirmed" | "cancelled" | "pending";
};

export type BookingEventOption = { id: string; name: string };

// The organizer's events, as used for the Bookings event filter in Figma.
export const BOOKING_EVENT_OPTIONS: BookingEventOption[] = [
  { id: "evt-001", name: "Summer Bounce Bash" },
  { id: "evt-003", name: "Mega Bounce Weekend" },
];

export const BOOKINGS: Booking[] = [
  { id: "BK-1001", customerId: "c1", customerName: "Alex Johnson", customerEmail: "alex@email.com", eventId: "evt-001", eventName: "Summer Bounce Bash", ticketTypeName: "General Admission", quantity: 2, totalAmount: 90, bookingDate: "2026-06-12", status: "confirmed" },
  { id: "BK-1002", customerId: "c2", customerName: "Taylor Smith", customerEmail: "taylor@email.com", eventId: "evt-002", eventName: "Kids Bounce Bonanza", ticketTypeName: "Child (under 12)", quantity: 3, totalAmount: 105, bookingDate: "2026-06-12", status: "confirmed" },
  { id: "BK-1003", customerId: "c3", customerName: "Jordan Lee", customerEmail: "jordan@email.com", eventId: "evt-001", eventName: "Summer Bounce Bash", ticketTypeName: "VIP", quantity: 1, totalAmount: 85, bookingDate: "2026-06-11", status: "cancelled" },
  { id: "BK-1004", customerId: "c4", customerName: "Morgan Davis", customerEmail: "morgan@email.com", eventId: "evt-001", eventName: "Summer Bounce Bash", ticketTypeName: "Family Pack (4)", quantity: 4, totalAmount: 150, bookingDate: "2026-06-11", status: "confirmed" },
  { id: "BK-1005", customerId: "c5", customerName: "Casey Wilson", customerEmail: "casey@email.com", eventId: "evt-002", eventName: "Kids Bounce Bonanza", ticketTypeName: "Child (under 12)", quantity: 2, totalAmount: 70, bookingDate: "2026-06-10", status: "confirmed" },
  { id: "BK-1006", customerId: "c6", customerName: "Riley Brown", customerEmail: "riley@email.com", eventId: "evt-004", eventName: "Bounce & Brunch", ticketTypeName: "Standard", quantity: 2, totalAmount: 90, bookingDate: "2026-06-08", status: "confirmed" },
  { id: "BK-1007", customerId: "c7", customerName: "Sam Green", customerEmail: "sam@email.com", eventId: "evt-001", eventName: "Summer Bounce Bash", ticketTypeName: "General Admission", quantity: 1, totalAmount: 45, bookingDate: "2026-06-08", status: "pending" },
  { id: "BK-1008", customerId: "c8", customerName: "Dana Hall", customerEmail: "dana@email.com", eventId: "evt-001", eventName: "Summer Bounce Bash", ticketTypeName: "VIP", quantity: 2, totalAmount: 170, bookingDate: "2026-06-07", status: "confirmed" },
  { id: "BK-1009", customerId: "c9", customerName: "Quinn Park", customerEmail: "quinn@email.com", eventId: "evt-002", eventName: "Kids Bounce Bonanza", ticketTypeName: "Adult (spectator)", quantity: 1, totalAmount: 20, bookingDate: "2026-06-06", status: "confirmed" },
  { id: "BK-1010", customerId: "c10", customerName: "Blake Turner", customerEmail: "blake@email.com", eventId: "evt-004", eventName: "Bounce & Brunch", ticketTypeName: "Standard", quantity: 3, totalAmount: 135, bookingDate: "2026-06-05", status: "confirmed" },
  { id: "BK-1011", customerId: "c11", customerName: "Avery Collins", customerEmail: "avery@email.com", eventId: "evt-001", eventName: "Summer Bounce Bash", ticketTypeName: "General Admission", quantity: 2, totalAmount: 90, bookingDate: "2026-06-04", status: "confirmed" },
  { id: "BK-1012", customerId: "c12", customerName: "Peyton Hayes", customerEmail: "peyton@email.com", eventId: "evt-002", eventName: "Kids Bounce Bonanza", ticketTypeName: "Child (under 12)", quantity: 4, totalAmount: 140, bookingDate: "2026-06-03", status: "confirmed" },
  { id: "BK-1013", customerId: "c13", customerName: "Logan Reed", customerEmail: "logan@email.com", eventId: "evt-001", eventName: "Summer Bounce Bash", ticketTypeName: "Family Pack (4)", quantity: 4, totalAmount: 150, bookingDate: "2026-06-02", status: "cancelled" },
  { id: "BK-1014", customerId: "c14", customerName: "Harper Brooks", customerEmail: "harper@email.com", eventId: "evt-003", eventName: "Mega Bounce Weekend", ticketTypeName: "General Admission", quantity: 2, totalAmount: 40, bookingDate: "2026-07-15", status: "pending" },
  { id: "BK-1015", customerId: "c15", customerName: "Reese Morgan", customerEmail: "reese@email.com", eventId: "evt-002", eventName: "Kids Bounce Bonanza", ticketTypeName: "Adult (spectator)", quantity: 2, totalAmount: 40, bookingDate: "2026-06-01", status: "confirmed" },
  { id: "BK-1016", customerId: "c16", customerName: "Jordan Kim", customerEmail: "jkim@email.com", eventId: "evt-001", eventName: "Summer Bounce Bash", ticketTypeName: "VIP", quantity: 1, totalAmount: 85, bookingDate: "2026-05-30", status: "confirmed" },
  { id: "BK-1017", customerId: "c17", customerName: "Skyler Nguyen", customerEmail: "skyler@email.com", eventId: "evt-004", eventName: "Bounce & Brunch", ticketTypeName: "Standard", quantity: 1, totalAmount: 45, bookingDate: "2026-05-28", status: "confirmed" },
  { id: "BK-1018", customerId: "c18", customerName: "Cameron West", customerEmail: "cam@email.com", eventId: "evt-002", eventName: "Kids Bounce Bonanza", ticketTypeName: "Child (under 12)", quantity: 3, totalAmount: 105, bookingDate: "2026-05-25", status: "confirmed" },
];
