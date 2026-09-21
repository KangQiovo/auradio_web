"""Verify the deployed site over HTTPS without credentials or TLS exceptions."""
from __future__ import annotations
import argparse
import json
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

parser = argparse.ArgumentParser()
parser.add_argument('--url', required=True)
parser.add_argument('--sha', required=True)
parser.add_argument('--output', default='live-check.json')
args = parser.parse_args()
base = args.url.rstrip('/') + '/'
assert base == 'https://auradio.kangqiovo.com/', f'Unexpected Pages URL: {base}'
assert len(args.sha) == 40 and all(c in '0123456789abcdef' for c in args.sha)
results = []


def fetch(path, maximum=4_000_000):
    url = urljoin(base, path)
    assert urlparse(url).netloc == urlparse(base).netloc, f'External asset: {url}'
    last_error = None
    for attempt in range(4):
        try:
            request = Request(url, headers={'User-Agent':'Auradio-Deployment-Check/1.0','Cache-Control':'no-cache'})
            with urlopen(request, timeout=20) as response:
                assert response.status == 200, f'{response.status} {url}'
                assert urlparse(response.url).netloc == urlparse(base).netloc
                body = response.read(maximum)
                results.append({'url':url,'status':response.status,'content_type':response.headers.get('Content-Type',''),'bytes_read':len(body)})
                print(f'PASS HTTPS 200 {url}', flush=True)
                return body
        except Exception as error:
            last_error = error
            if attempt < 3:
                time.sleep(5 * (attempt + 1))
    raise RuntimeError(f'Cannot verify {url}: {last_error}')


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = set()
        self.canonical = None
        self.h1 = 0

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == 'h1':
            self.h1 += 1
        if tag == 'link' and values.get('rel') == 'canonical':
            self.canonical = values.get('href')
        if tag == 'link' and values.get('rel') in ('stylesheet','icon','modulepreload'):
            self.assets.add(values['href'])
        if tag == 'script' and values.get('src'):
            self.assets.add(values['src'])
        if tag == 'astro-island':
            for key in ('component-url','renderer-url'):
                if values.get(key):
                    self.assets.add(values[key])

try:
    # Cache-busting prevents an old edge response from passing the deployment check.
    version = fetch(f'build-id.txt?revision={args.sha}', 200).decode().strip()
    assert version == args.sha, f'Wrong build served: {version}'
    assets = set()
    for path in ('','experience/','progress/','privacy/','credits/'):
        text = fetch(path).decode('utf-8')
        assert 'auradio' in text.lower() and '<main' in text
        assert '/auradio_web/_astro/' not in text
        page = Page(); page.feed(text)
        assert page.h1 == 1, f'Heading missing: {path}'
        assert page.canonical == urljoin(base,path), f'Wrong canonical: {page.canonical}'
        assets.update(page.assets)
    assert any(asset.endswith('.css') for asset in assets), 'No stylesheet references'
    assert any(asset.endswith('.js') for asset in assets), 'No JavaScript references'
    for asset in sorted(assets):
        assert not urlparse(asset).path.startswith('/auradio_web/'), asset
        body = fetch(asset)
        assert body and not body.lstrip().lower().startswith(b'<!doctype html'), f'HTML returned for asset: {asset}'
    assert b'RIFF' == fetch('audio/daylight.wav', 44)[:4], 'Invalid audio header'
    assert 'https://auradio.kangqiovo.com/sitemap.xml' in fetch('robots.txt').decode()
    assert 'https://auradio.kangqiovo.com/experience/' in fetch('sitemap.xml').decode()
    report = {'ok':True,'url':base,'sha':args.sha,'checks':results}
except Exception as error:
    report = {'ok':False,'url':base,'sha':args.sha,'checks':results,'error':str(error)}
    raise
finally:
    Path(args.output).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
