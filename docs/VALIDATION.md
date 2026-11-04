# ผลตรวจ 2048 AI Hint v1.0

ตรวจเมื่อ **24 ตุลาคม 2026** ภายในโฟลเดอร์โปรเจกต์ โดยไม่แก้โปรเจกต์อื่น

## ผลตรวจล่าสุด — Final Git Checkpoint

ผู้ใช้ยืนยันตรวจ Gameplay, AI Hint, Auto Hint และ UI แล้ว และอนุมัติให้ Stage/Commit ภายในโปรเจกต์นี้ ด้วยข้อความ `feat: complete 2048 ai hint game` โดยไม่ Push หรือ Deploy

รันตรวจใหม่ก่อน Stage: `npm.cmd test` **144 ผ่าน / 0 ไม่ผ่าน / 9 Test Files**, `npm.cmd run typecheck` ผ่าน และ `npm.cmd run build` ผ่าน (42 Modules และ Worker Bundle) การปรับครั้งนี้แก้เอกสารให้ตรงกับสถานะการอนุมัติ ไม่เปลี่ยน Gameplay หรือ AI

ตรวจไฟล์เฉพาะโปรเจกต์และ `.gitignore` แล้ว ไม่รวม `node_modules`, `dist`, `.npm-cache`, `.env`, Credentials หรือ Temporary Output ใน Checkpoint

## ผลตรวจหลังเพิ่ม Dark Mode

- Full Automated Tests: **144 ผ่าน / 0 ไม่ผ่าน / 9 Test Files** รวม Tests ใหม่ของ Theme และ Contrast 25 รายการ
- `npm.cmd run typecheck` และ `npm.cmd run build` ผ่าน (42 Modules และ Worker Bundle)
- ปุ่ม Light/Dark ที่ Header ใช้เมาส์หรือ Tab/Enter/Space ได้ เก็บค่าแยกใน `2048-ai-hint:theme:v1` และอ่านก่อน React วาดหน้าเพื่อลด Theme Flash
- ทดสอบการเปิดใหม่ การคง Board/Score/Best/Undo/Save, Manual Hint และ Auto Hint ที่กำลังคำนวณ รวมถึงหน้าชนะ/แพ้ใน Dark Mode
- ตรวจค่าสีข้อความและ Tile ทุกระดับผ่าน Contrast 4.5:1 และ Focus/Switch Thumb ผ่าน 3:1 จาก CSS Tokens; ไม่ใช่การตรวจภาพด้วย Browser
- Dark Overrides เปลี่ยนเฉพาะสี/เงา/ความทึบ ไม่มีการแก้ Gameplay, AI หรือขนาด/ตำแหน่ง D-pad และคง Responsive เดิม พร้อมกฎ Header สำหรับจอแคบ
- Browser Tool ของผู้พัฒนาไม่พบ Browser ให้เชื่อมต่อ จึงไม่มีผลตรวจภาพหรือมือถือจริงจากเครื่องมือ ส่วนผู้ใช้ยืนยันตรวจ Gameplay และ UI แล้วตามบันทึก Checkpoint ด้านบน
- ไม่มีการ Push หรือ Deploy

ส่วน A–H ด้านล่างรวมรายละเอียดระบบปัจจุบัน โดยตาราง Performance เป็นผลวัด Engine จากรอบพัฒนาเดิม

## A. Project Overview

React 19.3.1, TypeScript 5.9.3, Vite 7.3.7, Vitest 4.1.12, React Testing Library 16.3.3 และ jsdom 27.4.0

โครงสร้างหลักแยก `src/game`, `src/ai`, `src/components`, `tests` และ `benchmarks` รายละเอียดการติดตั้งและอัลกอริทึมอยู่ใน [README](../README.md)

## B. Gameplay

สร้างครบ: กระดาน 4×4, เริ่มสอง Tile, Spawn 2/4 แบบ 90/10, Move/Merge สี่ทิศทาง, คะแนน/Best, Victory/Continue, Game Over, New Game, Undo หนึ่งตา และ Auto-Save/Restore

Pure Move แยกจาก Spawn ใช้ RNG ที่กำหนดได้ใน Tests Invalid Move ไม่สร้าง Snapshot หรือเปลี่ยนสถานะ Undo รักษา Best Score และใช้ได้จากหน้าชนะ/แพ้

ข้อมูล Save มี Validation และ Fallback เมื่อเสีย การอ่าน/เขียน Storage ล้มเหลวไม่ทำให้เล่นต่อไม่ได้

## C. AI Engine

- Expectimax มี Player Max Nodes และ Chance Nodes ครบทุกช่องว่าง × Tile 2/4
- ปรับ Depth เป้าหมาย 2/3/4 ตามช่องว่าง จำกัด 24,000 Node Visits พร้อม Memoization
- Iterative Deepening คืนเฉพาะชั้นที่ทำครบ หากงบไม่พอแม้ชั้นแรก จะแจ้งว่าเป็น Legal Heuristic Fallback
- Features: Empty Cells, Monotonicity, Smoothness, Merge Pairs, Max Tile at Corner, Mobility และ Terminal Penalty
- Explanation ภาษาไทยใช้ Immediate Metrics จริงก่อน Spawn แยกจาก Expected Search Evaluation
- Web Worker รับ Request ID; React Hook ผูกกับ Board Version ยุติงานและไม่รับผลเก่าหลัง Move/Undo/New Game
- Worker Timeout 4 วินาที ใช้การค้นหาสำรอง Depth 1 / 512 Nodes พร้อมแจ้งบน UI

### Performance ที่รันจริง

คำสั่ง `npm.cmd run benchmark` บน Node.js 24.22.0 / Windows x64: กระดานคงที่ห้าแบบ แบบละหนึ่ง Warm-up และห้ารอบที่วัด ไม่มีการเล่นเกมอัตโนมัติในผลิตภัณฑ์

| Board Fixture | มัธยฐาน ms | สูงสุด ms | Depth ที่ครบ/เป้าหมาย | Node Visits |
|---|---:|---:|---:|---:|
| opening | 31.22 | 37.97 | 2/2 | 3,140 |
| midgame | 102.56 | 114.86 | 3/3 | 12,142 |
| crowded | 100.82 | 103.68 | 4/4 | 12,109 |
| single | 14.42 | 15.16 | 3/3 | 1,844 |
| terminal | 0.02 | 0.02 | 0/4 — ไม่มี Move | 0 |

เป็นเวลา Engine บนเครื่องนี้ ไม่รวมการเริ่ม Worker, การส่ง Message, การ Render หรือ Auto Hint Debounce ไม่ใช่ผลบนมือถือ และไม่ใช่สถิติอัตราชนะ

## D. UI / UX

มี Light/Dark Theme, Soft Gradient, Blue/Lavender Tiles, Responsive แบบสองคอลัมน์บน Desktop/หนึ่งคอลัมน์บนหน้าจอเล็ก, D-pad, Keyboard/WASD, Pointer Swipe, Focus Indicators, Dialog Focus Trap และตารางค่ากระดานสำหรับ Screen Reader

มี CSS Animation สำหรับ Movement/Merge/Spawn/Victory และลดการเคลื่อนไหวเมื่อเปิด `prefers-reduced-motion` การปรับตัวเลข Tile ใช้ขนาดสัมพันธ์กับกระดาน

**สถานะตรวจภาพ:** ผู้ใช้ยืนยันตรวจ UI แล้ว ผู้พัฒนาตรวจ Source/Build และ Contrast จาก CSS Tokens แต่ไม่มีผล Automated Visual QA หรือการวัด Layout ใน Browser จริง

## E. Test Results

ผลคำสั่งที่รันใหม่สำหรับ Final Git Checkpoint:

| การตรวจ | ผลจริง |
|---|---|
| `npm.cmd test` | **144 Tests ผ่าน / 0 ไม่ผ่าน / 9 Test Files ผ่าน** |
| TypeScript | ผ่าน `npm.cmd run typecheck` ขั้นสุดท้าย และ `tsc --noEmit` ใน Build |
| `npm.cmd run build` | ผ่าน: 42 Modules, มี Worker Bundle |
| `npm.cmd run benchmark` | ผ่าน หนึ่ง Test; ผลแสดงตารางข้างต้น |
| Vite Development Server | เริ่มสำเร็จและ HTTP GET `/` ตอบ **200 OK** ที่ `127.0.0.1:5173` |
| Worker Module HTTP | ตอบ **200 OK**, Content-Type `text/javascript`; ยังไม่ยืนยันการ Execute ใน Browser จริง |

Tests รวม Gameplay 45 Cases, AI Engine 16 Cases, Storage 28 Cases, UI 18 Cases, Hint Lifecycle 10 Cases, Theme 21 Cases, Theme Colors 4 Cases, Seeded Integration หนึ่ง Case และ Benchmark หนึ่ง Case

Integration จำลอง 600 Moves ตรวจผลรวม Tile คะแนน Undo และ Save Round-trip ส่วน Tests ของ Expectimax เทียบค่าคาดหวังโดยตรงทั้งหนึ่งและสอง Player Moves ไม่ได้ตรวจเพียงชื่อ Algorithm

### แยกขอบเขตการตรวจ

- **Automated:** Vitest, React Testing Library และ jsdom ตรวจ React Events/State/Dialogs/Storage; Worker ใน Hook Tests เป็น Mock ส่วน Engine Search รันจริง
- **Manual Browser Testing:** ผู้ใช้ยืนยันตรวจ Gameplay, AI Hint, Auto Hint และ UI แล้ว ส่วนการทดสอบผ่าน Browser Tool ของผู้พัฒนาไม่สำเร็จ เพราะไม่มี Browser ที่ใช้ได้ และ Windows Computer Use ยืนยัน URL ไม่ได้
- **Visual Inspection:** การยอมรับ UI เป็นการยืนยันจากผู้ใช้ ไม่มี Screenshot จากผู้พัฒนาที่อ้างเป็นหลักฐาน
- **มือถือจริง:** ยังไม่ได้ทดสอบ Pointer Swipe Test เป็นการจำลอง Event ใน jsdom ไม่ใช่อุปกรณ์จริง

## F. Git Status

Repository อยู่ภายในโฟลเดอร์เป้าหมาย Checkpoint นี้เป็น Initial Commit ตามการอนุมัติของผู้ใช้ ไม่ Push และไม่ Deploy ตรวจ Hash และสถานะล่าสุดได้ด้วย `git log -1` และ `git status`

มี `.gitignore` สำหรับ `node_modules`, `dist`, `.env`, Cache, Logs และ Temporary/Test Output เนื่องจากเป็น Initial Commit จึงตรวจ Staged Diff ทั้งหมดในรูปแบบไฟล์ที่เพิ่มใหม่

Sandbox ใช้บัญชี Windows ต่างจากเจ้าของโฟลเดอร์ การอ่าน Git Status จึงใช้ `git -c safe.directory=...` เฉพาะคำสั่ง ไม่เปลี่ยน Global Git Configuration

## G. How to Run

Dependencies ติดตั้งแล้ว เปิด PowerShell ใน Project แล้วรัน:

```powershell
npm.cmd run dev -- --port 5173 --strictPort
```

เปิด http://127.0.0.1:5173/ ขั้นตอนติดตั้งใหม่และ Preview Production อยู่ใน README

ปิด Development Server ที่ใช้ตรวจหลังจบงานแล้ว ให้รันคำสั่งข้างต้นเพื่อเปิดทดลองเล่น

## H. Remaining Issues / User Acceptance

ไม่พบข้อผิดพลาดที่ทำให้ Automated Checks ล้มเหลว ผู้ใช้ยืนยันตรวจ Gameplay, AI Hint, Auto Hint และ UI แล้ว และอนุมัติ Checkpoint การยืนยันนี้ไม่ได้ระบุอุปกรณ์หรือ Browser Matrix จึงไม่อ้างว่าผ่านทุกอุปกรณ์

รายการสำหรับตรวจซ้ำเมื่อมีการเปลี่ยนระบบในอนาคต:

1. เล่นด้วยลูกศรหลังคลิก New Game/Hint และเล่นบนจอแคบ ตรวจว่าไม่มีส่วนล้น
2. ตรวจ Animation, ขนาดตัวเลข, สี และ Contrast โดยเฉพาะ Tile 2048 ขึ้นไป
3. กด Hint แล้วเดินก่อนผลกลับ ตรวจว่าไม่มีคำแนะนำเก่า เปิด/ปิด Auto Hint และลอง Undo/New Game
4. Refresh แล้วตรวจ Board/Score/Undo เดิม จากนั้นลองชนะ/Continue และแพ้/Undo
5. ใช้มือถือจริงทดสอบ Swipe, Scroll นอก Board และ Touch Targets
6. ใช้ Tab/Enter ตรวจ Focus, Dialog และเปิด Reduced Motion ในระบบ

AI มีขอบเขตการค้นหา น้ำหนักยังไม่ได้จูนด้วยข้อมูลขนาดใหญ่ และยังไม่ได้วัดอัตราชนะ ไม่มีข้ออ้างรับประกันผลการเล่น
