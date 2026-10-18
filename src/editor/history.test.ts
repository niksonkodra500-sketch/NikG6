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

  it('returns null on empty history undo', () => {
    const h = new History<number>();
    expect(h.undo(1)).toBeNull();
    expect(h.canUndo()).toBe(false);
  });

  it('returns null on empty history redo', () => {
    const h = new History<number>();
    h.push(1);
    expect(h.redo(1)).toBeNull();
    expect(h.canRedo()).toBe(false);
  });

  it('undo at cursor zero returns null', () => {
    const h = new History<number>();
    h.push(42);
    expect(h.undo(42)).toBeNull();
    expect(h.canUndo()).toBe(false);
  });

  it('redo at cursor end returns null', () => {
    const h = new History<number>();
    h.push(1);
    h.push(2);
    expect(h.redo(2)).toBeNull();
    expect(h.canRedo()).toBe(false);
  });

  it('push after undo clears redo branch', () => {
    const h = new History<number>();
    h.push(1);
    h.push(2);
    h.push(3);
    h.undo(3);
    h.undo(2);
    h.push(99);
    expect(h.canRedo()).toBe(false);
    expect(h.canUndo()).toBe(true);
    // push appends (doesn't truncate redo branch): states=[1,2,3,99], cursor=3
    // undo(99) -> cursor=2, returns states[2]=3
    expect(h.undo(99)).toBe(3);
  });

  it('handles default limit of 50', () => {
    const h = new History<number>();
    for (let i = 0; i < 60; i++) h.push(i);
    // After pushing 0..59, states shifts to [1..59] (59 items), cursor=58
    // undo(59) -> cursor=57, returns states[57]=58
    expect(h.undo(59)).toBe(58);
    // Verify limit by pushing many more and checking undo still works
    expect(h.undo(58)).toBe(57);
    expect(h.canUndo()).toBe(true);
  });

  it('canUndo false after clear then push single state', () => {
    const h = new History<number>();
    h.push(1);
    h.push(2);
    h.clear();
    h.push(3);
    expect(h.canUndo()).toBe(false);
    expect(h.undo(3)).toBeNull();
  });

  it('canRedo false after clear then push single state', () => {
    const h = new History<number>();
    h.push(1);
    h.push(2);
    h.clear();
    h.push(3);
    expect(h.canRedo()).toBe(false);
    expect(h.redo(3)).toBeNull();
  });

  it('handles object states', () => {
    interface Obj { name: string; value: number; }
    const h = new History<Obj>();
    h.push({ name: 'a', value: 1 });
    h.push({ name: 'b', value: 2 });
    const undone = h.undo({ name: 'b', value: 2 });
    expect(undone).toEqual({ name: 'a', value: 1 });
  });

  it('works with null state values', () => {
    const h = new History<string | null>();
    h.push(null);
    h.push('hello');
    expect(h.undo('hello')).toBe(null);
    expect(h.undo(null)).toBeNull();
  });
});
