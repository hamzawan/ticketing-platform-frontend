// Google Maps iframe embed URLs (Share → Embed a map) work as-is. Share → Copy
// links (maps.app.goo.gl) can't be framed, so they are resolved to an embed URL.
export const isEmbedUrl = (v: string) => /^https:\/\/(www\.|maps\.)?google\.com\/maps(\/embed|\?.*output=embed)/.test(v);
export const isShortUrl = (v: string) => /^https:\/\/maps\.app\.goo\.gl\/[\w-]+$/.test(v);
export const MAP_URL_ERROR = "Enter a Google Maps embed URL or a share link (https://maps.app.goo.gl/…).";
