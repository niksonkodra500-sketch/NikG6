import { describe, expect, it } from 'vitest';
import { History } from './history';

describe('History', () => {
  it('pushes and undoes states', () => {
    const h = new History<number>();
    h.push(1);
    h.push(2);
    expect(h.undo(2)).toBe(1);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(true);
  });

  it('redoes states', () => {
    const h = new History<number>();
    h.push(1);
    h.push(2);
    h.undo(2);
    expect(h.redo(1)).toBe(2);
    expect(h.canRedo()).toBe(false);
  });

  it('clears the redo stack on new push', () => {
    const h = new History<number>();
    h.push(1);
    h.push(2);
    h.undo(2);
    h.push(3);
    expect(h.canRedo()).toBe(false);
    expect(h.undo(3)).toBe(2);
  });

  it('respects the limit', () => {
    const h = new History<number>(3);
    h.push(1);
    h.push(2);
    h.push(3);
    h.push(4);
    expect(h.undo(4)).toBe(3);
    expect(h.undo(3)).toBe(2);
    expect(h.undo(2)).toBe(1);
    expect(h.undo(1)).toBeNull();
  });

  it('clears', () => {
    const h = new History<number>();
    h.push(1);
    h.clear();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });
});
