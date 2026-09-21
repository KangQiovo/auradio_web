"""Theme catalog and actual cover interactions on root production build.
Browser plugin not available; uses CI Playwright/Chromium. Images are controlled fixtures.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright, expect
import json, shutil
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-output'/'covers';OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def record(s):checks.append(s);print('PASS '+s,flush=True)
def fixtures(context):
    def route(r):
        u=r.request.url
        if 'mzstatic.com' in u or '126.net' in u:
            r.fulfill(content_type='image/svg+xml',headers={'Access-Control-Allow-Origin':'*'},body='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#756b5f"/><path d="M0 520 600 180v420H0Z" fill="#c8c9ac"/></svg>')
        elif 'music.163.com' in u or 'embed.music.apple.com' in u:r.abort()
        else:r.continue_()
    context.route('**/*',route)
def visit(page,path):
    page.goto(base+path,wait_until='domcontentloaded');expect(page.locator('h1')).to_be_visible()
    page.wait_for_function('Array.from(document.querySelectorAll(\'astro-island[client="load"]\')).every(e=>!e.hasAttribute("ssr"))')
def rest(page):
    page.wait_for_function('''()=>{const el=document.querySelector('.cover-tilt');const m=new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return Math.abs(m.m11-1)<.002&&Math.abs(m.m22-1)<.002&&Math.abs(m.m13)<.002&&Math.abs(m.m23)<.002;}''',timeout=5000)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'dist')))
Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which('google-chrome') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
    try:
        context=browser.new_context(viewport={'width':1440,'height':1000});fixtures(context)
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        visit(page,'');page.locator('.theme-explorer').scroll_into_view_if_needed()
        page.wait_for_function('!document.querySelector(".theme-explorer").closest("astro-island").hasAttribute("ssr")')
        for theme in ['MIUIX','Liquid','Material 3']:
            page.get_by_role('button',name=theme,exact=True).click()
            expect(page.locator('.library-item b')).to_have_text(['自由的你','于是','G.E.M.'])
            expect(page.locator('.library-item>div:nth-child(2)>span')).to_contain_text(['G.E.M. 邓紫棋']*3)
            page.locator('.theme-explorer').screenshot(path=str(OUT/('theme-'+theme.replace(' ','-')+'.png')),animations='disabled')
        record('all three themes display the exact selected-record names and artist')
        page.get_by_role('textbox',name='搜索示例曲库').fill('于是');expect(page.locator('.library-item b')).to_have_text(['于是'])
        page.get_by_role('button',name='专辑',exact=True).click();expect(page.locator('.library-item b')).to_have_count(3)
        page.get_by_role('button',name='艺术家',exact=True).click();expect(page.locator('.library-item b')).to_have_text(['G.E.M. 邓紫棋'])
        record('search and album/artist categories use shared metadata')
        visit(page,'experience/');cover=page.locator('.cover-interaction');cover.scroll_into_view_if_needed();rest(page)
        base_pixels=cover.screenshot();box=cover.bounding_box()
        page.mouse.move(box['x']+box['width']*.8,box['y']+box['height']*.25,steps=6)
        expect(cover).to_have_attribute('data-cover-state','hover')
        page.wait_for_function('Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".cover-tilt")).transform).m13)>.015')
        assert cover.screenshot()!=base_pixels
        page.locator('.album-stage').screenshot(path=str(OUT/'cover-hover-desktop.png'),animations='allow')
        record('actual cover pixels and 3D transform respond to mouse position')
        page.mouse.down();expect(cover).to_have_attribute('data-cover-state','pressed');page.mouse.up();page.mouse.move(1,1);rest(page)
        expect(page.locator('.official-preview iframe')).to_have_count(0)
        record('press/release springs home without opening or playing media')
        cover.focus();cover.press('ArrowRight');expect(page.locator('.album-room')).to_have_attribute('data-selected-album','therefore')
        cover.press('Enter');expect(cover).to_have_attribute('data-cover-state','pressed');rest(page)
        cover.press('ArrowRight');expect(page.locator('.album-description')).to_have_text('')
        record('keyboard selects records and animates; G.E.M. description stays blank')
        mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1);fixtures(mobile)
        mp=mobile.new_page();mp.on('pageerror',lambda e:errors.append(str(e)));visit(mp,'experience/')
        mc=mp.locator('.cover-interaction');mc.scroll_into_view_if_needed();rest(mp);b=mc.bounding_box()
        cdp=mobile.new_cdp_session(mp)
        def touch(kind,x=None,y=None):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if x is None else [{'x':x,'y':y}]})
        x=b['x']+b['width']*.7;y=b['y']+b['height']*.4
        touch('touchStart',x,y);expect(mc).to_have_attribute('data-cover-state','pressed');touch('touchEnd');rest(mp)
        expect(mp.locator('.official-preview iframe')).to_have_count(0)
        record('native touch presses and releases the cover without playback')
        b=mc.bounding_box();x=b['x']+b['width']*.8;y=b['y']+b['height']*.5
        touch('touchStart',x,y)
        for i in range(1,7):touch('touchMove',x-i*18,y)
        touch('touchEnd');expect(mp.locator('.album-room')).to_have_attribute('data-selected-album','therefore');rest(mp)
        record('native horizontal cover swipe changes exactly one record')
        mc.scroll_into_view_if_needed();b=mc.bounding_box();x=b['x']+b['width']*.5;y=b['y']+b['height']*.6;before=mp.evaluate('scrollY')
        touch('touchStart',x,y)
        for i in range(1,7):touch('touchMove',x,y-i*18)
        touch('touchEnd');mp.wait_for_function('(start)=>scrollY>start+20',arg=before)
        expect(mp.locator('.album-room')).to_have_attribute('data-selected-album','therefore')
        record('native vertical cover gesture scrolls the page without selecting a record')
        assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth')
        mc.scroll_into_view_if_needed();mp.screenshot(path=str(OUT/'cover-mobile.png'),animations='disabled')
        for width in [320,390,768]:
            mp.set_viewport_size({'width':width,'height':844});assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth')
        record('cover interactions preserve 320/390/768px layout');mobile.close()
        reduced=browser.new_context(reduced_motion='reduce');fixtures(reduced);rp=reduced.new_page();visit(rp,'experience/')
        rc=rp.locator('.cover-interaction');rc.scroll_into_view_if_needed();expect(rc).to_have_attribute('data-reduced','true')
        rc.click();assert rc.locator('.cover-tilt').evaluate('(e)=>getComputedStyle(e).transform')=='none'
        rc.press('ArrowRight');expect(rp.locator('.album-room')).to_have_attribute('data-selected-album','therefore')
        record('reduced motion suppresses cover tilt while selection stays usable');reduced.close()
        assert not errors,errors;record('no uncaught application errors')
        (OUT/'checks.json').write_text(json.dumps({'checks':checks,'count':len(checks),'errors':errors,'browser':browser.version,'artwork':'controlled geometric fixtures, not song playback evidence'},ensure_ascii=False,indent=2))
    except Exception:
        page.screenshot(path=str(OUT/'failure.png'))
        (OUT/'failure.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2));raise
    finally:browser.close();server.shutdown()
