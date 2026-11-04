// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { SAVE_KEY, serializeGame } from '../src/game/storage';
import { applyMove, newGame } from '../src/game/state';

beforeEach(() => { localStorage.clear(); vi.spyOn(Math, 'random').mockReturnValue(0); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('game UI', () => {
  it('renders title, initial score and disabled undo', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Small tiles/ })).toBeInTheDocument();
    expect(screen.getByTestId('score')).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });
  it('supports keyboard movement and undo without spawning again', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('score')).toHaveTextContent('4');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('score')).toHaveTextContent('0');
    expect(screen.getByTestId('best')).toHaveTextContent('4');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });
  it('supports the on-screen direction pad', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Move left' }));
    expect(screen.getByTestId('score')).toHaveTextContent('4');
  });
  it('new game resets score and undo and retains best', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.click(screen.getByRole('button', { name: 'New Game' }));
    expect(screen.getByTestId('score')).toHaveTextContent('0');
    expect(screen.getByTestId('best')).toHaveTextContent('4');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });
  it('provides an accessible table of current board values', () => {
    render(<App />);
    expect(screen.getAllByRole('cell')).toHaveLength(16);
    expect(screen.getAllByRole('cell').filter((cell) => cell.textContent === '2')).toHaveLength(2);
  });
  it('does not intercept keyboard input on interactive controls', () => {
    render(<App />);
    fireEvent.keyDown(screen.getByRole('switch', { name: 'Auto Hint' }), { key: 'ArrowLeft' });
    expect(screen.getByTestId('score')).toHaveTextContent('0');
  });
  it('arrow keys keep working while an action button has focus', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: 'New Game' });
    button.focus();
    fireEvent.keyDown(button, { key: 'ArrowLeft' });
    expect(screen.getByTestId('score')).toHaveTextContent('4');
  });
  it('settles movement animation to the final board', async () => {
    const { container } = render(<App />);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    await waitFor(() => expect(container.querySelectorAll('.tile-motion')).toHaveLength(0));
    expect(container.querySelectorAll('.tile')).toHaveLength(2);
  });
  it('manual AI Hint shows a Thai explanation without executing the move', async () => {
    render(<App />);
    const cells = screen.getAllByRole('cell').map((cell) => cell.textContent);
    fireEvent.click(screen.getByRole('button', { name: 'AI Hint' }));
    await screen.findByText('AI RECOMMENDS');
    expect(screen.getByText('เหตุผลที่แนะนำ')).toBeInTheDocument();
    expect(screen.getByTestId('score')).toHaveTextContent('0');
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(cells);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });
  it('auto hint is off by default and can be enabled and disabled', async () => {
    render(<App />);
    const toggle = screen.getByRole('switch', { name: 'Auto Hint' });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    await screen.findByText('AI RECOMMENDS');
    expect(toggle).toBeChecked();
    fireEvent.click(toggle); expect(toggle).not.toBeChecked();
  });
  it('restores the same board, score, best and undo after remount', () => {
    const first = render(<App />);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    const cells = screen.getAllByRole('cell').map((cell) => cell.textContent);
    first.unmount(); render(<App />);
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(cells);
    expect(screen.getByTestId('score')).toHaveTextContent('4');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
    expect(screen.getByRole('switch', { name: 'Auto Hint' })).not.toBeChecked();
  });
  it('restores a victory dialog, continues without changing the board and persists that choice', () => {
    const before = { ...newGame(0, () => 0), board: [1024, 1024, ...Array<number>(14).fill(0)] };
    const won = applyMove(before, 'left', () => 0).game;
    localStorage.setItem(SAVE_KEY, serializeGame(won));
    const view = render(<App />);
    const dialog = screen.getByRole('dialog', { name: 'Congratulations!' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue Playing' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toContain('2048');
    view.unmount(); render(<App />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('can undo from a restored Game Over dialog', () => {
    const before = { ...newGame(0, () => 0), board: [0, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2, 4, 8, 16, 32] };
    const lost = applyMove(before, 'left', () => 0.95).game;
    localStorage.setItem(SAVE_KEY, serializeGame(lost));
    render(<App />);
    const dialog = screen.getByRole('dialog', { name: 'Game Over' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Undo last move' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });
  it('a touch swipe executes one move while small gestures do nothing', () => {
    render(<App />);
    const board = screen.getByTestId('board');
    const pointer = (type: string, x: number) => Object.assign(new MouseEvent(type, { bubbles: true, clientX: x, clientY: 20 }), { pointerType: 'touch', isPrimary: true, pointerId: 1 });
    fireEvent(board, pointer('pointerdown', 100)); fireEvent(board, pointer('pointerup', 95));
    expect(screen.getByTestId('score')).toHaveTextContent('0');
    fireEvent(board, pointer('pointerdown', 100)); fireEvent(board, pointer('pointerup', 0));
    expect(screen.getByTestId('score')).toHaveTextContent('4');
  });
  it('starts a playable new game if the save is corrupt', () => {
    localStorage.setItem(SAVE_KEY, '{broken'); render(<App />);
    expect(screen.getByText('ข้อมูลบันทึกไม่สมบูรณ์ เริ่มเกมใหม่ให้แล้ว')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('score')).toHaveTextContent('4');
  });
  it('keeps playing when localStorage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<App />); fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('score')).toHaveTextContent('4');
    expect(screen.getByText('เล่นต่อได้ แต่เบราว์เซอร์บันทึกเกมไม่ได้')).toBeInTheDocument();
  });
  it('keeps playing when even accessing localStorage is denied', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('denied'); });
    render(<App />); fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('score')).toHaveTextContent('4');
    expect(screen.getByText('เล่นต่อได้ แต่เบราว์เซอร์บันทึกเกมไม่ได้')).toBeInTheDocument();
  });
  it('displays victory from a real UI move and allows undo from that dialog', () => {
    const before = { ...newGame(0, () => 0), board: [1024, 1024, ...Array<number>(14).fill(0)] };
    localStorage.setItem(SAVE_KEY, serializeGame(before));
    render(<App />); fireEvent.keyDown(window, { key: 'ArrowLeft' });
    const dialog = screen.getByRole('dialog', { name: 'Congratulations!' });
    expect(within(dialog).getByText('2,048')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Undo last move' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('score')).toHaveTextContent('0');
    expect(screen.getByTestId('best')).toHaveTextContent('2,048');
  });
});
