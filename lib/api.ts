export type DashboardLatestEvent = {
  id: string;
  name: string;
  event_date: string;
  venue: string;
  city: string;
  total_tickets: number;
  tickets_sold: number;
  revenue: string;
};

export type DashboardLatestBooking = {
  id: string;
  customer_name: string;
  event_name: string;
  ticket_type_name: string;
  payment_amount: string;
  payment_status: string;
};

export type DashboardResponse = {
  total_revenue: string;
  current_month_revenue: string;
  previous_month_revenue: string;
  revenue_change_percent: string;
  total_tickets_sold: number;
  total_events: number;
  total_team_members: number;
  latest_events: DashboardLatestEvent[];
  latest_bookings: DashboardLatestBooking[];
};

export const ACCESS_TOKEN_STORAGE_KEY = "access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "refresh_token";
export const USER_STORAGE_KEY = "auth_user";

// Base URL only (no secret), safe to expose to the client bundle since this
// endpoint is now called directly from the browser with a bearer token read
// from localStorage.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://146.190.141.95";

// Uploaded images (e.g. an event's first_image) can come back as a
// server-relative path (e.g. "/media/events/xyz.jpg") rather than an
// absolute URL — the browser would otherwise try to load that against the
// frontend's own origin and fail. This resolves it against the API host.
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== "string") return null;
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

// An event's `images` entries aren't guaranteed to be plain strings — some
// endpoints wrap each image as an object (e.g. { id, image }) instead. This
// pulls out whatever URL is actually there and resolves it the same way.
export function extractImageUrl(image: unknown): string | null {
  if (typeof image === "string") return resolveMediaUrl(image);
  if (image && typeof image === "object") {
    const { image: imageField, url, file } = image as Record<string, unknown>;
    const candidate = imageField ?? url ?? file;
    if (typeof candidate === "string") return resolveMediaUrl(candidate);
  }
  return null;
}

export type AuthProfile = {
  id: number;
  name: string | null;
  gender: string | null;
  age: number | null;
  created_at: string;
  updated_at: string;
  date_of_birth: string | null;
  image: string | null;
  phone_number: string | null;
};

export type AuthUser = {
  id: number;
  email: string;
  role: string;
  profile: AuthProfile;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readErrorDetail(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string" && data.detail.trim()) return data.detail;

    // FastAPI validation errors: { detail: [{ loc: ["body", "field"], msg, type }, ...] }
    if (Array.isArray(data?.detail)) {
      const messages = (data.detail as unknown[])
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const { loc, msg } = item as { loc?: unknown[]; msg?: string };
          if (typeof msg !== "string" || !msg.trim()) return null;
          const field = Array.isArray(loc) ? loc.filter((p) => p !== "body").join(".") : "";
          return field ? `${field}: ${msg}` : msg;
        })
        .filter((m): m is string => Boolean(m));
      if (messages.length) return messages.join(" ");
    }

    // DRF-style validation errors come back as { field: ["message", ...] }
    // rather than { detail }. Flatten those into one readable string.
    if (data && typeof data === "object") {
      const messages = Object.entries(data as Record<string, unknown>).flatMap(([field, value]) => {
        const texts = Array.isArray(value) ? value : [value];
        return texts
          .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
          .map((t) => (field === "non_field_errors" ? t : `${field}: ${t}`));
      });
      if (messages.length) return messages.join(" ");
    }
  } catch {
    // Body wasn't JSON (or was empty) — fall through to the generic message.
  }
  return fallback;
}

export async function registerOrganizer(payload: {
  email: string;
  password1: string;
  password2: string;
}): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/register/organizer/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new ApiError(await readErrorDetail(res, "Sign up failed. Please try again."), res.status);
  }

  return res.json() as Promise<AuthUser>;
}

export async function loginOrganizer(payload: { email: string; password: string }): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new ApiError(await readErrorDetail(res, "Invalid credentials."), res.status);
  }

  return res.json() as Promise<LoginResponse>;
}

export async function getDashboard(token?: string | null): Promise<DashboardResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/organizer/dashboard/`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Dashboard request failed with status ${res.status}`);
  }

  return res.json() as Promise<DashboardResponse>;
}

// ─────────────────────────────────────────────────────────────────────────
// Arbitrary-precision numeric-string formatting.
//
// The dashboard API returns revenue/percent fields as decimal strings that
// can run to 70-100+ digits with leading zeros and an explicit +/- sign
// (e.g. "+00000000000468679888210134140784963843693294706902079081057154782
// 427054782824356052690.758607292348015017622453380711380337501"). Numbers
// like that are far beyond what an IEEE-754 double can represent exactly
// (~15-17 significant digits) — routing them through Number()/parseFloat()
// silently truncates precision or rounds them into a different value. Every
// helper below therefore works on the raw string only: strip the sign,
// strip leading zeros, group the integer part, clip the fraction to 2
// digits. No Number()/parseFloat() anywhere in this section.
// ─────────────────────────────────────────────────────────────────────────

type ParsedAmount = { negative: boolean; formatted: string; isZero: boolean };

function parseAmountString(value: string | number | null | undefined): ParsedAmount {
  if (value == null || value === "") return { negative: false, formatted: "0.00", isZero: true };

  let str = String(value).trim();
  let negative = false;
  if (str.startsWith("-")) {
    negative = true;
    str = str.slice(1);
  } else if (str.startsWith("+")) {
    str = str.slice(1);
  }

  const [intRaw, fracRaw] = str.split(".");
  let intPart = (intRaw ?? "0").replace(/^0+(?=\d)/, "");
  if (intPart === "") intPart = "0";
  const fracPart = (fracRaw ?? "").padEnd(2, "0").slice(0, 2);
  const isZero = intPart === "0" && !/[1-9]/.test(fracRaw ?? "");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return { negative: negative && !isZero, formatted: `${withCommas}.${fracPart}`, isZero };
}

/** Signed currency string, e.g. "$8,715,912,948,726,270,007,534,212,116,987,078,178.13". */
export function formatMoney(value: string | number | null | undefined, symbol = "$"): string {
  const { negative, formatted } = parseAmountString(value);
  return `${negative ? "-" : ""}${symbol}${formatted}`;
}

/** Unsigned percent magnitude, e.g. "14.20%" — pair with `isNegativeAmount` for direction. */
export function formatPercent(value: string | number | null | undefined): string {
  const { formatted } = parseAmountString(value);
  return `${formatted}%`;
}

/** True if the string represents a negative, non-zero amount. */
export function isNegativeAmount(value: string | number | null | undefined): boolean {
  return parseAmountString(value).negative;
}

/** True if the string contains any non-zero digit — safe positivity check for values of any size. */
export function hasPositiveAmount(value: string | number | null | undefined): boolean {
  if (value == null || value === "") return false;
  return /[1-9]/.test(String(value));
}

// Safe ONLY for small integer fields the API guarantees are ordinary JS
// numbers (ticket/event/member counts). Never use this on revenue, amount,
// or percent fields — see the arbitrary-precision helpers above.
export function toNumber(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// For date-only fields (e.g. "2026-10-07", no time component). Parsing that
// through `new Date()`/formatDate treats it as UTC midnight, which can
// display as the previous day once toLocaleDateString converts to the
// viewer's local timezone — so this parses the y/m/d parts directly into a
// local-time Date instead of going through UTC.
export function formatEventDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export type EventTicketType = {
  id: string;
  session_id: string;
  name: string;
  price: string;
  quantity: number;
  available_quantity: number;
};

export type OrganizerEvent = {
  id: string;
  name: string;
  description: string;
  venue: string;
  city: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  min_age: number | null;
  max_age: number | null;
  status: string;
  // Not guaranteed to be plain strings — see extractImageUrl().
  images: unknown[];
  ticket_types: EventTicketType[];
  sessions: unknown[];
  created_by: number;
  created_at: string;
  updated_at: string;
  total_tickets: number;
  available_tickets: number;
};

export async function getEvents(token?: string | null): Promise<OrganizerEvent[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/events/list/`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new ApiError(await readErrorDetail(res, "Failed to load events."), res.status);
  }

  return res.json() as Promise<OrganizerEvent[]>;
}

export type MyEventListItem = {
  id: string;
  name: string;
  first_image: string | null;
  event_date: string;
  start_time: string | null;
  venue: string;
  city: string | null;
  ticket_types_count: number;
  total_tickets: number;
  tickets_sold: number;
  status: string;
};

export type MyEventsListResponse = {
  page: number;
  page_size: number;
  total: number;
  results: MyEventListItem[];
};

export async function getMyEvents(token?: string | null): Promise<MyEventsListResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/organizer/my-events/list/`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new ApiError(await readErrorDetail(res, "Failed to load events."), res.status);
  }

  return res.json() as Promise<MyEventsListResponse>;
}

export type CreateEventPayload = {
  name: string;
  venue: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  ticket_types: string | null;
  sessions: string | null;
  description: string | null;
  city: string | null;
  min_age: number | null;
  max_age: number | null;
  images: File[];
};

// Sent as multipart/form-data, not JSON: this endpoint accepts image
// uploads alongside the other fields, and a FastAPI route built with
// Form()/File() params reads the whole body as null when it receives
// application/json instead — which is exactly the "field required" /
// "input": null validation error this fixes. Shared by create and update
// since both send the same field set.
function buildEventFormData(payload: CreateEventPayload): FormData {
  const body = new FormData();
  body.append("name", payload.name);
  body.append("venue", payload.venue);
  if (payload.event_date) body.append("event_date", payload.event_date);
  if (payload.start_time) body.append("start_time", payload.start_time);
  if (payload.end_time) body.append("end_time", payload.end_time);
  if (payload.ticket_types) body.append("ticket_types", payload.ticket_types);
  if (payload.sessions) body.append("sessions", payload.sessions);
  if (payload.description) body.append("description", payload.description);
  if (payload.city) body.append("city", payload.city);
  if (payload.min_age != null) body.append("min_age", String(payload.min_age));
  if (payload.max_age != null) body.append("max_age", String(payload.max_age));
  for (const image of payload.images) body.append("images", image, image.name);
  return body;
}

export async function createEvent(payload: CreateEventPayload, token?: string | null): Promise<OrganizerEvent> {
  const res = await fetch(`${API_BASE_URL}/api/v1/events/create/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: buildEventFormData(payload),
  });

  if (!res.ok) {
    throw new ApiError(await readErrorDetail(res, "Failed to create event. Please try again."), res.status);
  }

  return res.json() as Promise<OrganizerEvent>;
}

export async function updateEvent(
  eventId: string,
  payload: CreateEventPayload,
  token?: string | null,
): Promise<OrganizerEvent> {
  const res = await fetch(`${API_BASE_URL}/api/v1/events/${eventId}/update/`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: buildEventFormData(payload),
  });

  if (!res.ok) {
    throw new ApiError(await readErrorDetail(res, "Failed to update event. Please try again."), res.status);
  }

  return res.json() as Promise<OrganizerEvent>;
}

export async function publishEvent(eventId: string, token?: string | null): Promise<OrganizerEvent> {
  const res = await fetch(`${API_BASE_URL}/api/v1/events/${eventId}/publish/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new ApiError(await readErrorDetail(res, "Failed to publish event. Please try again."), res.status);
  }

  return res.json() as Promise<OrganizerEvent>;
}
