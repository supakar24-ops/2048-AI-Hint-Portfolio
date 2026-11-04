import { useEffect, useRef } from 'react';
import { Icon } from './Icon';

export function GameDialog({ victory, score, canUndo, onContinue, onNew, onUndo }: { victory: boolean; score: number; canUndo: boolean; onContinue: () => void; onNew: () => void; onUndo: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div className="dialog-backdrop"><div className={`game-dialog ${victory ? 'victory-dialog' : ''}`} ref={dialog} role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" onKeyDown={(event) => {
    if (event.key === 'Escape') event.preventDefault();
    if (event.key !== 'Tab') return;
    const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    const first = buttons[0]; const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <span className="dialog-icon"><Icon name={victory ? 'spark' : 'grid'} size={34} /></span>
    <p className="eyebrow">{victory ? 'YOU MADE 2048' : 'A GOOD RUN'}</p>
    <h2 id="dialog-title">{victory ? 'Congratulations!' : 'Game Over'}</h2>
    <p id="dialog-description">{victory ? 'ถึง 2048 แล้ว! พร้อมไปต่อให้ไกลกว่าเดิมไหม?' : 'ไม่มีทิศทางที่เดินต่อได้ ลองเริ่มใหม่หรือย้อนตาล่าสุด'}</p>
    <div className="dialog-score"><span>{victory ? 'CURRENT SCORE' : 'FINAL SCORE'}</span><strong>{score.toLocaleString()}</strong></div>
    {victory && <button className="button primary" onClick={onContinue}>Continue Playing <Icon name="arrow" size={18} /></button>}
    <button className={`button ${victory ? 'secondary' : 'primary'}`} onClick={onNew}>New Game <Icon name="refresh" size={18} /></button>
    {canUndo && <button className="button text-button" onClick={onUndo}><Icon name="undo" size={18} /> Undo last move</button>}
  </div></div>;
}
