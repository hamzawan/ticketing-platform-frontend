export type TicketType = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  color: string;
};

export type BBAEvent = {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  status: "on-sale" | "draft" | "ended";
  capacity: number;
  sold: number;
  revenue: number;
  organizer: string;
  image: string;
  description: string;
  ticketTypes: TicketType[];
};

export type Order = {
  id: string;
  customer: string;
  email: string;
  event: string;
  tickets: number;
  amount: number;
  status: "completed" | "refunded" | "pending";
  date: string;
  type: string;
};

// The organizer currently signed in to this portal.
export const CURRENT_ORGANIZER = "Sarah Chen";

export const EVENTS: BBAEvent[] = [
  {
    id: "evt-001",
    name: "Summer Bounce Bash",
    date: "Jul 15, 2026",
    time: "10:00 AM",
    venue: "Houston Bounce Arena",
    city: "Houston, TX",
    status: "on-sale",
    capacity: 500,
    sold: 342,
    revenue: 17100,
    organizer: "Sarah Chen",
    image:
      "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&h=280&fit=crop&auto=format",
    description:
      "The biggest inflatable party of the summer! Bounce castles, obstacle courses, foam pits, and more. Fun for the whole family.",
    ticketTypes: [
      { id: "tt-1", name: "General Admission", price: 45, quantity: 300, sold: 221, color: "#2563EB" },
      { id: "tt-2", name: "VIP", price: 85, quantity: 100, sold: 87, color: "#F97316" },
      { id: "tt-3", name: "Family Pack (4)", price: 150, quantity: 100, sold: 34, color: "#10b981" },
    ],
  },
  {
    id: "evt-003",
    name: "Mega Bounce Weekend",
    date: "Sep 20, 2026",
    time: "11:00 AM",
    venue: "Austin Park",
    city: "Austin, TX",
    status: "draft",
    capacity: 800,
    sold: 0,
    revenue: 0,
    organizer: "Sarah Chen",
    image:
      "https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=600&h=280&fit=crop&auto=format",
    description:
      "Two full days of bouncing fun. The largest event we have ever organized — 30+ inflatables across 5 zones.",
    ticketTypes: [],
  },
  {
    id: "evt-002",
    name: "Kids Bounce Bonanza",
    date: "Aug 3, 2026",
    time: "9:00 AM",
    venue: "Dallas Convention Center",
    city: "Dallas, TX",
    status: "on-sale",
    capacity: 300,
    sold: 189,
    revenue: 8505,
    organizer: "Mike Torres",
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=280&fit=crop&auto=format",
    description:
      "A whole day of fun and excitement for kids of all ages. Slides, bouncy castles, and foam pits galore!",
    ticketTypes: [
      { id: "tt-4", name: "Child (under 12)", price: 35, quantity: 200, sold: 142, color: "#2563EB" },
      { id: "tt-5", name: "Adult (spectator)", price: 20, quantity: 100, sold: 47, color: "#F97316" },
    ],
  },
];

export const ORDERS: Order[] = [
  { id: "ORD-8821", customer: "Alex Johnson", email: "alex@email.com", event: "Summer Bounce Bash", tickets: 2, amount: 90, status: "completed", date: "Jun 12, 2026", type: "General Admission" },
  { id: "ORD-8820", customer: "Taylor Smith", email: "taylor@email.com", event: "Kids Bounce Bonanza", tickets: 3, amount: 125, status: "completed", date: "Jun 12, 2026", type: "Child (under 12)" },
  { id: "ORD-8819", customer: "Jordan Lee", email: "jordan@email.com", event: "Summer Bounce Bash", tickets: 1, amount: 85, status: "refunded", date: "Jun 11, 2026", type: "VIP" },
  { id: "ORD-8818", customer: "Morgan Davis", email: "morgan@email.com", event: "Summer Bounce Bash", tickets: 4, amount: 180, status: "completed", date: "Jun 11, 2026", type: "Family Pack (4)" },
  { id: "ORD-8817", customer: "Casey Wilson", email: "casey@email.com", event: "Kids Bounce Bonanza", tickets: 2, amount: 70, status: "completed", date: "Jun 10, 2026", type: "Child (under 12)" },
  { id: "ORD-8816", customer: "Riley Brown", email: "riley@email.com", event: "Bounce & Brunch", tickets: 2, amount: 90, status: "completed", date: "Jun 8, 2026", type: "Standard" },
  { id: "ORD-8815", customer: "Sam Green", email: "sam@email.com", event: "Summer Bounce Bash", tickets: 1, amount: 45, status: "pending", date: "Jun 8, 2026", type: "General Admission" },
];

export function myEvents() {
  return EVENTS.filter((e) => e.organizer === CURRENT_ORGANIZER);
}

export function myOrders() {
  const eventNames = new Set(myEvents().map((e) => e.name));
  return ORDERS.filter((o) => eventNames.has(o.event));
}
