import { describe, expect, it } from 'vitest';
import {
  createState,
  statusMessage,
  step,
  WIN_COUNT,
  type GameState,
  type Input,
} from './protest';

const idle: Input = { left: false, right: false, up: false, down: false };

function input(partial: Partial<Input>): Input {
  return { ...idle, ...partial };
}

/** Places a protester right inside the parliament entrance. */
function protesterAtGoal(state: GameState) {
  state.protesters.push({
    x: state.goal.x,
    y: state.goal.y + state.goal.h - 1,
    r: 8,
    vx: 0,
    vy: -1,
  });
}

describe('createState', () => {
  it('starts with three lives, no score and a playing status', () => {
    const state = createState();
    expect(state.lives).toBe(3);
    expect(state.score).toBe(0);
    expect(state.count).toBe(0);
    expect(state.status).toBe('playing');
    expect(state.protesters).toHaveLength(0);
    expect(state.police).toHaveLength(0);
  });
});

describe('step', () => {
  it('moves the player with the keyboard input', () => {
    const state = createState();
    const startX = state.player.x;
    step(state, input({ right: true }));
    expect(state.player.x).toBeGreaterThan(startX);
  });

  it('keeps the player inside the canvas', () => {
    const state = createState();
    for (let i = 0; i < 50; i += 1) step(state, input({ left: true, up: true }));
    expect(state.player.x).toBeGreaterThanOrEqual(state.player.r);
    expect(state.player.y).toBeGreaterThanOrEqual(state.player.r);
    expect(state.player.x).toBeLessThanOrEqual(state.width - state.player.r);
    expect(state.player.y).toBeLessThanOrEqual(state.height - state.player.r);
  });

  it('counts a protester that reaches the parliament and awards points', () => {
    const state = createState();
    protesterAtGoal(state);
    step(state, idle);
    expect(state.count).toBe(1);
    expect(state.score).toBe(10);
  });

  it('wins when enough protesters reach the parliament', () => {
    const state = createState();
    state.count = WIN_COUNT - 1;
    protesterAtGoal(state);
    step(state, idle);
    expect(state.count).toBe(WIN_COUNT);
    expect(state.status).toBe('won');
  });

  it('loses a life when the police catch the player', () => {
    const state = createState();
    state.police.push({ x: state.player.x, y: state.player.y, r: 10, vx: 0, vy: 0 });
    step(state, idle);
    expect(state.lives).toBe(2);
    expect(state.status).toBe('playing');
  });

  it('ends the game when the player runs out of lives', () => {
    const state = createState();
    state.lives = 1;
    state.police.push({ x: state.player.x, y: state.player.y, r: 10, vx: 0, vy: 0 });
    step(state, idle);
    expect(state.lives).toBe(0);
    expect(state.status).toBe('lost');
  });

  it('does not simulate once the game is over', () => {
    const state = createState();
    state.status = 'lost';
    const before = { ...state.player };
    step(state, input({ right: true }));
    expect(state.player.x).toBe(before.x);
  });
});

describe('statusMessage', () => {
  it('announces the victory and the prime minister stepping down', () => {
    expect(statusMessage('won')).toMatch(/Kryeministri/);
  });

  it('reports a crushed protest', () => {
    expect(statusMessage('lost')).toMatch(/shtyp/);
  });

  it('returns nothing while playing', () => {
    expect(statusMessage('playing')).toBe('');
  });
});
