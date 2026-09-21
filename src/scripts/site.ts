import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
const menu = document.querySelector<HTMLButtonElement>('.menu-button');
const mobileNav = document.querySelector<HTMLElement>('#mobile-nav');
const closeMenu = () => {
  if (!menu || !mobileNav) return;
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', '打开导航');
  mobileNav.hidden = true;
};
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
  if (mobileNav) mobileNav.hidden = !open;
});
mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
window.matchMedia('(min-width: 801px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
const toggle = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
const media = window.matchMedia('(prefers-reduced-motion: reduce)');
let context: gsap.Context | undefined;
function applyMotion() {
  const manual = document.documentElement.dataset.motion === 'reduce';
  toggle?.setAttribute('aria-pressed', String(manual || media.matches));
  toggle?.setAttribute('aria-label', media.matches ? '系统已启用减少动态' : manual ? '关闭减少动态' : '开启减少动态');
  context?.revert();
  if (!manual && !media.matches) {
    context = gsap.context(() => {
      gsap.fromTo('.reading-progress', {scaleX:0}, {scaleX:1,ease:'none',scrollTrigger:{trigger:document.documentElement,start:0,end:'max',scrub:0.3}});
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(element => {
        gsap.fromTo(element, {y:22}, {y:0,duration:0.8,ease:'power2.out',scrollTrigger:{trigger:element,start:'top 94%',once:true}});
      });
      document.querySelectorAll<HTMLElement>('[data-chapter]').forEach(element => {
        ScrollTrigger.create({trigger:element,start:'top 55%',end:'bottom 55%',onToggle:self => {
          const link = document.querySelector(`[data-chapter-link="${element.dataset.chapter}"]`);
          link?.classList.toggle('is-current',self.isActive);
        }});
      });
    });
  }
  window.dispatchEvent(new Event('auradio:motion'));
}
toggle?.addEventListener('click', () => {
  const next = document.documentElement.dataset.motion === 'reduce' ? 'auto' : 'reduce';
  document.documentElement.dataset.motion = next;
  try { localStorage.setItem('auradio.motion', next); } catch { /* Preferences remain usable without storage. */ }
  applyMotion();
});
media.addEventListener('change', applyMotion);
applyMotion();
window.addEventListener('pagehide', () => context?.revert(), {once:true});

window.addEventListener('pageshow', event => { if (event.persisted) applyMotion(); });
