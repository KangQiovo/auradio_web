"""Observe real public cover/player availability without downloading music or bypassing controls.

Third-party availability is reported separately, not replaced by fixtures and not required for
building the website. A unavailable third party must still leave a usable official source link.
"""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import json,re,shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'qa-output/media-live';OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*_):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT/'dist')))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/experience/'
records=[]
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=shutil.which('google-chrome') or shutil.which('chromium'),args=['--no-sandbox','--mute-audio','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
        context=browser.new_context(viewport={'width':1440,'height':1100})
        page=context.new_page();page.set_default_timeout(12000)
        for i,name in enumerate(['自由的你','于是','G.E.M.']):
            record={'title':name,'artwork_loaded':False,'palette_extracted':False,'official_player_frame':False,'observed_media_playback':False}
            try:
                page.goto(base,wait_until='domcontentloaded');page.wait_for_function('!document.querySelector(".album-room").closest("astro-island").hasAttribute("ssr")')
                page.get_by_role('tab',name='选择 '+name,exact=True).click()
                page.wait_for_function('document.querySelector(".album-room").dataset.paletteState.match(/extracted|fallback/)')
                page.wait_for_timeout(700)
                record['artwork_loaded']=page.locator('.album-art-plane img').count()>0 and page.locator('.album-art-plane img').evaluate('(im)=>im.complete&&im.naturalWidth>100')
                record['palette_extracted']=page.locator('.album-room').get_attribute('data-palette-state')=='extracted'
                record['official_link']=page.locator('.official-source-link').get_attribute('href')
                page.locator('.album-room').scroll_into_view_if_needed()
                page.screenshot(path=str(OUT/f'album-{i+1}-desktop.png'))
                page.get_by_role('button',name='打开官方试听').click()
                page.wait_for_timeout(6000)
                iframe=page.locator('.official-preview iframe')
                handle=iframe.element_handle();frame=handle.content_frame() if handle else None
                record['official_player_frame']=bool(frame and frame.url.startswith('https://'))
                if frame:
                    # Use the provider's visible native controls. Never manipulate its source URL or media rights.
                    button=frame.get_by_role('button',name=re.compile('play|播放|재생',re.I)).first
                    if button.count():
                        try:
                            button.click(timeout=5000);page.wait_for_timeout(3000)
                            record['observed_media_playback']=frame.locator('audio,video').evaluate_all('(els)=>els.some(a=>!a.paused&&a.currentTime>0)')
                        except Exception:pass
                page.screenshot(path=str(OUT/f'player-{i+1}.png'))
                if i==1:
                    page.get_by_role('button',name='关闭官方试听').click()
                    page.set_viewport_size({'width':390,'height':844});page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(600)
                    page.screenshot(path=str(OUT/'album-mobile.png'),full_page=True)
                    page.set_viewport_size({'width':1440,'height':1100})
            except Exception as error:record['observation_error']=str(error).splitlines()[0][:240]
            records.append(record)
        browser.close()
finally:server.shutdown();server.server_close()
(OUT/'availability.json').write_text(json.dumps({'scope':'Live external network observation, no media downloaded or authentication bypassed','records':records},ensure_ascii=False,indent=2))
print(json.dumps(records,ensure_ascii=False),flush=True)
