import { useSyncExternalStore } from 'react';

const getServerSnapshot = () => false;
function getSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset.motion === 'reduce';
}
function subscribe(notify: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', notify);
  window.addEventListener('auradio:motion', notify);
  return () => {
    media.removeEventListener('change', notify);
    window.removeEventListener('auradio:motion', notify);
  };
}
/** Keep the first client snapshot identical to SSR, then apply browser preferences. */
export function useMotionPreference() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
