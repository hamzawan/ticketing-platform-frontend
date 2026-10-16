import { isShortUrl } from "@/lib/google-maps";

// A maps.app.goo.gl link is a redirect to the full place URL, which browsers
// can't read cross-origin. Follow that single redirect here and turn the place
// into an embeddable URL. Only short links are fetched, and the redirect target
// must be google.com/maps, so this can't be used as an open proxy.
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  if (!isShortUrl(url)) return Response.json({ error: "Not a Google Maps share link." }, { status: 400 });

  const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000), cache: "no-store" }).catch(() => null);
  const target = res?.headers.get("location") ?? "";
  if (!target.startsWith("https://www.google.com/maps/")) {
    return Response.json({ error: "Couldn't read a location from this link." }, { status: 422 });
  }

  const path = decodeURIComponent(target.split("?")[0]);
  const pin = path.match(/!3d(-?[\d.]+)!4d(-?[\d.]+)/); // exact pin of the place
  const name = path.match(/\/maps\/place\/([^/@]+)/);
  const query = pin ? `${pin[1]},${pin[2]}` : name?.[1].replace(/\+/g, " ");
  if (!query) return Response.json({ error: "Couldn't read a location from this link." }, { status: 422 });

  return Response.json({ url: `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed` });
}
