import { useEffect, useRef, useState } from 'react';
import type { Board } from '../game/board';
import { findHint, type HintResult } from './expectimax';

export type HintPhase = 'ready' | 'analyzing' | 'available' | 'no-moves';
export interface HintState { version: number; phase: HintPhase; result: HintResult | null; fallback: boolean }

export function useHint(board: Board, version: number, blocked: boolean, over: boolean) {
  const [auto, setAuto] = useState(false);
  const [manual, setManual] = useState<{ version: number; sequence: number } | null>(null);
  const requestId = useRef(0);
  const [state, setState] = useState<HintState>({ version, phase: 'ready', result: null, fallback: false });
  useEffect(() => {
    const id = ++requestId.current;
    if (over) { setState({ version, phase: 'no-moves', result: null, fallback: false }); return; }
    if (blocked || (!auto && manual?.version !== version)) {
      setState({ version, phase: 'ready', result: null, fallback: false }); return;
    }
    let active = true; let finished = false; let worker: Worker | null = null;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    setState({ version, phase: 'analyzing', result: null, fallback: false });
    const finish = (result: HintResult, fallback: boolean) => {
      if (!active || finished || id !== requestId.current) return;
      finished = true;
      clearTimeout(watchdog); worker?.terminate();
      setState({ version, phase: result.direction ? 'available' : 'no-moves', result, fallback });
    };
    // If Workers are unavailable, use a small, explicitly reported search budget.
    const fallback = () => {
      if (!active || finished) return;
      worker?.terminate();
      finish(findHint(board, { maxDepth: 1, maxNodes: 512 }), true);
    };
    const debounce = setTimeout(() => {
      if (!active) return;
      try {
        worker = new Worker(new URL('./hint.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event: MessageEvent<{ id: number; result?: HintResult }>) => {
          if (event.data.id !== id || !active || finished) return;
          if (event.data.result) finish(event.data.result, false); else fallback();
        };
        worker.onerror = (event) => { event.preventDefault(); fallback(); };
        watchdog = setTimeout(fallback, 4000);
        worker.postMessage({ id, board: [...board] });
      } catch { fallback(); }
    }, auto ? 110 : 0);
    return () => {
      active = false;
      clearTimeout(debounce); clearTimeout(watchdog); worker?.terminate();
    };
  }, [board, version, auto, manual, blocked, over]);

  const current: HintState = over ? { version, phase: 'no-moves', result: null, fallback: false }
    : state.version === version && !blocked ? state : { version, phase: 'ready', result: null, fallback: false };
  return { ...current, auto, setAuto: (enabled: boolean) => { setManual(null); setAuto(enabled); }, request: () => setManual((previous) => ({ version, sequence: (previous?.sequence ?? 0) + 1 })) };
}
