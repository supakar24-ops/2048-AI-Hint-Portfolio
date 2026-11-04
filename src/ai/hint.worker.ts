import { findHint } from './expectimax';
import type { Board } from '../game/board';

const scope = self as unknown as { onmessage: ((event: MessageEvent<{ id: number; board: Board }>) => void) | null; postMessage: (message: unknown) => void };
scope.onmessage = ({ data }) => {
  try { scope.postMessage({ id: data.id, result: findHint(data.board) }); }
  catch { scope.postMessage({ id: data.id, error: true }); }
};
