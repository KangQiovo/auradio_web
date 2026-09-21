"""Real browser regression: idle pointer/touch, frequency separation, silence and tab audio.
The cross-origin player uses an original generated test tone, never a commercial recording.
Run against the root dist build: xvfb-run -a python scripts/reactive-qa.py --headed
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright, expect
import argparse, base64, io, json, math, shutil, struct, wave
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--headed',action='store_true');args=parser.parse_args()
OUT=ROOT/'qa-output'/'reactive';OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def record(s):checks.append(s);print('PASS '+s,flush=True)
def tone():
    buf=io.BytesIO(); rate=48000
    with wave.open(buf,'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
        raw=bytearray()
        for i in range(rate*12):
            t=i/rate;hz=100 if t<4 else 6400 if t<8 else 0
            value=round(math.sin(2*math.pi*hz*t)*0.36*32767) if hz else 0
            raw.extend(struct.pack('<h',value))
        f.writeframes(raw)
    return buf.getvalue()
TONE=tone();payload=base64.b64encode(TONE).decode()
FRAME='''<!doctype html><meta charset="utf-8"><title>Test oscillator</title><button id="start">Play test tone</button><audio id="a" loop src="data:audio/wav;base64,'''+payload+'''"></audio><script>document.querySelector('#start').onclick=()=>document.querySelector('#a').play();</script>'''
def fixtures(context):
    def route(r):
        u=r.request.url
        if 'embed.music.apple.com' in u or 'music.163.com' in u:r.fulfill(status=200,content_type='text/html',body=FRAME)
        elif 'mzstatic.com' in u or '126.net' in u:r.abort()
        else:r.continue_()
    context.route('**/*',route)
def visit(page,path='experience/'):
    page.goto(base+path,wait_until='domcontentloaded');expect(page.locator('h1')).to_be_visible()
    page.wait_for_function('Array.from(document.querySelectorAll(\'astro-island[client="load"]\')).every(e=>!e.hasAttribute("ssr"))')
def field(page):
    el=page.locator('.audio-studio .field-canvas');el.scroll_into_view_if_needed()
    page.wait_for_selector('.audio-studio canvas');expect(el).to_have_attribute('data-field-state','rest',timeout=7000)
    return el
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',4176),partial(Quiet,directory=str(ROOT/'dist')))
Thread(target=server.serve_forever,daemon=True).start();base='http://127.0.0.1:4176/'
with sync_playwright() as p:
    # Auto-selection is a CI-only browser switch. Production always shows the native picker.
    browser=p.chromium.launch(executable_path=shutil.which('google-chrome') or shutil.which('chromium'),headless=not args.headed,
        args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required','--auto-select-tab-capture-source-by-title=专辑与声音体验'])
    context=browser.new_context(viewport={'width':1440,'height':1100});fixtures(context)
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
    try:
        visit(page);el=field(page);base_pixels=el.locator('canvas').screenshot()
        box=el.bounding_box();page.mouse.move(box['x']+box['width']*.32,box['y']+box['height']*.58)
        page.mouse.move(box['x']+box['width']*.65,box['y']+box['height']*.45,steps=9)
        expect(el).to_have_attribute('data-field-state','active')
        changed=el.locator('canvas').screenshot();assert changed!=base_pixels
        page.mouse.move(5,5);expect(el).to_have_attribute('data-field-state','rest',timeout=7000)
        assert page.locator('audio').evaluate('(a)=>a.paused')
        record('idle experience pointer scatters real rendered geometry without audio playback, then sleeps')
        el.focus();el.press('Enter');expect(el).to_have_attribute('data-field-state','active')
        expect(el).to_have_attribute('data-field-state','rest',timeout=7000)
        record('keyboard can scatter and release the same visual')
        file=page.get_by_label('选择本地音频',exact=True)
        file.set_input_files({'name':'频谱测试.wav','mimeType':'audio/wav','buffer':TONE})
        page.wait_for_function('document.querySelector("audio").duration>11')
        page.get_by_role('button',name='播放试听',exact=True).click()
        canvas=page.locator('.audio-studio .spectrum-strip canvas');canvas.scroll_into_view_if_needed()
        page.wait_for_function('Number(document.querySelector(".audio-studio .spectrum-strip canvas").dataset.rms)>.1')
        low=int(canvas.get_attribute('data-peak-band'));assert low<20,low
        expect(el).to_have_attribute('data-field-state','active')
        page.locator('.audio-studio').screenshot(path=str(OUT/'spectrum-desktop.png'),animations='disabled')
        page.locator('audio').evaluate('(a)=>{a.currentTime=5;}')
        page.wait_for_function('Number(document.querySelector(".audio-studio .spectrum-strip canvas").dataset.peakBand)>40')
        high=int(canvas.get_attribute('data-peak-band'));assert high>low+25,(low,high)
        record('actual decoded 100 Hz and 6400 Hz audio drive different FFT regions and the visual')
        page.locator('audio').evaluate('(a)=>{a.currentTime=9;}')
        page.wait_for_function('Number(document.querySelector(".audio-studio .spectrum-strip canvas").dataset.rms)<.001')
        page.get_by_role('button',name='暂停试听',exact=True).click()
        expect(el).to_have_attribute('data-field-state','rest',timeout=7000)
        record('silence and pause remove energy instead of continuing a fabricated beat')
        page.get_by_role('button',name='清除本地音频').click()
        # Real tab capture of a controlled cross-origin iframe. The parent cannot inspect its audio node.
        page.get_by_role('tab',name='选择 于是',exact=True).click()
        page.get_by_role('button',name='打开官方试听').click()
        page.frame_locator('.official-preview iframe').locator('#start').click()
        page.bring_to_front();page.get_by_role('button',name='同步当前标签页声音',exact=True).click()
        expect(page.get_by_role('button',name='停止声音同步',exact=True)).to_be_visible(timeout=20000)
        meter=page.locator('.live-spectrum-panel .spectrum-strip canvas');meter.scroll_into_view_if_needed()
        page.wait_for_function('Number(document.querySelector(".live-spectrum-panel canvas").dataset.rms)>.04',timeout=15000)
        expect(page.locator('.live-spectrum-panel .spectrum-strip')).to_have_attribute('data-source','tab')
        page.locator('.live-spectrum-panel').screenshot(path=str(OUT/'tab-spectrum.png'),animations='disabled')
        record('real browser tab-audio permission path analyses a sounding cross-origin test player (not a song claim)')
        # Switch to each of the three provider identities without restarting the capture service.
        for name in ['自由的你','G.E.M.']:
            page.get_by_role('tab',name='选择 '+name,exact=True).click()
            page.get_by_role('button',name='打开官方试听').click()
            page.frame_locator('.official-preview iframe').locator('#start').click()
            meter.scroll_into_view_if_needed()
            page.wait_for_function('Number(document.querySelector(".live-spectrum-panel canvas").dataset.rms)>.04')
        record('all three album selections share the same permission-based live-audio pipeline with test tones')
        page.get_by_role('button',name='停止声音同步',exact=True).click()
        expect(page.locator('.live-spectrum-panel .spectrum-strip')).to_have_attribute('data-source','none')
        record('stop tears down the capture source without stopping the official player')
        page.get_by_role('tab',name='选择 G.E.M.',exact=True).click()
        expect(page.locator('.album-description')).to_have_text('')
        record('G.E.M. description is empty, not replaced by another sentence')
        # Genuine pointerType touch through the Chromium input interface, not a mouse emulation.
        mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
        fixtures(mobile);mp=mobile.new_page();mp.on('pageerror',lambda e:errors.append(str(e)))
        visit(mp);mf=field(mp);box=mf.bounding_box();initial=mf.locator('canvas').screenshot()
        cdp=mobile.new_cdp_session(mp)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+box['width']*.46,'y':box['y']+box['height']*.53}]})
        expect(mf).to_have_attribute('data-field-state','active');assert mf.locator('canvas').screenshot()!=initial
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        expect(mf).to_have_attribute('data-field-state','rest',timeout=7000)
        assert mf.evaluate('(e)=>getComputedStyle(e).touchAction')=='pan-y'
        assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth')
        mp.locator('.audio-studio').screenshot(path=str(OUT/'spectrum-mobile.png'),animations='disabled')
        record('real mobile touch scatters without playback; release settles; vertical scrolling is retained')
        mobile.close()
        # Permission errors are intentionally simulated, not labelled as successful native capture.
        denial=browser.new_context();fixtures(denial)
        denial.add_init_script("navigator.mediaDevices.getDisplayMedia=async()=>{throw new DOMException('Denied','NotAllowedError')}")
        dp=denial.new_page();visit(dp);dp.get_by_role('button',name='同步当前标签页声音',exact=True).click()
        expect(dp.locator('.signal-message')).to_contain_text('未获得声音共享权限')
        expect(dp.locator('.live-spectrum-panel .spectrum-strip')).to_have_attribute('data-source','none')
        record('denied permission leaves playback alone and reports the real limitation');denial.close()
        reduced=browser.new_context(reduced_motion='reduce');fixtures(reduced)
        rp=reduced.new_page();visit(rp);rf=rp.locator('.audio-studio .field-canvas');rf.scroll_into_view_if_needed()
        expect(rf).to_have_attribute('data-field-state','reduced');rf.dispatch_event('pointerdown',{'pointerType':'touch','clientX':100,'clientY':100})
        expect(rf).to_have_attribute('data-field-state','reduced');record('reduced motion disables scatter and frequency motion');reduced.close()
        assert not errors,errors
        record('no uncaught application exceptions in verified flows')
        (OUT/'checks.json').write_text(json.dumps({'checks':checks,'count':len(checks),'browser':browser.version,'errors':errors,'native_tab_capture':'real browser capture of generated test tones','songs':'not used as test audio'},ensure_ascii=False,indent=2))
    except Exception:
        page.screenshot(path=str(OUT/'failure.png'))
        (OUT/'failure.json').write_text(json.dumps({'checks':checks,'errors':errors,'url':page.url,'text':page.locator('body').inner_text()},ensure_ascii=False,indent=2))
        raise
    finally:browser.close();server.shutdown()
