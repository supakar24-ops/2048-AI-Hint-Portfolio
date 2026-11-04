export type IconName = 'spark' | 'undo' | 'refresh' | 'arrow' | 'check' | 'shield' | 'keyboard' | 'chevron' | 'grid' | 'sun' | 'moon';
export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    moon: <path d="M20.4 14.1A8.8 8.8 0 0 1 9.9 3.6a8.8 8.8 0 1 0 10.5 10.5Z" />,
    spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /><path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5L20 2Z" /></>,
    undo: <><path d="M9 5 4 10l5 5" /><path d="M4 10h10a6 6 0 0 1 0 12" transform="translate(0 -3)" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
    keyboard: <><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M6 9h1m4 0h1m4 0h1M6 13h1m4 0h1m4 0h1M8 16h8" /></>,
    chevron: <path d="m9 5 7 7-7 7" />,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
