import { expect, it } from 'vitest';
import { findHint } from '../src/ai/expectimax';
import { legalMoves } from '../src/game/board';

it('measures the default search on fixed boards (one warm-up + five measured runs)', () => {
  const fixtures = {
    opening: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
    midgame: [128, 64, 16, 4, 64, 32, 8, 0, 16, 8, 0, 0, 4, 0, 0, 0],
    crowded: [512, 256, 128, 64, 256, 128, 64, 32, 128, 64, 32, 16, 4, 2, 0, 0],
    single: [2, 4, 8, 0, 4, 8, 16, 0, 8, 16, 32, 0, 16, 32, 64, 0],
    terminal: [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2],
  };
  const rows = Object.entries(fixtures).map(([name, board]) => {
    const baseline = findHint(board);
    const samples: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now(); const result = findHint(board); samples.push(performance.now() - start);
      expect(result).toEqual(baseline);
      if (result.direction) expect(legalMoves(board)).toContain(result.direction);
    }
    samples.sort((a, b) => a - b);
    return { board: name, p50_ms: +samples[2].toFixed(2), max_ms: +samples[4].toFixed(2), depth: `${baseline.search.completedDepth}/${baseline.search.requestedDepth}`, nodes: baseline.search.nodes, cacheHits: baseline.search.cacheHits, direction: baseline.direction ?? 'none' };
  });
  console.table(rows);
}, 30000);
