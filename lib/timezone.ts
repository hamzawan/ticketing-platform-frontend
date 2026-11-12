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
