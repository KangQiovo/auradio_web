import type { CSSProperties } from 'react';
type Name = 'play' | 'pause' | 'upload' | 'volume' | 'expand' | 'arrow' | 'next' | 'close' | 'check';
const paths: Record<Name, string> = {
  play:'m8 5 11 7-11 7V5Z', pause:'M8 5v14M16 5v14',
  upload:'M12 16V4m-5 5 5-5 5 5M4 15v5h16v-5',
  volume:'M4 9h4l5-4v14l-5-4H4V9Zm13-2c3 3 3 7 0 10',
  expand:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  arrow:'M4 12h15m-6-6 6 6-6 6', next:'m5 5 10 7-10 7V5Zm14 0v14',
  close:'m6 6 12 12M6 18 18 6', check:'m5 12 4 4L19 6',
};
export function Icon({name,style}:{name:Name;style?:CSSProperties}) {
  return <svg style={style} className="icon" width="24" height="24" viewBox="0 0 24 24" fill={name === 'play' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
