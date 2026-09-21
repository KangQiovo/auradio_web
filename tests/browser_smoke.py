"""Exercise the production build over HTTP. Run after `npm run build` and preview."""
import asyncio
import io
import json
import math
import os
from pathlib import Path
import struct
import wave
from playwright.async_api import async_playwright, expect

BASE = os.environ.get('SITE_URL', 'http://127.0.0.1:4321/auradio_web/')
OUT = Path(os.environ.get('QA_OUTPUT', 'test-results'))
OUT.mkdir(exist_ok=True)

def wav_sample():
    memory = io.BytesIO()
    with wave.open(memory, 'wb') as wav:
        wav.setparams((1, 2, 22050, 0, 'NONE', 'not compressed'))
        wav.writeframes(b''.join(struct.pack('<h', int(math.sin(i / 22050 * 2 * math.pi * 220) * 1200)) for i in range(44100)))
    return memory.getvalue()

async def main():
    checks = []
    errors = []
    requests = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        context = await browser.new_context(viewport={'width': 1440, 'height': 1000})
        page = await context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append((request.method, request.url)))
        response = await page.goto(BASE, wait_until='networkidle')
        assert response and response.status == 200
        await expect(page.locator('h1')).to_contain_text('按你的')
        await expect(page.locator('.listening-room')).to_have_attribute('data-renderer', 'webgl', timeout=15000)
        await page.wait_for_timeout(800)
        await page.screenshot(path=str(OUT / 'desktop-hero.png'))
        checks.append('Desktop page and real WebGL renderer')

        await page.get_by_role('button', name='开始试听', exact=True).click()
        await expect(page.locator('.listening-room')).to_have_attribute('data-playing', 'true')
        await page.wait_for_timeout(1200)
        assert float(await page.get_by_label('播放进度', exact=True).input_value()) > .2
        await page.get_by_role('button', name='暂停试听', exact=True).click()
        paused = float(await page.get_by_label('播放进度', exact=True).input_value())
        await page.wait_for_timeout(400)
        assert abs(float(await page.get_by_label('播放进度', exact=True).input_value()) - paused) < .15
        seek = page.get_by_label('播放进度', exact=True)
        await seek.focus()
        await seek.press('End')
        assert float(await seek.input_value()) == 28
        await seek.press('Home')
        assert float(await seek.input_value()) == 0
        await page.get_by_label('音量', exact=True).focus()
        await page.get_by_label('音量', exact=True).press('End')
        assert float(await page.get_by_label('音量', exact=True).input_value()) == 1
        checks.append('Real audio play, progress, pause, seek and volume')

        for i, name in enumerate(['涟漪', '交织', '回声']):
            await page.get_by_role('button', name=name, exact=True).click()
            await expect(page.locator('.listening-room')).to_have_attribute('data-mode', str(i))
        await page.get_by_role('button', name='全屏体验', exact=True).click()
        await page.wait_for_timeout(500)
        assert await page.evaluate('!!document.fullscreenElement')
        await page.get_by_role('button', name='退出全屏', exact=True).click()
        checks.append('Three visual modes and fullscreen enter/exit')

        picker = page.get_by_label('选择本地音频文件', exact=True)
        await picker.set_input_files({'name': 'local-smoke.wav', 'mimeType': 'audio/wav', 'buffer': wav_sample()})
        await expect(page.locator('.track-meta strong')).to_have_text('local-smoke')
        await page.get_by_role('button', name='开始试听', exact=True).click()
        await page.wait_for_timeout(300)
        await page.get_by_role('button', name='暂停试听', exact=True).click()
        await picker.set_input_files({'name': 'not-audio.txt', 'mimeType': 'text/plain', 'buffer': b'not audio'})
        await expect(page.get_by_role('status')).to_contain_text('请选择音频文件')
        await page.get_by_role('button', name='恢复示例', exact=True).click()
        await expect(page.locator('.track-meta strong')).to_have_text('A little room')
        assert not any(method != 'GET' or 'local-smoke' in url for method, url in requests)
        checks.append('Local WAV decoding, playback, invalid file and reset; no upload requests')

        await page.locator('#interfaces').scroll_into_view_if_needed()
        await page.get_by_role('tab', name='02 Liquid').click()
        await expect(page.locator('.theme-studio')).to_have_attribute('data-theme', 'liquid')
        await page.wait_for_timeout(500)
        await page.screenshot(path=str(OUT / 'desktop-theme.png'))
        await page.get_by_role('button', name='专辑', exact=True).click()
        await expect(page.get_by_role('button', name='专辑', exact=True)).to_have_attribute('aria-pressed', 'true')
        await expect(page.locator('.study-row').filter(has_text='Room studies')).to_be_visible()
        await page.get_by_role('button', name='收藏示例', exact=True).click()
        await expect(page.get_by_role('button', name='取消收藏示例', exact=True)).to_have_attribute('aria-pressed', 'true')
        await page.get_by_role('tab', name='02 Liquid').focus()
        await page.keyboard.press('ArrowDown')
        await expect(page.locator('.theme-studio')).to_have_attribute('data-theme', 'material')
        await page.locator('.faq summary').first.click()
        assert await page.locator('.faq').first.evaluate('(el) => el.open')
        checks.append('Theme transitions, keyboard tabs, album view, favorite and FAQ')

        await page.get_by_role('button', name='减少动态', exact=True).click()
        await expect(page.locator('html')).to_have_attribute('data-motion', 'reduced')
        await page.reload(wait_until='networkidle')
        await expect(page.locator('html')).to_have_attribute('data-motion', 'reduced')
        await page.wait_for_timeout(800)
        first = await page.locator('canvas').screenshot()
        await page.wait_for_timeout(500)
        assert first == await page.locator('canvas').screenshot()
        checks.append('Reduced motion persistence and static WebGL output')

        for route in ['experience/', 'updates/', 'about/', 'privacy/']:
            response = await page.goto(BASE + route, wait_until='networkidle')
            assert response and response.status == 200
            assert await page.locator('h1').count() == 1
        checks.append('All content routes return HTTP 200')

        for width in [320, 390, 768]:
            mobile_context = await browser.new_context(viewport={'width': width, 'height': 844}, is_mobile=True, has_touch=True)
            mobile = await mobile_context.new_page()
            mobile.on('pageerror', lambda error: errors.append(str(error)))
            await mobile.goto(BASE, wait_until='networkidle')
            assert not await mobile.evaluate('document.documentElement.scrollWidth > innerWidth')
            if width == 390:
                await mobile.screenshot(path=str(OUT / 'mobile-hero.png'))
                await mobile.locator('#interfaces').scroll_into_view_if_needed()
                await mobile.wait_for_timeout(600)
                await mobile.screenshot(path=str(OUT / 'mobile-theme.png'))
            if width < 680:
                await mobile.locator('.mobile-nav summary').click()
                await mobile.get_by_role('navigation', name='移动导航').get_by_role('link', name='体验', exact=True).click()
                await expect(mobile).to_have_url(BASE + 'experience/')
            await mobile_context.close()
        checks.append('320 / 390 / 768 pixel layouts and real mobile navigation')

        nojs = await browser.new_context(java_script_enabled=False)
        plain = await nojs.new_page()
        await plain.goto(BASE)
        await expect(plain.locator('body')).to_contain_text('自己的秩序')
        await plain.locator('.faq summary').first.click()
        assert await plain.locator('.faq').first.evaluate('(el) => el.open')
        checks.append('No-JavaScript content and native FAQ')

        fallback = await browser.new_context()
        await fallback.add_init_script("const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind.startsWith('webgl')?null:original.call(this,kind,...args)}")
        fallback_page = await fallback.new_page()
        fallback_page.on('pageerror', lambda error: errors.append(str(error)))
        await fallback_page.goto(BASE, wait_until='networkidle')
        await expect(fallback_page.locator('.listening-room')).to_have_attribute('data-renderer', 'static')
        await fallback_page.get_by_role('button', name='开始试听', exact=True).click()
        await expect(fallback_page.locator('.listening-room')).to_have_attribute('data-playing', 'true')
        checks.append('WebGL-unavailable static fallback remains playable')
        assert not errors, '\n'.join(errors)
        checks.append('No uncaught browser runtime errors')
        await browser.close()
    report = {'passed': checks, 'errors': errors, 'viewport': [1440, 1000], 'browser': 'Playwright Chromium'}
    (OUT / 'browser-results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))

asyncio.run(main())
