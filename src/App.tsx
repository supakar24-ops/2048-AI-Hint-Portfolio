import { useEffect } from 'react';
import { Board } from './components/Board';
import { GameDialog } from './components/GameDialog';
import { HintPanel } from './components/HintPanel';
import { Icon } from './components/Icon';
import { ThemeToggle } from './components/ThemeToggle';
import { useHint } from './ai/useHint';
import { directionForKey } from './game/input';
import { useGame } from './game/useGame';

function ScoreDisplay({ score, best }: { score: number; best: number }) {
  return (
    <div className="score-group">
      <div className="score-card">
        <span>SCORE</span>
        <strong data-testid="score">{score.toLocaleString()}</strong>
      </div>
      <div className="score-card best-card">
        <span><Icon name="spark" size={13} /> BEST</span>
        <strong data-testid="best">{best.toLocaleString()}</strong>
      </div>
    </div>
  );
}

function HowToPlay() {
  return (
    <section className="how-card">
      <span className="eyebrow">A MOMENT TO LEARN</span>
      <h2>Easy to play.<br />Room to get better.</h2>
      <div className="how-step">
        <span>01</span><p><strong>Make a move</strong>ใช้ปุ่มลูกศรหรือปัดเพื่อเลื่อน Tile</p>
      </div>
      <div className="how-step">
        <span>02</span><p><strong>Find your match</strong>เลขเดียวกันรวมกันเป็นสองเท่า</p>
      </div>
      <div className="how-step">
        <span>03</span><p><strong>Think ahead</strong>เว้นพื้นที่ว่าง แล้วค่อย ๆ ไปถึง 2048</p>
      </div>
      <div className="merge-example" aria-label="2 บวก 2 รวมเป็น 4">
        <span>2</span><i>+</i><span>2</span><Icon name="arrow" size={18} /><span>4</span>
      </div>
    </section>
  );
}

export default function App() {
  const { game, animation, version, notice, saved, play, restart, undo, resume } = useGame();
  const showVictory = game.won && !game.continued;
  const showDialog = showVictory || game.over;
  const hint = useHint(game.board, version, showDialog, game.over);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const editing = target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '');
      if (event.ctrlKey || event.altKey || event.metaKey || showDialog || editing) return;
      const direction = directionForKey(event.key);
      if (direction) {
        event.preventDefault();
        play(direction);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [play, showDialog]);

  const saveMessage = !saved
    ? 'เล่นต่อได้ แต่เบราว์เซอร์บันทึกเกมไม่ได้'
    : notice === 'invalid'
      ? 'ข้อมูลบันทึกไม่สมบูรณ์ เริ่มเกมใหม่ให้แล้ว'
      : notice === 'restored'
        ? 'โหลดเกมล่าสุดแล้ว · บันทึกอัตโนมัติ'
        : 'บันทึกอัตโนมัติในเบราว์เซอร์นี้';

  return (
    <>
      <div className="app-shell" inert={showDialog ? true : undefined}>
        <header className="site-header">
          <a className="brand" href="/" aria-label="2048 AI Hint หน้าแรก">
            <span className="brand-mark"><Icon name="grid" size={22} /></span>
            <span>2048 <span className="brand-light">AI Hint</span></span>
          </a>
          <div className="header-actions">
            <span className="header-note"><span className="status-dot" /> A little help. Your next move.</span>
            <ThemeToggle />
          </div>
        </header>

        <main className="main-content">
          <div className="intro">
            <div>
              <p className="eyebrow">THE CLASSIC GAME. A SMARTER COMPANION.</p>
              <h1>Small tiles.<br /><span>Big possibilities.</span></h1>
              <p className="intro-copy">เลื่อน รวม และคิดไปอีกหนึ่งก้าว<br className="mobile-break" /> พร้อมเพื่อนช่วยมองเกมให้ไกลขึ้น</p>
            </div>
            <ScoreDisplay score={game.score} best={game.best} />
          </div>

          <div className="game-layout">
            <section className="play-area" aria-label="เกม 2048">
              <div className="board-toolbar">
                <span><span className="status-dot" /> {game.continued ? 'Keep going beyond 2048' : 'Join the tiles. Reach 2048.'}</span>
                <span className="board-size">4 × 4</span>
              </div>
              <Board values={game.board} animation={animation} onMove={play} />
              <div className="game-controls">
                <button className="button secondary" onClick={undo} disabled={!game.undo}>
                  <Icon name="undo" size={18} /> Undo
                </button>
                <button className="button new-game" onClick={restart}>
                  <Icon name="refresh" size={18} /> New Game
                </button>
              </div>
              <p className="board-caption">
                <Icon name="keyboard" size={16} /> Arrow keys to move <span>·</span> Swipe on mobile
              </p>
              <div className="direction-pad" aria-label="ปุ่มทิศทาง">
                {(['up', 'left', 'down', 'right'] as const).map((direction) => (
                  <button className={`direction-key direction-${direction}`} key={direction} aria-label={`Move ${direction}`} onClick={() => play(direction)}>
                    <Icon name="arrow" size={18} />
                  </button>
                ))}
              </div>
              <p className={`save-status ${saved ? '' : 'save-unavailable'}`} role="status">
                <Icon name={saved ? 'check' : 'shield'} size={13} />{saveMessage}
              </p>
              <p className="sr-only" aria-live="polite">คะแนน {game.score} ย้อนกลับได้ {game.undo ? 'หนึ่งตา' : 'ไม่มี'}</p>
            </section>

            <aside className="side-panel">
              <HintPanel
                phase={hint.phase}
                result={hint.result}
                auto={hint.auto}
                fallback={hint.fallback}
                blocked={showDialog}
                onRequest={hint.request}
                onAuto={hint.setAuto}
              />
              <HowToPlay />
            </aside>
          </div>
        </main>

        <footer className="site-footer">
          <span>2048 AI Hint <span className="footer-separator">/</span> Built for curious minds.</span>
          <span>Made to play. Designed to learn.</span>
        </footer>
      </div>
      {showDialog && (
        <GameDialog
          victory={showVictory}
          score={game.score}
          canUndo={!!game.undo}
          onContinue={resume}
          onNew={restart}
          onUndo={undo}
        />
      )}
    </>
  );
}
