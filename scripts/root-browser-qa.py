"""Verify the exact root-path production build, not the portable prefixed build."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import json, shutil
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-output/root'; OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*_): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT/'dist')))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
errors=[]; failed=[]; checks=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('google-chrome') or shutil.which('chromium'),args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio'])
        page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
        page.set_default_timeout(20000)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('response',lambda r:failed.append(f'{r.status} {r.url}') if r.status>=400 else None)
        for route in ['', 'experience/','progress/','privacy/','credits/','404.html']:
            response=page.goto(base+route,wait_until='domcontentloaded')
            assert response.status==200
            expect(page.locator('h1')).to_be_visible()
            page.wait_for_function('Array.from(document.querySelectorAll(\'astro-island[client="load"]\')).every(e=>!e.hasAttribute("ssr"))')
            assert page.evaluate('document.styleSheets.length')>0
            assert page.locator('link[rel="canonical"]').get_attribute('href').startswith('https://auradio.kangqiovo.com/')
            assert page.evaluate('document.documentElement.scrollWidth')<=1441
            checks.append('root page and assets: '+(route or '/'))
        page.goto(base+'experience/',wait_until='domcontentloaded')
        page.wait_for_function('document.querySelector("audio")?.duration>20')
        assert page.locator('audio').evaluate('(a)=>a.paused')
        page.get_by_role('button',name='播放试听',exact=True).click()
        page.wait_for_function('document.querySelector("audio").currentTime>0.2 && !document.querySelector("audio").paused')
        page.get_by_role('button',name='暂停试听',exact=True).click()
        assert page.locator('audio').evaluate('(a)=>a.paused')
        checks.append('root-path audio really loads, plays and pauses')
        page.goto(base,wait_until='domcontentloaded')
        expect(page.locator('.hero-field-frame canvas')).to_have_count(1,timeout=20000)
        page.screenshot(path=str(OUT/'desktop.png'))
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth')<=391
        page.screenshot(path=str(OUT/'mobile.png'))
        checks.append('root WebGL, desktop and mobile rendering')
        assert not errors, errors
        assert not failed, failed
        (OUT/'checks.json').write_text(json.dumps({'checks':checks,'errors':errors,'failed_requests':failed,'browser':browser.version},ensure_ascii=False,indent=2))
        print('PASS root production browser:',len(checks),'checks; no runtime errors or HTTP failures')
        browser.close()
finally:
    server.shutdown();server.server_close()
