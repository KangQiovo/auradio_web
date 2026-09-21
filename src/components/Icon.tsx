type IconName = 'arrow' | 'play' | 'pause' | 'upload' | 'expand' | 'close' | 'volume' | 'reset' | 'check';
const paths: Record<IconName, React.ReactNode> = {
  arrow: <><path d="M5 12h14M12 5l7 7-7 7" /></>,
  play: <path d="m8 5 11 7-11 7Z" fill="currentColor" strokeWidth="0" />,
  pause: <><path d="M8 5v14M16 5v14" strokeWidth="3" /></>,
  upload: <><path d="M12 16V4m-5 5 5-5 5 5M5 16v4h14v-4" /></>,
  expand: <><path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4" /></>,
  close: <><path d="m6 6 12 12M6 18 18 6" /></>,
  volume: <><path d="m11 5-6 4H2v6h3l6 4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
  reset: <><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" /></>,
  check: <path d="m5 12 4 4L19 6" />,
};
export default function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
