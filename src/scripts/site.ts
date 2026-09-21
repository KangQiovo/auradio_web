const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
const button = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
function syncControls() {
  const quiet = document.documentElement.dataset.motion === 'reduced';
  if (button) {
    button.hidden = false;
    button.setAttribute('aria-pressed', String(quiet));
    const label = button.querySelector('[data-motion-label]');
    if (label) label.textContent = quiet ? '动态已减少' : '减少动态';
  }
  window.dispatchEvent(new Event('auradio:motion'));
}
button?.addEventListener('click', () => {
  const next = document.documentElement.dataset.motion === 'reduced' ? 'full' : 'reduced';
  document.documentElement.dataset.motion = next;
  try { localStorage.setItem('auradio-web-motion', next); } catch { /* Privacy mode can block storage. */ }
  syncControls();
});
preference.addEventListener('change', () => {
  let manual = false;
  try { manual = !!localStorage.getItem('auradio-web-motion'); } catch {}
  if (!manual) { document.documentElement.dataset.motion = preference.matches ? 'reduced' : 'full'; syncControls(); }
});
syncControls();

if (document.querySelector('[data-reveal]')) {
  Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
    gsap.registerPlugin(ScrollTrigger);
    let context: ReturnType<typeof gsap.context> | undefined;
    function setup() {
      context?.revert();
      if (document.documentElement.dataset.motion === 'reduced') return;
      context = gsap.context(() => {
        document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(element => {
          gsap.fromTo(element, { y: 26, opacity: .25 }, { y: 0, opacity: 1, duration: .85, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 92%', once: true } });
        });
        if (document.querySelector('.listening-manifesto')) {
          gsap.fromTo('.manifesto-word', { opacity: .22 }, { opacity: 1, stagger: .3, ease: 'none', scrollTrigger: { trigger: '.listening-manifesto', start: 'top 78%', end: 'bottom 58%', scrub: .65 } });
          gsap.to('.groove-lines', { xPercent: -12, ease: 'none', scrollTrigger: { trigger: '.listening-manifesto', start: 'top bottom', end: 'bottom top', scrub: 1 } });
        }
      });
    }
    setup();
    window.addEventListener('auradio:motion', setup);
    window.addEventListener('pagehide', () => context?.revert());
    window.addEventListener('pageshow', event => { if (event.persisted) setup(); });
  }).catch(() => { /* Content remains available even if animation modules fail. */ });
}
