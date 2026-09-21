export function GET() {
  const root = new URL(import.meta.env.BASE_URL.replace(/\/?$/, '/'), 'https://auradio.kangqiovo.com/');
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', root)}\n`, {headers: {'Content-Type': 'text/plain; charset=utf-8'}});
}
