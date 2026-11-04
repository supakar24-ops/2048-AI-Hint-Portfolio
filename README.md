# 2048 AI Hint

เกม 2048 บนเว็บ พร้อมคำแนะนำภาษาไทยจาก **Expectimax Search จริง** เล่นด้วยปุ่มลูกศรหรือ Swipe ย้อนกลับหนึ่งตา และบันทึกเกมในเบราว์เซอร์อัตโนมัติ

ผลงาน Portfolio นี้แสดงการออกแบบกติกาเกม การแยกโมดูล การค้นหาภายใต้ความไม่แน่นอน และการทดสอบ ไม่มี Backend บัญชีผู้ใช้ หรือฐานข้อมูล

## Tech Stack

- React 19 + TypeScript 5.9 + Vite 7
- CSS: Light/Dark Theme โทน Blue/Lavender, Responsive และ Reduced Motion
- Vitest 4 + React Testing Library + jsdom
- Web Worker สำหรับ AI และ localStorage สำหรับ Save

Dependencies ล็อกไว้ใน `package-lock.json` ตรวจเวอร์ชันด้วย `npm.cmd ls --depth=0`

## ติดตั้งและเปิดเกม

ตรวจสอบด้วย Node.js **24.22.0**, npm **11.19.1**, Windows x64

เปิด PowerShell ในโฟลเดอร์ที่ Clone Repository:

```powershell
Set-Location -LiteralPath '.\2048-AI-Hint-Portfolio'
npm.cmd ci
npm.cmd run dev -- --port 5173 --strictPort
```

เปิด **http://127.0.0.1:5173/** หาก Port ถูกใช้งาน ให้หยุด Server เดิมหรือเปลี่ยน Port และใช้ URL ที่ Vite แสดง ใช้ `.cmd` เพื่อหลีกเลี่ยง PowerShell ที่ไม่อนุญาต `npm.ps1`

สร้างและลอง Production Build ในเครื่อง:

```powershell
npm.cmd run build
npm.cmd run preview -- --port 4173 --strictPort
```

เปิด http://127.0.0.1:4173/ ไม่มีการ Deploy

## วิธีควบคุมและกติกา

- กระดาน 4×4 เริ่มด้วยสอง Tile คนละช่อง
- ใช้ **↑ ↓ ← →**, **WASD** หรือปุ่มทิศทางบนหน้าจอ
- อุปกรณ์ Touch ปัดบนกระดาน; ระยะต่ำกว่า 24 CSS pixels ไม่นับเป็น Move
- Tile ค่าเท่ากันรวมได้ครั้งเดียวต่อ Move เช่น `[2,2,4,0]` ไปซ้ายเป็น `[4,4,0,0]` ก่อน Spawn และได้ 4 คะแนน
- คะแนนเพิ่มตามค่าของ Tile ที่รวมแล้ว เช่น 4+4 เป็น 8 ได้ 8 คะแนน
- หลัง Valid Move สุ่ม Tile ใหม่หนึ่งอัน: **2 = 90%, 4 = 10%** ทุกช่องว่างมีโอกาสเท่ากัน
- Move ที่กระดานไม่เปลี่ยน ไม่ Spawn ไม่เพิ่มคะแนน และไม่เปลี่ยน Undo Snapshot
- ถึง 2048 ครั้งแรก แสดง Congratulations เลือก **Continue Playing** เพื่อเล่นถึง 4096 หรือสูงกว่า หรือเลือก **New Game**
- หลัง Continue จะไม่แสดง Victory ซ้ำ ยกเว้น Undo กลับก่อนชนะแล้วเดินให้ชนะใหม่
- Game Over เมื่อไม่มีทิศทางที่เปลี่ยนกระดานได้ กระดานเต็มแต่ยังรวมได้ยังไม่แพ้
- New Game รีเซ็ตคะแนนและ Undo แต่เก็บ Best Score

## Light / Dark Mode

กดปุ่ม Sun/Moon ที่ Header เพื่อสลับธีม ข้อความ Light/Dark แสดงธีมปัจจุบัน ใช้ Tab เพื่อไปยังปุ่มและกด Enter หรือ Space ได้ ผู้ใช้ใหม่เริ่ม Light เสมอ โดยไม่เปลี่ยนตามธีมของระบบ

เก็บธีมใน Key `2048-ai-hint:theme:v1` แยกจาก Game Save เปิดใหม่แล้วจำธีมล่าสุด มีสคริปต์อ่านค่าก่อน React วาดหน้าเพื่อลดการกะพริบของธีม หาก Storage ใช้งานไม่ได้ยังสลับได้ในหน้านั้น

Theme Toggle มี State ของตัวเอง การเปลี่ยนธีมจึงไม่สร้างเกมใหม่ ไม่แก้ Board/Score/Best/Undo และไม่เริ่มงาน Hint ใหม่ ชุดสี Dark ใช้ CSS Variables ใน `src/theme.css` โดยเก็บสี Light เดิมไว้

## AI Hint, Auto Hint และ Auto-play

**AI Hint:** กดปุ่มเพื่อวิเคราะห์ Board ปัจจุบัน แสดงทิศทาง เหตุผลภาษาไทย และข้อมูลประกอบ ผู้เล่นต้องเดินเอง

**Auto Hint:** เปิด Switch เพื่อวิเคราะห์ทันทีและคำนวณใหม่หลัง Valid Move, Undo หรือ New Game เริ่ม **OFF** ทุกครั้งที่เปิดแอป ไม่บันทึก Toggle ข้าม Session และปิดแล้วจะยกเลิกงานที่รออยู่

**Auto-play:** ไม่มีในโปรเจกต์ AI ไม่ส่งคำสั่งเดิน ไม่เปลี่ยน Board, Score หรือ Undo

สถานะบนหน้าจอ: Ready, Analyzing, Hint Available และ No Valid Move

### หลักการ Expectimax

เป็น **Search-Based AI ไม่ใช่ LLM** ไม่ฝึกโมเดล ไม่ใช้ External AI API และไม่มีค่าเรียก API

1. **Player Node:** ใช้ `moveBoard` ชุดเดียวกับ Gameplay จำลองสี่ทิศทาง ตัด Move ที่กระดานไม่เปลี่ยน แล้วเลือกค่าที่ดีที่สุด
2. **Chance Node:** จำลองทุกช่องว่างและ Tile ทั้งสองค่า มีน้ำหนัก `0.9 / จำนวนช่องว่าง` สำหรับ 2 และ `0.1 / จำนวนช่องว่าง` สำหรับ 4
3. Chance Node รวมค่า `probability × child evaluation` ไม่ได้เลือกเฉพาะผลสุ่มที่ดีที่สุด
4. ที่ขอบความลึก ประเมิน Heuristic ของกระดาน **หลัง Spawn ที่จำลอง** หากไม่มี Move จะประเมินสถานะแพ้
5. ในแต่ละ Player Move เพิ่มรางวัล Merge `12 × log2(1 + scoreDelta)` แล้วรวมกับค่าคาดหวังในอนาคต

ความลึกนับ **Player Moves รวม Move แรก** ทุกชั้นที่ทำครบรวม Chance Spawn ด้วย:

| ช่องว่างปัจจุบัน | ความลึกเป้าหมาย |
|---|---:|
| ตั้งแต่ 8 | 2 |
| 4–7 | 3 |
| 0–3 | 4 |

ใช้ Iterative Deepening และ Cache ตาม Board, ประเภท Node และความลึกที่เหลือ จำกัด **24,000 Recursive Node Visits** ต่อคำขอ รวม Cache Hits การเตรียม Root/Fallback ไม่นับในตัวเลขนี้

ถ้าชั้นถัดไปไม่จบ จะทิ้งผลชั้นนั้นทั้งหมด ใช้ชั้นล่าสุดที่ทำครบเพื่อให้เปรียบเทียบทุกทิศทางที่ความลึกเดียวกัน Tests กำหนด `maxDepth` และ `maxNodes` ได้ สูงสุด 5 Player Moves และ 200,000 โหนด

งบจำนวนโหนดแทนเวลาช่วยให้ผลซ้ำได้เมื่อ Board/Settings เดิม หากงบน้อยจนไม่จบชั้นแรก จะคืน Move ที่เล่นได้จาก Heuristic พร้อมระบุ **Fallback** ไม่เรียกผลนั้นว่า Expectimax

### Heuristic Evaluation

Constants อยู่ใน `src/ai/expectimax.ts`:

| Feature | ความหมาย | น้ำหนัก |
|---|---|---:|
| Empty Cells | จำนวนช่องว่าง | +280 ต่อช่อง |
| Monotonicity | โทษการเรียงค่าที่วกกลับในแต่ละแถว/คอลัมน์ โดยข้ามช่องว่าง | 30 × ค่าที่ไม่เป็นบวก |
| Smoothness | โทษความต่าง `log2(Tile)` ของคู่ติดกันแนวนอน/แนวตั้ง | 12 × ค่าที่ไม่เป็นบวก |
| Merge Pairs | คู่ค่าเท่ากันที่ติดกัน ไม่รวมช่องว่าง | +75 ต่อคู่ |
| Corner | มี Tile สูงสุดที่มุม | +65 × log2(Tile สูงสุด) |
| Mobility | จำนวนทิศทางที่เล่นได้ | +35 ต่อทิศทาง |
| Terminal Penalty | ไม่มี Move เหลือ | −100,000 |

ใช้ `log2` เพราะจาก 2 ไป 4 และ 1024 ไป 2048 ต่างกันหนึ่งระดับการรวมเท่ากัน ลดการครอบงำของเลขใหญ่ใน Features เหล่านี้

น้ำหนักออกแบบด้วยเหตุผลเชิงเกม **ยังไม่ได้จูนจากการทดลองขนาดใหญ่** ไม่อ้างว่าดีที่สุดหรือรับประกันชัยชนะ

### คำอธิบายที่ตรวจสอบได้

- **Immediate Metrics:** กระดานหลัง Move ก่อนสุ่มจริง ได้แก่ ช่องว่างที่เพิ่ม คะแนน Merge และตำแหน่ง Tile สูงสุด
- กล่าวว่าช่องว่างเพิ่มหรือ Merge ได้เมื่อข้อมูลสนับสนุนเท่านั้น ระบุว่าจำนวนช่องว่างแสดงก่อน Spawn
- **Future Evaluation:** ค่าจากต้นไม้ค้นหาพร้อมรางวัล Merge แยกจากคะแนนทันที ไม่ใช่เปอร์เซ็นต์ชนะ
- แสดงความลึกที่ค้นหาครบจริง ไม่แสดงเป้าหมายราวกับทำครบแล้ว

### งานเบื้องหลังและผลเก่า

ค้นหาใน Web Worker เพื่อให้ผู้เล่นยังส่ง Input ได้ Auto Hint หน่วง 110 ms ก่อนเริ่มเพื่อลดงานซ้อน ทุกคำขอมี Request ID/Board Version เมื่อเดิน Undo หรือเริ่มใหม่ จะยุติ Worker เดิมและทิ้งผลเก่า

ถ้า Worker ใช้ไม่ได้ เกิดข้อผิดพลาด หรือไม่ตอบภายใน 4 วินาที จะยุติและค้นหาสำรองที่ Depth 1 งบ 512 โหนด พร้อมข้อความแจ้ง การค้นหาสำรองทำบน Main Thread จึงจำกัดงบให้ต่ำ

## Undo และ Auto-Save

Undo คืน **หนึ่ง Valid Move ล่าสุด** รวม Board, Score และสถานะชนะ/เล่นต่อ/แพ้ ไม่มีการสุ่มเพิ่ม ใช้แล้วล้าง Snapshot กดซ้ำย้อนหลายตาไม่ได้ ต้องเดิน Valid Move ใหม่ก่อน Best Score ไม่ลดตาม Undo

ใช้ Undo ได้จาก Victory/Game Over Dialog ถ้ามี Snapshot ส่วน Hint และ Invalid Move ไม่สร้าง Snapshot

ข้อมูลเกมใน localStorage ใช้สอง Key (ธีมเก็บแยกตามหัวข้อข้างต้น):

- `2048-ai-hint:game:v1`: Board, Score, Best, Won, Continued, Over และ Undo ภายใต้ Schema Version 1
- `2048-ai-hint:best:v1`: Best Score แยกเพื่อกู้สถิติได้แม้ข้อมูลเกมเสีย

บันทึกหลังเปลี่ยน Game State และโหลดเมื่อ Refresh/เปิดใหม่ ตรวจชนิดข้อมูล ขนาดกระดาน ค่า Tile คะแนน และสถานะก่อนใช้ คำนวณ Game Over ใหม่จาก Board ถ้าข้อมูลเกมเสียจะเริ่มใหม่และเก็บ Best ที่อ่านได้ ถ้า Storage ใช้ไม่ได้จะแจ้งและยังเล่นได้

Save อยู่ในเบราว์เซอร์และ Origin นั้น เปลี่ยน `localhost` เป็น `127.0.0.1` หรือเปลี่ยน Port จะเป็นคนละ Save การล้างข้อมูลเว็บไซต์/โหมดส่วนตัวอาจทำให้ Save หาย ไม่มี Cloud Save และไม่ซิงก์หลายแท็บ

## โครงสร้างโปรเจกต์

```text
src/
  game/
    board.ts          Pure Move/Merge, Legal Moves และ RNG Spawn
    state.ts          Initialization, Move, Continue และ Undo
    input.ts          Keyboard และ Swipe Threshold
    storage.ts        Serialize, Validate, Save และ Restore
    useGame.ts        React Integration และ Auto-Save
  ai/
    expectimax.ts     Search, Chance Outcomes, Features, Explanation
    hint.worker.ts    Worker Entry Point
    useHint.ts        Manual/Auto, Cancellation และ Fallback
  components/
    Board.tsx         Board และ Animated Tiles
    HintPanel.tsx     คำแนะนำและ Auto Hint Switch
    GameDialog.tsx    Victory/Game Over พร้อม Focus Trap
    Icon.tsx          SVG Icons
    ThemeToggle.tsx   ปุ่ม Light/Dark และ Theme Preference
  App.tsx             Layout, Score และ Controls
  styles.css          Theme, Responsive, Reduced Motion
  theme.css           Dark Palette และ Theme Control
  main.tsx            React Entry Point
tests/                Unit, Integration และ React UI Tests
benchmarks/           Fixed-Board Performance Measurement
public/favicon.svg
```

## การรัน Tests

```powershell
npm.cmd test
npm.cmd run test:watch
npm.cmd run typecheck
npm.cmd run build
npm.cmd run benchmark
```

`npm.cmd test` รวม Benchmark หนึ่ง Test ด้วย ผลเวลาอาจต่างจากการรัน Benchmark เดี่ยวเพราะ Tests อื่นทำงานพร้อมกัน

ครอบคลุม Move/Merge สี่ทิศทาง, RNG Boundaries, Victory/Continue, Game Over, Undo, Save/Restore/Corruption, Storage Failures, Chance Probabilities, ค่าคาดหวังลึกสอง Player Moves, Budget, Determinism, Explanation, Worker Cancellation/Timeout, Auto Hint, Keyboard และ Pointer Swipe

มี Integration Test จำลอง **600 Moves** ด้วย Seed คงที่ ตรวจผลรวม Tile คะแนน Undo และการ Serialize ข้ามโมดูล

**UI Tests ใช้ jsdom และ Worker จำลอง** จึงตรวจพฤติกรรม React ได้ แต่ไม่ยืนยันภาพ CSS ความลื่นไหล หรือ Worker จริงใน Browser ผลตรวจอยู่ใน [docs/VALIDATION.md](docs/VALIDATION.md)

## ข้อจำกัดปัจจุบัน

- ผู้ใช้ยืนยันตรวจ Gameplay, AI Hint, Auto Hint และ UI แล้ว และอนุมัติ Final Git Commit; ส่วน Browser Tool ของผู้พัฒนาไม่มี Browser ให้เชื่อม และ Windows Computer Use ยุติเพราะยืนยัน URL ไม่ได้
- ไม่มีบันทึกการทดสอบด้วยอุปกรณ์มือถือจริงหรือผลวัด Responsive Layout โดยผู้พัฒนา จึงไม่อ้างว่าผ่านทุกอุปกรณ์
- มี Animation เลื่อน/Merge/Spawn และ `prefers-reduced-motion` แต่ยังไม่มี Automated Visual Regression Tests
- จำกัดความลึกและโหนด จึงอาจแนะนำ Move ที่ผลจริงไม่ดีหลังสุ่ม
- Benchmark วัด Engine บน Node เครื่องนี้ ไม่ใช่เวลาคำขอ Worker ทั้งหมดหรือเวลาบนมือถือ
- ยังไม่ได้วัดอัตราชนะ/ความแม่นยำ จึงไม่แสดงตัวเลขเหล่านั้น
- โหลด Manrope/IBM Plex Sans Thai จาก Google Fonts ถ้าเข้าถึงไม่ได้ใช้ Sans-Serif ของระบบ ไม่ได้ใช้ AI API
- ใช้ API/CSS ของ Browser สมัยใหม่ เช่น Worker, Pointer Events, Container Units และ `inert`

## แหล่งอ้างอิงหลักการ

- [UC Berkeley CS188 — Expectimax](https://inst.eecs.berkeley.edu/~cs188/textbook/games/expectimax.html)
- [2048 ต้นฉบับ — Game Manager](https://github.com/gabrielecirulli/2048/blob/master/js/game_manager.js)
- [Vite — Web Workers](https://vite.dev/guide/features#web-workers)

Final Git Checkpoint ใช้ข้อความ `feat: complete 2048 ai hint game` ตามที่ผู้ใช้อนุมัติ บันทึกเฉพาะ Source, Tests, Configuration และเอกสารภายในโปรเจกต์ ไม่รวม Dependencies หรือ Build Output และไม่มีการ Push หรือ Deploy
