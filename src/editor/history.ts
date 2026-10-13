/**
 * Snapshot history with undo/redo. The history keeps a linear list of
 * committed states and a cursor pointing at the current one; undo/redo
 * move the cursor. Pushing a new state clears the redo branch.
 */
export class History<T> {
  private states: T[] = [];
  private cursor = -1;

  constructor(private readonly limit = 50) {}

  push(state: T): void {
    this.states.push(state);
    this.cursor = this.states.length - 1;
    if (this.states.length > this.limit + 1) {
      this.states.shift();
      this.cursor -= 1;
    }
  }

  undo(_current: T): T | null {
    if (this.cursor <= 0) return null;
    this.cursor -= 1;
    return this.states[this.cursor] ?? null;
  }

  redo(_current: T): T | null {
    if (this.cursor >= this.states.length - 1) return null;
    this.cursor += 1;
    return this.states[this.cursor] ?? null;
  }

  canUndo(): boolean {
    return this.cursor > 0;
  }

  canRedo(): boolean {
    return this.cursor < this.states.length - 1;
  }

  clear(): void {
    this.states = [];
    this.cursor = -1;
  }
}
