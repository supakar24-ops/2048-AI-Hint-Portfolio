import { useCallback, useEffect, useState } from 'react';
import { applyMove, continueGame, newGame, undoMove, type BoardAnimation } from './state';
import { browserStorage, loadGame, saveGame } from './storage';
import type { Direction } from './board';

export function useGame() {
  const [storage] = useState(browserStorage);
  const [scene, setScene] = useState(() => {
    const loaded = loadGame(storage);
    return { game: loaded.game ?? newGame(loaded.best), animation: null as BoardAnimation | null, version: 0, notice: loaded.notice };
  });
  const [saved, setSaved] = useState(true);
  useEffect(() => { setSaved(saveGame(scene.game, storage)); }, [scene.game, storage]);
  const play = useCallback((direction: Direction) => {
    // Capture RNG outside React's updater: React may replay an updater in dev.
    const randomValues = [Math.random(), Math.random()];
    setScene((previous) => {
      let randomIndex = 0;
      const transition = applyMove(previous.game, direction, () => randomValues[randomIndex++]);
      if (!transition.move) return previous;
      return { ...previous, game: transition.game, animation: { id: previous.version + 1, move: transition.move, spawned: transition.spawned }, version: previous.version + 1 };
    });
  }, []);
  const restart = useCallback(() => {
    const fresh = newGame();
    setScene((previous) => ({ ...previous, game: { ...fresh, best: previous.game.best }, animation: null, version: previous.version + 1, notice: 'new' }));
  }, []);
  const undo = useCallback(() => setScene((previous) => previous.game.undo ? ({ ...previous, game: undoMove(previous.game), animation: null, version: previous.version + 1 }) : previous), []);
  const resume = useCallback(() => setScene((previous) => ({ ...previous, game: continueGame(previous.game) })), []);
  return { ...scene, saved, play, restart, undo, resume };
}
