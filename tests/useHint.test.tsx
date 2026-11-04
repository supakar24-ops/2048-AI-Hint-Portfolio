// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHint } from '../src/ai/useHint';
import { findHint, type HintResult } from '../src/ai/expectimax';
import { type Board } from '../src/game/board';

class ControlledWorker {
  static instances: ControlledWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: { id: number; board: Board } | null = null;
  terminate = vi.fn();
  constructor() { ControlledWorker.instances.push(this); }
  postMessage(data: { id: number; board: Board }) { this.posted = data; }
  respond(result: HintResult = findHint(this.posted!.board, { maxDepth: 1 })) {
    this.onmessage?.({ data: { id: this.posted!.id, result } } as MessageEvent);
  }
}
const initial = [2, 2, ...Array<number>(14).fill(0)];
const next = [4, 2, ...Array<number>(14).fill(0)];
beforeEach(() => { ControlledWorker.instances = []; vi.stubGlobal('Worker', ControlledWorker); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('hint requests and cancellation', () => {
  it('starts Ready with Auto Hint off and never calculates without a request', () => {
    const { result } = renderHook(() => useHint(initial, 0, false, false));
    expect(result.current.phase).toBe('ready'); expect(result.current.auto).toBe(false);
    expect(ControlledWorker.instances).toHaveLength(0);
  });
  it('manual hint analyzes without mutating or playing the board', async () => {
    const saved = [...initial];
    const { result } = renderHook(() => useHint(initial, 0, false, false));
    act(() => result.current.request());
    expect(result.current.phase).toBe('analyzing');
    await waitFor(() => expect(ControlledWorker.instances).toHaveLength(1));
    act(() => ControlledWorker.instances[0].respond());
    expect(result.current.phase).toBe('available'); expect(result.current.result?.direction).toBeTruthy();
    expect(initial).toEqual(saved);
  });
  it('rejects stale results after a move and does not automatically rerun a manual hint', async () => {
    const { result, rerender } = renderHook(({ board, version }) => useHint(board, version, false, false), { initialProps: { board: initial, version: 0 } });
    act(() => result.current.request());
    await waitFor(() => expect(ControlledWorker.instances).toHaveLength(1));
    const stale = ControlledWorker.instances[0];
    rerender({ board: next, version: 1 });
    act(() => stale.respond());
    expect(stale.terminate).toHaveBeenCalled(); expect(result.current.result).toBeNull();
    expect(result.current.phase).toBe('ready'); expect(ControlledWorker.instances).toHaveLength(1);
  });
  it('auto recalculates after move, undo and new game versions, even with the same board', async () => {
    const { result, rerender } = renderHook(({ board, version }) => useHint(board, version, false, false), { initialProps: { board: initial, version: 0 } });
    act(() => result.current.setAuto(true));
    await waitFor(() => expect(ControlledWorker.instances).toHaveLength(1));
    rerender({ board: next, version: 1 });
    await waitFor(() => expect(ControlledWorker.instances).toHaveLength(2));
    rerender({ board: initial, version: 2 });
    await waitFor(() => expect(ControlledWorker.instances).toHaveLength(3));
    rerender({ board: initial, version: 3 });
    await waitFor(() => expect(ControlledWorker.instances).toHaveLength(4));
    act(() => ControlledWorker.instances[3].respond());
    expect(result.current.phase).toBe('available');
    expect(result.current.result).toEqual(findHint(initial, { maxDepth: 1 }));
  });
  it('ignores results from a different request id', async () => {
    const { result } = renderHook(() => useHint(initial, 0, false, false));
    act(() => result.current.request());
    await waitFor(() => expect(ControlledWorker.instances).toHaveLength(1));
    const worker = ControlledWorker.instances[0];
    act(() => worker.onmessage?.({ data: { id: -1, result: findHint(initial, { maxDepth: 1 }) } } as MessageEvent));
    expect(result.current.phase).toBe('analyzing');
    act(() => worker.respond()); expect(result.current.phase).toBe('available');
  });
  it('turning auto off cancels pending work and stops recalculation', async () => {
    const { result, rerender } = renderHook(({ version }) => useHint(initial, version, false, false), { initialProps: { version: 0 } });
    act(() => result.current.setAuto(true));
    await waitFor(() => expect(ControlledWorker.instances).toHaveLength(1));
    const worker = ControlledWorker.instances[0];
    act(() => result.current.setAuto(false));
    act(() => worker.respond());
    expect(worker.terminate).toHaveBeenCalled(); expect(result.current.result).toBeNull();
    rerender({ version: 1 }); expect(ControlledWorker.instances).toHaveLength(1);
  });
  it('over state has no valid move and never starts a worker', () => {
    const { result } = renderHook(() => useHint(initial, 0, true, true));
    act(() => { result.current.setAuto(true); result.current.request(); });
    expect(result.current.phase).toBe('no-moves'); expect(ControlledWorker.instances).toHaveLength(0);
  });
  it('uses a bounded, legal fallback if Worker is unavailable', async () => {
    vi.stubGlobal('Worker', undefined);
    const { result } = renderHook(() => useHint(initial, 0, false, false));
    act(() => result.current.request());
    await waitFor(() => expect(result.current.phase).toBe('available'));
    expect(result.current.fallback).toBe(true); expect(result.current.result?.search.nodes).toBeLessThanOrEqual(512);
  });
  it('handles worker failures and returns a result once', async () => {
    const { result } = renderHook(() => useHint(initial, 0, false, false));
    act(() => result.current.request());
    await waitFor(() => expect(ControlledWorker.instances).toHaveLength(1));
    act(() => ControlledWorker.instances[0].onerror?.({ preventDefault() {} } as ErrorEvent));
    const fallback = result.current.result;
    act(() => ControlledWorker.instances[0].respond());
    expect(result.current.fallback).toBe(true); expect(result.current.result).toBe(fallback);
  });
  it('terminates an unresponsive worker after four seconds and uses the safe fallback', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useHint(initial, 0, false, false));
    act(() => result.current.request());
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(ControlledWorker.instances).toHaveLength(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(result.current.phase).toBe('available'); expect(result.current.fallback).toBe(true);
    expect(ControlledWorker.instances[0].terminate).toHaveBeenCalled();
  });
});
