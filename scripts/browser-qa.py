"""Production-build browser regression checks.

Run: python scripts/browser-qa.py --output /tmp/auradio-qa
Requires Playwright for Python and a local Chromium or Google Chrome executable.
Screenshots are written outside source by default. No third-party requests are needed.
"""
from __future__ import annotations
import argparse
import functools
import http.server
import json
from pathlib import Path
import shutil
import tempfile
import threading
import time
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--output', default='/tmp/auradio-qa')
parser.add_argument('--browser-path', default=shutil.which('google-chrome') or shutil.which('chromium'))
args = parser.parse_args()
OUTPUT = Path(args.output).resolve()
OUTPUT.mkdir(parents=True, exist_ok=True)
checks: list[str] = []
errors: list[str] = []
console_messages: list[dict] = []
network_failures: list[str] = []

def visit(page, url: str):
    """Wait for content and interactive islands, not idle media connections.

    https://playwright.dev/python/docs/api/class-page#page-goto discourages networkidle.
    """
    started = time.monotonic()
    print(f'NAV {url}', flush=True)
    response = page.goto(url, wait_until='domcontentloaded', timeout=30000)
    expect(page.locator('main h1')).to_be_visible(timeout=20000)
    page.wait_for_function("Array.from(document.querySelectorAll('astro-island[client=\"load\"]')).every(e => !e.hasAttribute('ssr'))", timeout=30000)
    print(f'READY {time.monotonic()-started:.2f}s {url}', flush=True)
    return response

def passed(name: str) -> None:
    checks.append(name)
    print(f'PASS {name}', flush=True)

def no_overflow(page, label: str) -> None:
    width = page.evaluate('document.documentElement.scrollWidth')
    viewport = page.viewport_size['width']
    assert width <= viewport + 1, f'{label}: {width}px document exceeds {viewport}px viewport'
    passed(f'{label}: no horizontal overflow')

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

with tempfile.TemporaryDirectory(prefix='auradio-qa-') as directory:
    # Production uses the existing custom domain root, not a repository subpath.
    public = ROOT / 'dist'
    handler = functools.partial(QuietHandler, directory=str(public))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 4173), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = 'http://127.0.0.1:4173/'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=args.browser_path, headless=True, args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio'])
            try:
                context = browser.new_context(viewport={'width':1440,'height':1000}, device_scale_factor=1)
                page = context.new_page()
                page.set_default_timeout(20000)
                page.set_default_navigation_timeout(30000)
                expect.set_options(timeout=12000)
                page.on('console', lambda message: console_messages.append({'type':message.type,'text':message.text}) if message.type in ('error','warning') else None)
                page.on('requestfailed', lambda request: network_failures.append(f'{request.failure}: {request.url}'))
                page.on('pageerror', lambda error: errors.append(str(error)))
                posts: list[str] = []
                page.on('request', lambda request: posts.append(request.url) if request.method not in ('GET','HEAD') else None)
                for path, title in [('', 'Auradio'), ('experience/','声音体验室'), ('progress/','当前进度'), ('privacy/','使用与隐私'), ('credits/','技术'), ('404.html','没有找到')]:
                    response = visit(page, base + path)
                    assert response and response.status == 200
                    assert title in page.title()
                    assert page.locator('h1').count() == 1
                    assert len(page.locator('main').inner_text()) > 50
                    assert page.locator('vite-error-overlay, nextjs-portal').count() == 0
                    no_overflow(page, f'desktop {path or "home"}')
                    passed(f'{path or "home"}: correct title, content, route and no framework overlay')
                visit(page, base)
                expect(page.locator('.hero-field-frame canvas')).to_have_count(1)
                expect(page.locator('.hero-field-frame .field-fallback')).to_have_class('field-fallback is-hidden')
                page.screenshot(path=str(OUTPUT/'home-desktop.png'), animations='disabled')
                passed('Three.js loads and replaces the SSR fallback')
                page.get_by_role('button',name='静止片刻',exact=True).click()
                expect(page.get_by_role('button',name='让它流动',exact=True)).to_have_attribute('aria-pressed','true')
                passed('hero pause control changes actual motion state')
                page.locator('.theme-explorer').scroll_into_view_if_needed()
                page.wait_for_function("!document.querySelector('.theme-explorer').closest('astro-island').hasAttribute('ssr')")
                page.get_by_role('button',name='Liquid',exact=True).click()
                expect(page.locator('.theme-liquid')).to_have_count(1)
                page.get_by_role('button',name='Material 3',exact=True).click()
                expect(page.locator('.theme-material')).to_have_count(1)
                page.get_by_role('textbox',name='搜索示例曲库').fill('不存在的歌')
                expect(page.get_by_text('没有匹配的示例内容。')).to_be_visible()
                page.get_by_role('button',name='艺术家',exact=True).click()
                expect(page.locator('.library-item b')).to_have_text('Auradio Studio')
                passed('Motion theme changes and real example-library search / grouping')
                page.locator('.provider-explorer').scroll_into_view_if_needed()
                page.wait_for_function("!document.querySelector('.provider-explorer').closest('astro-island').hasAttribute('ssr')")
                page.locator('.provider-rail button').filter(has_text='QQ 音乐').click()
                expect(page.locator('.provider-detail h3')).to_have_text('QQ 音乐')
                expect(page.locator('.provider-detail')).to_contain_text('不读取网页 Cookie')
                passed('provider selection updates the correct implementation boundary')
                page.get_by_text('电脑、鸿蒙和 iPhone 版本什么时候推出？',exact=True).click()
                expect(page.get_by_text('这些平台有不同的后续路线',exact=False)).to_be_visible()
                passed('FAQ expands with truthful unreleased-platform state')
                page.locator('.theme-explorer').scroll_into_view_if_needed()
                page.screenshot(path=str(OUTPUT/'theme-desktop.png'),animations='disabled')
                hrefs = page.locator('a[href]').evaluate_all('(els)=>els.map(e=>e.getAttribute("href"))')
                for href in hrefs:
                    parsed=urlparse(href)
                    if parsed.scheme or parsed.netloc:
                        continue
                    path=unquote(parsed.path.lstrip('/'))
                    target=ROOT/'dist'/path if path else ROOT/'dist/index.html'
                    if target.is_dir():target=target/'index.html'
                    assert target.is_file(), f'Broken internal link: {href}'
                    if not parsed.path and parsed.fragment:
                        assert page.locator(f'[id="{parsed.fragment}"]').count(), href
                passed('homepage internal routes and fragment links resolve')
                visit(page, base+'experience/')
                page.wait_for_function('document.querySelector("audio").duration > 20')
                assert page.locator('audio').evaluate('(a)=>a.paused')
                assert page.locator('audio').evaluate('(a)=>a.currentTime') == 0
                passed('audio is loaded but never autoplays')
                page.get_by_role('button',name='播放试听',exact=True).click()
                page.wait_for_function('document.querySelector("audio").currentTime > 0.3 && !document.querySelector("audio").paused')
                expect(page.get_by_role('button',name='暂停试听',exact=True)).to_be_visible()
                page.screenshot(path=str(OUTPUT/'experience-playing.png'),animations='disabled')
                page.get_by_role('button',name='暂停试听',exact=True).click()
                assert page.locator('audio').evaluate('(a)=>a.paused')
                passed('real HTMLAudioElement play / progress / pause events drive controls')
                seek=page.get_by_role('slider',name='播放进度')
                seek.focus();seek.press('Home');seek.press('PageUp')
                page.wait_for_function('document.querySelector("audio").currentTime > 1')
                passed('keyboard seeking changes actual audio time')
                volume=page.get_by_role('slider',name='音量')
                volume.focus();volume.press('Home')
                page.wait_for_function('document.querySelector("audio").volume === 0')
                volume.press('End')
                page.wait_for_function('document.querySelector("audio").volume === 1')
                passed('keyboard volume adjusts the audio element')
                page.get_by_role('button',name='环形',exact=True).click()
                expect(page.get_by_role('button',name='环形',exact=True)).to_have_attribute('aria-pressed','true')
                page.get_by_role('button',name='波面',exact=True).click()
                expect(page.get_by_role('button',name='波面',exact=True)).to_have_attribute('aria-pressed','true')
                intensity=page.get_by_role('slider',name='响应强度')
                intensity.focus();intensity.press('End')
                expect(page.locator('.intensity-label output')).to_have_text('100%')
                passed('three field modes and intensity respond to input')
                page.get_by_role('button',name='下一段合成试听').click()
                expect(page.locator('.studio-track h2')).to_have_text('慢慢靠近')
                page.locator('.sample-option').filter(has_text='午夜留白').click()
                expect(page.locator('.studio-track h2')).to_have_text('午夜留白')
                passed('next track and sample selection load the intended source')
                file=page.get_by_label('选择本地音频',exact=True)
                file.set_input_files({'name':'我的音频.wav','mimeType':'audio/wav','buffer':(ROOT/'public/audio/daylight.wav').read_bytes()})
                expect(page.locator('.studio-track h2')).to_have_text('我的音频')
                page.wait_for_function('document.querySelector("audio").src.startsWith("blob:") && document.querySelector("audio").duration > 20')
                page.get_by_role('button',name='播放试听',exact=True).click()
                page.wait_for_function('!document.querySelector("audio").paused && document.querySelector("audio").currentTime > 0.2')
                page.get_by_role('button',name='暂停试听',exact=True).click()
                passed('chosen local file plays through a blob URL without uploads')
                file.set_input_files({'name':'bad.html','mimeType':'text/html','buffer':b'<script>alert(1)</script>'})
                expect(page.get_by_role('alert')).to_contain_text('请选择')
                file.set_input_files({'name':'empty.wav','mimeType':'audio/wav','buffer':b''})
                expect(page.get_by_role('alert')).to_contain_text('空文件')
                passed('invalid and empty local files show errors, not fake playback')
                page.get_by_role('button',name='切换体验室全屏').click()
                assert page.evaluate('Boolean(document.fullscreenElement)') or '全屏' in page.locator('.audio-feedback').inner_text()
                if page.evaluate('Boolean(document.fullscreenElement)'):
                    page.keyboard.press('Escape')
                passed('fullscreen works or reports an explicit unsupported state')
                assert not posts, f'Unexpected write request: {posts}'
                passed('no POST / uploads / account submissions during the flow')
                for width in [390,360]:
                    page.set_viewport_size({'width':width,'height':844})
                    for path in ['', 'experience/', 'progress/', 'privacy/', 'credits/']:
                        visit(page,base+path)
                        no_overflow(page,f'{width}px {path or "home"}')
                    visit(page,base)
                    page.get_by_role('button',name='打开导航',exact=True).click()
                    expect(page.locator('#mobile-nav')).to_be_visible()
                    page.keyboard.press('Escape')
                    expect(page.locator('#mobile-nav')).to_be_hidden()
                    expect(page.get_by_role('button',name='打开导航',exact=True)).to_be_focused()
                    passed(f'{width}px mobile menu opens, closes on Escape and restores focus')
                    if width==390:
                        page.screenshot(path=str(OUTPUT/'home-mobile.png'),animations='disabled')
                        visit(page,base+'experience/')
                        page.screenshot(path=str(OUTPUT/'experience-mobile.png'),full_page=True,animations='disabled')
                reduced=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
                rp=reduced.new_page();rp.on('pageerror',lambda error: errors.append(str(error)))
                visit(rp,base)
                expect(rp.get_by_role('button',name='减少动态已开启',exact=True)).to_be_disabled()
                visit(rp,base+'experience/')
                expect(rp.get_by_role('slider',name='响应强度')).to_be_disabled()
                rp.get_by_role('button',name='播放试听',exact=True).click()
                rp.wait_for_function('!document.querySelector("audio").paused')
                passed('system reduced-motion disables animation controls but leaves audio usable')
                reduced.close()
                page.set_viewport_size({'width':1440,'height':1000})
                visit(page,base)
                page.locator('[data-motion-toggle]').click()
                expect(page.locator('html')).to_have_attribute('data-motion','reduce')
                page.reload(wait_until='domcontentloaded')
                expect(page.locator('html')).to_have_attribute('data-motion','reduce')
                passed('manual reduced-motion preference persists and survives reload')
                nojs=browser.new_context(viewport={'width':390,'height':844},java_script_enabled=False)
                np=nojs.new_page();np.goto(base,wait_until='load')
                expect(np.locator('h1')).to_contain_text('听见')
                expect(np.locator('.desktop-nav')).to_be_visible()
                expect(np.locator('.no-script')).to_be_visible()
                no_overflow(np,'no-JavaScript mobile')
                passed('without JavaScript, meaningful content and navigation remain available')
                nojs.close()
                fallback=browser.new_context(viewport={'width':1440,'height':1000})
                fallback.add_init_script("const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(String(type).includes('webgl'))return null;return original.call(this,type,...args)};")
                fp=fallback.new_page();visit(fp,base)
                expect(fp.get_by_text('静态兼容模式',exact=True)).to_be_visible()
                expect(fp.locator('.hero-field-frame .field-fallback')).not_to_have_class('field-fallback is-hidden')
                passed('no-WebGL fallback is visible and does not blank the page')
                fallback.close()
                assert not errors, '\n'.join(errors)
                passed('no application runtime exceptions across verified flows')
                summary={'checks':checks,'count':len(checks),'browser':browser.version,'viewports':['1440x1000','390x844','360x844'],'errors':errors,'console_messages':console_messages,'network_failures':network_failures}
                (OUTPUT/'checks.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
                print(json.dumps({'passed':len(checks),'browser':browser.version,'errors':errors},ensure_ascii=False),flush=True)
                browser.close()
            except Exception:
                evidence={'checks_passed':checks,'errors':errors,'console_messages':console_messages,'network_failures':network_failures}
                try:
                    evidence['url']=page.url
                    evidence['html']=page.content()
                    page.screenshot(path=str(OUTPUT/'failure.png'),timeout=15000)
                except Exception as capture_error:
                    evidence['capture_error']=str(capture_error)
                (OUTPUT/'failure.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf-8')
                print(json.dumps({k:v for k,v in evidence.items() if k!='html'},ensure_ascii=False),flush=True)
                raise
    finally:
        server.shutdown();server.server_close()
