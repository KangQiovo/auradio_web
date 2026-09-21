import { useEffect, useState } from 'react';
export function useQuietMotion() {
  const [quiet, setQuiet] = useState(true);
  useEffect(() => {
    const sync = () => setQuiet(document.documentElement.dataset.motion === 'reduced');
    sync();
    window.addEventListener('auradio:motion', sync);
    return () => window.removeEventListener('auradio:motion', sync);
  }, []);
  return quiet;
}
