export function GET() {
  const root = new URL(import.meta.env.BASE_URL.replace(/\/?$/, '/'), 'https://auradio.kangqiovo.com/');
  const paths = ['', 'experience/', 'progress/', 'privacy/', 'credits/'];
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${new URL(path, root)}</loc></url>`).join('')}</urlset>`;
  return new Response(body, {headers: {'Content-Type': 'application/xml; charset=utf-8'}});
}
