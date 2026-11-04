import type { HintPhase } from '../ai/useHint';
import type { HintResult } from '../ai/expectimax';
import { Icon } from './Icon';

const directions = { left: { arrow: '←', label: 'LEFT', thai: 'เลื่อนซ้าย' }, right: { arrow: '→', label: 'RIGHT', thai: 'เลื่อนขวา' }, up: { arrow: '↑', label: 'UP', thai: 'เลื่อนขึ้น' }, down: { arrow: '↓', label: 'DOWN', thai: 'เลื่อนลง' } };
const phases: Record<HintPhase, string> = { ready: 'Ready', analyzing: 'Analyzing', available: 'Hint Available', 'no-moves': 'No Valid Move' };
export function HintPanel({ phase, result, auto, fallback, blocked, onRequest, onAuto }: { phase: HintPhase; result: HintResult | null; auto: boolean; fallback: boolean; blocked: boolean; onRequest: () => void; onAuto: (enabled: boolean) => void }) {
  const direction = result?.direction ? directions[result.direction] : null;
  return <section className="hint-card" aria-labelledby="hint-title">
    <div className="hint-card-header"><span className="hint-icon"><Icon name="spark" size={22} /></span><span className={`hint-status ${phase === 'analyzing' ? 'is-analyzing' : ''}`} role="status"><span className="status-dot" />{phases[phase]}</span></div>
    <p className="eyebrow">YOUR STRATEGY COMPANION</p><h2 id="hint-title">A fresh perspective.</h2><p className="hint-intro">เมื่อไม่แน่ใจว่าจะไปทางไหน<br />ให้ AI ช่วยมองความเป็นไปได้ให้คุณ</p>
    <div className={`recommendation ${direction ? 'has-hint' : ''}`} aria-live="polite" aria-atomic="true">
      {phase === 'analyzing' ? <><span className="thinking-dots"><i /><i /><i /></span><p>กำลังมองหาตาที่น่าเล่น…</p><span className="recommendation-sub">คุณยังเล่นต่อได้ตามปกติ</span></> : direction ? <><span className="recommendation-label">AI RECOMMENDS</span><div className="recommended-direction"><span>{direction.arrow}</span><strong>{direction.label}</strong></div><span className="recommendation-sub">{direction.thai} · คุณเป็นคนตัดสินใจเสมอ</span></> : <><span className="recommendation-empty"><Icon name="grid" size={26} /></span><p>{phase === 'no-moves' ? 'ไม่มีทิศทางที่เดินต่อได้' : 'Your next move starts here.'}</p><span className="recommendation-sub">{phase === 'no-moves' ? 'ลอง Undo หรือเริ่มเกมใหม่' : 'กด AI Hint เพื่อดูคำแนะนำ'}</span></>}
    </div>
    {direction && result && <div className="hint-explanation"><p className="reason-label">เหตุผลที่แนะนำ</p><ul>{result.explanation.map((reason) => <li key={reason}>{reason}</li>)}</ul><div className="hint-metrics"><div><span>ช่องว่าง*</span><strong>{result.immediate?.emptyAfter}</strong></div><div><span>คะแนนทันที</span><strong>+{result.immediate?.mergeScore.toLocaleString()}</strong></div><div><span>ความลึก</span><strong>{result.search.completedDepth}</strong></div></div><p className="metric-note">*หลังเลื่อน ก่อนสุ่ม Tile ใหม่</p><details className="search-details"><summary>เบื้องหลังคำแนะนำ</summary><p>ค่าคาดหวัง: {result.evaluation.toFixed(1)} · ไม่ใช่โอกาสชนะ</p><p>{result.search.nodes.toLocaleString()} โหนด · ความลึกที่ค้นหาครบ {result.search.completedDepth}/{result.search.requestedDepth}</p><p>{result.search.algorithm === 'expectimax' ? 'Expectimax Search' : 'ประเมินเฉพาะผลหลังเลื่อน (Fallback)'}{result.search.budgetExhausted ? ' · ถึงขอบเขตการคำนวณ' : ''}</p></details></div>}
    {fallback && <p className="fallback-note" role="note">ใช้การค้นหาขนาดเล็กสำรอง เนื่องจาก Worker ใช้งานไม่ได้หรือเกินเวลารอ</p>}
    <button className="button primary hint-button" aria-label="AI Hint" disabled={phase === 'analyzing' || phase === 'no-moves' || blocked} onClick={onRequest}><Icon name="spark" size={17} />{phase === 'analyzing' ? 'Analyzing…' : 'AI Hint'}<Icon name="arrow" size={17} /></button>
    <div className="auto-hint-row"><div><label htmlFor="auto-hint">Auto Hint</label><p>รับคำแนะนำใหม่หลังเดินแต่ละตา</p></div><label className="switch"><input id="auto-hint" type="checkbox" role="switch" checked={auto} onChange={(event) => onAuto(event.target.checked)} /><span aria-hidden="true" /></label></div>
    <div className="hint-footnote"><Icon name="shield" size={13} /><span>ช่วยคิด ไม่เดินแทนคุณ</span></div>
  </section>;
}
