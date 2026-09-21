"""Verify local UI behavior with explicit provider fixtures, not claimed live song playback.

The renderer is a real browser. Remote cover responses and cross-origin player pages are
controlled fixtures for repeatability; real local-file decoding/playback is not mocked.
Run separately with --live-artwork to inspect actual externally hosted cover images.
"""
from __future__ import annotations
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from urllib.parse import urlparse
import argparse, io, json, re, shutil, struct, sys, wave, zlib
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',default=str(ROOT/'qa-output'))
parser.add_argument('--root',action='store_true')
parser.add_argument('--live-artwork',action='store_true')
args=parser.parse_args()
OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];console=[]

def record(name):
    checks.append(name);print('PASS '+name,flush=True)

def png(rgb):
    def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    scan=b''.join(b'\0'+bytes(rgb)*40 for _ in range(40))
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',40,40,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(scan))+chunk(b'IEND',b'')

def wav():
    out=io.BytesIO()
    with wave.open(out,'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(8000)
        # Deliberately synthetic test fixture, never shipped to the public site.
        f.writeframes(b'\0\0'*8000*8)
    return out.getvalue()

def fixtures(context,blocked_art=False):
    def route(request):
        host=urlparse(request.request.url).hostname or ''
        if host in ('embed.music.apple.com','music.163.com'):
            request.fulfill(status=200,content_type='text/html',body='<html lang="zh"><title>TEST provider frame</title><body>Controlled cross-origin UI fixture — not song playback</body></html>')
        elif 'mzstatic.com' in host or host=='p2.music.126.net':
            if blocked_art:request.abort();return
            if args.live_artwork:request.continue_();return
            url=request.request.url
            rgb=[91,151,154] if '126.net' in host else [191,112,79] if 'Music124' in url else [164,141,199]
            request.fulfill(status=200,content_type='image/png',body=png(rgb),headers={'Access-Control-Allow-Origin':'*'})
        else: request.continue_()
    context.route('**/*',route)

def visit(page,path):
    response=page.goto(base+path,wait_until='domcontentloaded')
    assert response and response.status==200,path
    expect(page.locator('main h1')).to_be_visible()
    page.wait_for_function('Array.from(document.querySelectorAll(\'astro-island[client="load"]\')).every(e=>!e.hasAttribute("ssr"))')
    return response

def hydrate(page,selector):
    page.locator(selector).scroll_into_view_if_needed()
    page.wait_for_function('(s)=>!document.querySelector(s).closest("astro-island").hasAttribute("ssr")',arg=selector)

def overflow(page,label):
    assert page.evaluate('document.documentElement.scrollWidth')<=page.viewport_size['width']+1,label
    record(label+' / no overflow')

if args.root:
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self,*_):pass
    handler=partial(Handler,directory=str(ROOT/'dist'))
else:
    sys.path.insert(0,str(ROOT));from serve import Handler
    handler=Handler
server=ThreadingHTTPServer(('127.0.0.1',0),handler)
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'+('' if args.root else 'auradio_web/')
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=shutil.which('google-chrome') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio'])
        context=browser.new_context(viewport={'width':1440,'height':1000})
        fixtures(context)
        page=context.new_page();page.set_default_timeout(15000);expect.set_options(timeout=10000)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:console.append(m.text) if m.type=='error' else None)
        try:
            for path in ['', 'experience/','progress/','privacy/','credits/','404.html']:
                visit(page,path)
                assert page.locator('h1').count()==1
                assert len(page.locator('main').inner_text())>50
                assert page.locator('vite-error-overlay').count()==0
                assert not re.search(r'Demo\s*\d|\d+\.\d+\.\d+-demo|更新日志|版本记录',page.content(),re.I)
                assert page.locator('link[rel="canonical"]').get_attribute('href').startswith('https://auradio.kangqiovo.com/')
                overflow(page,'desktop '+(path or 'home'))
            record('all six routes render with canonical metadata and without app release information')
            visit(page,'')
            expect(page.locator('.hero-field-frame canvas')).to_have_count(1)
            page.get_by_role('button',name='静止片刻',exact=True).click()
            expect(page.get_by_role('button',name='让它流动',exact=True)).to_be_visible()
            record('hero WebGL and manual pause')
            hydrate(page,'.theme-explorer')
            page.get_by_role('button',name='Liquid',exact=True).click()
            expect(page.locator('.theme-liquid')).to_have_count(1)
            page.get_by_role('textbox',name='搜索示例曲库').fill('不存在')
            expect(page.get_by_text('没有匹配的示例内容。')).to_be_visible()
            page.get_by_role('button',name='艺术家',exact=True).click()
            expect(page.locator('.library-item b')).to_have_text('Auradio Studio')
            record('existing theme and sample library controls retained')
            hydrate(page,'.provider-explorer')
            page.locator('.provider-rail button').filter(has_text='QQ 音乐').click()
            expect(page.locator('.provider-detail h3')).to_have_text('QQ 音乐')
            page.get_by_text('接下来，还会有什么？',exact=True).click()
            expect(page.locator('details').filter(has_text='接下来，还会有什么？')).to_have_attribute('open','')
            record('platform boundaries and restrained future FAQ retained')
            visit(page,'experience/')
            album=page.locator('.album-room')
            assert page.locator('.official-preview iframe').count()==0
            expect(album).to_have_attribute('data-selected-album','freedom')
            record('correct initial track; third-party player is absent before consent')
            if not args.live_artwork:
                expect(album).to_have_attribute('data-palette-state','extracted')
            page.get_by_role('tab',name='选择 于是',exact=True).click()
            expect(album).to_have_attribute('data-selected-album','therefore')
            expect(page.locator('.album-copy h2')).to_have_text('于是')
            page.wait_for_function('document.documentElement.dataset.album==="therefore"')
            first=page.locator('html').evaluate('(el)=>el.style.getPropertyValue("--album-accent")')
            page.get_by_role('button',name='打开官方试听').click()
            expect(page.locator('.official-preview iframe')).to_have_count(1)
            assert '1053568849' in page.locator('.official-preview iframe').get_attribute('src')
            record('the selected official song player is created only after a click')
            page.get_by_role('tab',name='选择 G.E.M.',exact=True).click()
            expect(page.locator('.official-preview iframe')).to_have_count(0)
            expect(page.locator('.album-copy h2')).to_have_text('G.E.M.')
            page.wait_for_function('document.documentElement.dataset.album==="gem"')
            if not args.live_artwork:expect(album).to_have_attribute('data-palette-state','extracted')
            second=page.locator('html').evaluate('(el)=>el.style.getPropertyValue("--album-accent")')
            assert first!=second
            record('switching unloads the old player, updates cover/title and changes extracted page palette')
            page.get_by_role('tab',name='选择 G.E.M.',exact=True).focus();page.keyboard.press('Home')
            expect(page.get_by_role('tab',name='选择 自由的你',exact=True)).to_be_focused()
            expect(album).to_have_attribute('data-selected-album','freedom')
            page.keyboard.press('End')
            expect(album).to_have_attribute('data-selected-album','gem')
            record('album keyboard Home/End navigation and focus follow selection')
            page.locator('.album-rail button').nth(0).evaluate('(b)=>b.click()')
            page.locator('.album-rail button').nth(1).evaluate('(b)=>b.click()')
            page.locator('.album-rail button').nth(2).evaluate('(b)=>b.click()')
            expect(album).to_have_attribute('data-selected-album','gem')
            expect(page.locator('.album-copy h2')).to_have_text('G.E.M.')
            page.wait_for_timeout(750)
            assert page.locator('.album-art-plane').count()==1
            assert page.locator('.page-ambience>div').count()==2
            record('rapid selection settles correctly with bounded cover and background layers')
            page.locator('.album-room').scroll_into_view_if_needed()
            page.screenshot(path=str(OUT/'album-desktop.png'),animations='disabled')
            page.get_by_role('button',name='打开官方试听').click()
            hydrate(page,'.audio-studio')
            expect(page.get_by_role('button',name='播放试听',exact=True)).to_be_disabled()
            assert not page.locator('audio').get_attribute('src')
            record('local soundfield has no disguised sample song and never autoplays')
            file=page.get_by_label('选择本地音频',exact=True)
            file.set_input_files({'name':'本地测试.wav','mimeType':'audio/wav','buffer':wav()})
            page.wait_for_function('document.querySelector("audio").duration>7')
            assert page.locator('audio').evaluate('(a)=>a.paused')
            page.get_by_role('button',name='播放试听',exact=True).click()
            page.wait_for_function('document.querySelector("audio").currentTime>.2&&!document.querySelector("audio").paused')
            expect(page.locator('.official-preview iframe')).to_have_count(0)
            page.get_by_role('button',name='暂停试听',exact=True).click()
            assert page.locator('audio').evaluate('(a)=>a.paused')
            record('real local audio decodes, plays, pauses and stops the official frame')
            seek=page.get_by_role('slider',name='播放进度');seek.focus();seek.press('End')
            assert page.locator('audio').evaluate('(a)=>a.currentTime')>7
            volume=page.get_by_role('slider',name='音量');volume.focus();volume.press('Home')
            page.wait_for_function('document.querySelector("audio").volume===0')
            page.get_by_role('button',name='环形',exact=True).click()
            expect(page.get_by_role('button',name='环形',exact=True)).to_have_attribute('aria-pressed','true')
            page.get_by_role('slider',name='响应强度').focus();page.keyboard.press('End')
            expect(page.locator('.intensity-label output')).to_have_text('100%')
            record('real seeking, volume and local visual settings remain usable')
            file.set_input_files({'name':'bad.html','mimeType':'text/html','buffer':b'<script>bad</script>'})
            expect(page.get_by_role('alert')).to_contain_text('请选择')
            file.set_input_files({'name':'empty.wav','mimeType':'audio/wav','buffer':b''})
            expect(page.get_by_role('alert')).to_contain_text('空文件')
            page.get_by_role('button',name='清除本地音频').click()
            expect(page.get_by_role('button',name='播放试听',exact=True)).to_be_disabled()
            assert not page.locator('audio').get_attribute('src')
            record('invalid input has visible errors; clear releases the selected file')
            for width in [768,390,360,320]:
                page.set_viewport_size({'width':width,'height':844})
                for path in ['', 'experience/','progress/','privacy/','credits/']:
                    visit(page,path);overflow(page,str(width)+'px '+(path or 'home'))
                visit(page,'experience/')
                page.get_by_role('button',name='打开导航',exact=True).click()
                expect(page.locator('#mobile-nav')).to_be_visible();page.keyboard.press('Escape')
                expect(page.locator('#mobile-nav')).to_be_hidden()
                expect(page.get_by_role('button',name='打开导航',exact=True)).to_be_focused()
                record(str(width)+'px mobile navigation')
                if width==390:
                    page.get_by_role('tab',name='选择 于是',exact=True).click()
                    expect(page.locator('.album-copy h2')).to_have_text('于是')
                    page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(700)
                    page.screenshot(path=str(OUT/'album-mobile.png'),animations='disabled',full_page=True)
                    art=page.locator('.album-art-stage');art.dispatch_event('touchstart',{'touches':[{'clientX':250,'clientY':100}]})
                    art.dispatch_event('touchend',{'changedTouches':[{'clientX':100,'clientY':102}]})
                    expect(page.locator('.album-room')).to_have_attribute('data-selected-album','gem')
                    record('horizontal cover gesture advances without blocking vertical scroll')
            reduced=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');fixtures(reduced)
            rp=reduced.new_page();visit(rp,'experience/')
            rp.get_by_role('tab',name='选择 于是',exact=True).click()
            assert rp.locator('.page-ambience>div').first.evaluate('(e)=>getComputedStyle(e).transitionDuration')=='0s'
            hydrate(rp,'.audio-studio');expect(rp.get_by_role('slider',name='响应强度')).to_be_disabled()
            record('system reduced motion suppresses large transitions and continuous field animation')
            reduced.close()
            page.locator('[data-motion-toggle]').click();page.reload(wait_until='domcontentloaded')
            expect(page.locator('html')).to_have_attribute('data-motion','reduce')
            record('manual reduced-motion preference survives reload')
            nojs=browser.new_context(viewport={'width':390,'height':844},java_script_enabled=False);fixtures(nojs)
            np=nojs.new_page();np.goto(base+'experience/',wait_until='domcontentloaded')
            expect(np.locator('.album-copy h2')).to_have_text('自由的你')
            expect(np.locator('.official-source-link')).to_be_visible()
            expect(np.locator('.desktop-nav')).to_be_visible();overflow(np,'no JavaScript mobile')
            record('without JavaScript, album identity and official listening link remain readable');nojs.close()
            fallback=browser.new_context(viewport={'width':390,'height':844});fixtures(fallback,blocked_art=True)
            fp=fallback.new_page();visit(fp,'experience/')
            expect(fp.locator('.cover-unavailable')).to_be_visible()
            expect(fp.locator('.album-room')).to_have_attribute('data-palette-state','fallback')
            expect(fp.locator('.official-source-link')).to_be_visible();overflow(fp,'blocked artwork mobile')
            record('network/artwork failure falls back honestly without blanking the album controls');fallback.close()
            assert not errors,errors
            assert not console,console
            record('no application runtime or console errors')
            (OUT/'checks.json').write_text(json.dumps({'checks':checks,'count':len(checks),'errors':errors,'console_errors':console,'browser':browser.version,'provider_playback':'Controlled iframe fixture; not proof of real provider playback','artwork':'Live external requests' if args.live_artwork else 'Deterministic pixel fixtures','local_audio':'Real HTMLAudioElement with generated test-only WAV'},ensure_ascii=False,indent=2))
            print('VERIFIED',len(checks),'checks',flush=True)
        except Exception:
            try:page.screenshot(path=str(OUT/'failure.png'),full_page=False)
            except Exception:pass
            (OUT/'failure.json').write_text(json.dumps({'checks':checks,'errors':errors,'console':console},ensure_ascii=False,indent=2));raise
        finally:browser.close()
finally:server.shutdown();server.server_close()
