// A zone's UTC offset in January and July of the current year. Two IANA zones
// with the same pair follow the same clock (including DST), so one can stand in
// for the other (e.g. America/Boise -> America/Denver).
function offsetSignature(timeZone: string): string | null {
  try {
    const year = new Date().getFullYear();
    return [0, 6]
      .map((month) => {
        const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(
          new Date(Date.UTC(year, month, 15, 12)),
        );
        return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
      })
      .join("|");
  } catch {
    return null;
  }
}

// Picks the zones in `allowed` that keep the same time as `zone`.
export function matchAllowedZones(zone: string, allowed: string[]): string[] {
  if (allowed.includes(zone)) return [zone];
  const sig = offsetSignature(zone);
  if (!sig) return [];
  return allowed.filter((a) => offsetSignature(a) === sig);
}

// Abbreviations Intl doesn't give in en-US (it falls back to "GMT+5" outside North America).
const ZONE_ABBR: Record<string, string> = {
  "Asia/Karachi": "PKT",
  "Asia/Kolkata": "IST",
  "Asia/Calcutta": "IST",
  "Asia/Dhaka": "BST",
  "Asia/Dubai": "GST",
  "Asia/Riyadh": "AST",
  "Asia/Tokyo": "JST",
  "Asia/Seoul": "KST",
  "Asia/Shanghai": "CST",
  "Asia/Hong_Kong": "HKT",
  "Asia/Singapore": "SGT",
  "Asia/Manila": "PST",
  "Asia/Jakarta": "WIB",
  "Asia/Bangkok": "ICT",
  "Europe/London": "GMT/BST",
  "Europe/Paris": "CET",
  "Europe/Berlin": "CET",
  "Europe/Madrid": "CET",
  "Europe/Rome": "CET",
  "Europe/Amsterdam": "CET",
  "Europe/Istanbul": "TRT",
  "Europe/Moscow": "MSK",
  "Africa/Cairo": "EET",
  "Africa/Lagos": "WAT",
  "Africa/Nairobi": "EAT",
  "Africa/Johannesburg": "SAST",
  "Australia/Sydney": "AEST/AEDT",
  "Australia/Melbourne": "AEST/AEDT",
  "Australia/Perth": "AWST",
  "Pacific/Auckland": "NZST/NZDT",
};

// Short name for a timezone at a given moment, e.g. "CST", "PKT". Where Intl would only say
// "GMT+5", use the well-known abbreviation, else the full name ("Pakistan Standard Time").
export function zoneAbbreviation(timeZone: string, at: Date): string | undefined {
  const name = (style: "short" | "long") =>
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: style }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value;
  try {
    const short = name("short");
    if (short && !/^(GMT|UTC)[+-−]/.test(short)) return short;
    return ZONE_ABBR[timeZone] ?? name("long") ?? short;
  } catch {
    return undefined;
  }
}
