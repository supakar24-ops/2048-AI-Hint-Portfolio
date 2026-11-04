import { useLayoutEffect, useState, type CSSProperties, type PointerEvent } from 'react';
import { swipeDirection } from '../game/input';
import type { Board as BoardValues, Direction } from '../game/board';
import type { BoardAnimation } from '../game/state';

function Tile({ value, cell, from = cell, motion = false, fresh = false, merged = false }: { value: number; cell: number; from?: number; motion?: boolean; fresh?: boolean; merged?: boolean }) {
  const style = {
    '--x': cell % 4, '--y': Math.floor(cell / 4),
    '--dx': from % 4 - cell % 4, '--dy': Math.floor(from / 4) - Math.floor(cell / 4),
  } as CSSProperties;
  const level = Math.min(11, Math.log2(value));
  return <div aria-hidden="true" style={style} className={`tile tile-${level} ${value >= 1024 ? 'tile-small' : ''} ${value >= 100000 ? 'tile-tiny' : ''} ${motion ? 'tile-motion' : ''} ${fresh ? 'tile-new' : ''} ${merged ? 'tile-merged' : ''}`}><span>{value}</span></div>;
}

export function Board({ values, animation, onMove }: { values: BoardValues; animation: BoardAnimation | null; onMove: (direction: Direction) => void }) {
  const [moving, setMoving] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number; id: number } | null>(null);
  useLayoutEffect(() => {
    if (!animation || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setMoving(false); return; }
    setMoving(true);
    const timer = window.setTimeout(() => setMoving(false), 135);
    return () => window.clearTimeout(timer);
  }, [animation]);
  function begin(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' || !event.isPrimary) return;
    setStart({ x: event.clientX, y: event.clientY, id: event.pointerId });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function end(event: PointerEvent<HTMLDivElement>) {
    if (!start || event.pointerId !== start.id) return;
    const direction = swipeDirection(start.x, start.y, event.clientX, event.clientY);
    setStart(null);
    if (direction) onMove(direction);
  }
  return <div className="board-wrap">
    <div className="board" role="group" aria-label="กระดาน 2048 ขนาด 4 คูณ 4 ใช้ปุ่มลูกศรหรือปัดเพื่อเล่น" tabIndex={0} onPointerDown={begin} onPointerUp={end} onPointerCancel={() => setStart(null)} data-testid="board">
      <div className="board-cells" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <div className="board-cell" key={i} />)}</div>
      <div className="tile-layer" key={animation?.id ?? 'initial'}>
        {moving && animation ? animation.move.motions.map((tile) => <Tile key={`from-${tile.from}`} value={tile.value} cell={tile.to} from={tile.from} motion />) : values.map((value, cell) => value ? <Tile key={cell} value={value} cell={cell} fresh={animation?.spawned === cell} merged={animation?.move.mergedCells.includes(cell)} /> : null)}
      </div>
      <table className="sr-only"><caption>ค่าบนกระดาน</caption><tbody>{Array.from({ length: 4 }, (_, row) => <tr key={row}>{values.slice(row * 4, row * 4 + 4).map((value, col) => <td key={col}>{value || 'ว่าง'}</td>)}</tr>)}</tbody></table>
    </div>
  </div>;
}
