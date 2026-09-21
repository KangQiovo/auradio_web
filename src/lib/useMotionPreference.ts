import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
export function useMotionPreference() {
  const system = useReducedMotion();
  const [manual, setManual] = useState(false);
  useEffect(() => {
    const update = () => setManual(document.documentElement.dataset.motion === 'reduce');
    update();
    window.addEventListener('auradio:motion', update);
    return () => window.removeEventListener('auradio:motion', update);
  }, []);
  return Boolean(system || manual);
}
