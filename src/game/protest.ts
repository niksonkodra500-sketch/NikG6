/**
 * Albanian protest game - pure game logic.
 *
 * The player controls the protest leader. They must escort protesters up to
 * the parliament entrance while avoiding the police. Once 100 protesters have
 * reached parliament the people win and the prime minister resigns.
 */

export type GameStatus = 'playing' | 'won' | 'lost';

export interface Vec {
  x: number;
  y: number;
}

export interface Protester extends Vec {
  r: number;
  vx: number;
  vy: number;
}

export interface Police extends Vec {
  r: number;
  vx: number;
  vy: number;
}

export interface Player extends Vec {
  r: number;
  speed: number;
}

export interface Goal extends Vec {
  w: number;
  h: number;
}

export interface GameState {
  width: number;
  height: number;
  player: Player;
  protesters: Protester[];
  police: Police[];
  goal: Goal;
  count: number;
  lives: number;
  score: number;
  status: GameStatus;
  spawnTimer: number;
  policeTimer: number;
}

export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export const WORLD_WIDTH = 600;
export const WORLD_HEIGHT = 400;
export const WIN_COUNT = 100;
export const START_LIVES = 3;
export const PROTESTER_SPAWN_INTERVAL = 40;
export const POLICE_SPAWN_INTERVAL = 90;
export const MAX_POLICE = 8;
export const POINTS_PER_PROTESTER = 10;
export const HIT_PENALTY = 5;

/** Deterministic pseudo random helper so tests can drive the simulation. */
export function createRandom(seed = 1): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    // xorshift32
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

export function createState(width = WORLD_WIDTH, height = WORLD_HEIGHT): GameState {
  const goal: Goal = { x: width / 2, y: 30, w: 120, h: 30 };
  return {
    width,
    height,
    player: { x: width / 2, y: height - 40, r: 12, speed: 4 },
    protesters: [],
    police: [],
    goal,
    count: 0,
    lives: START_LIVES,
    score: 0,
    status: 'playing',
    spawnTimer: 0,
    policeTimer: 0,
  };
}

export function spawnProtester(state: GameState, rand: () => number): void {
  state.protesters.push({
    x: rand() * state.width,
    y: state.height - 20,
    r: 8,
    vy: -1.2 - rand() * 0.8,
    vx: (rand() - 0.5) * 0.6,
  });
}

export function spawnPolice(state: GameState, rand: () => number): void {
  state.police.push({
    x: rand() * state.width,
    y: 60 + rand() * 100,
    r: 10,
    vx: (rand() - 0.5) * 2,
    vy: (rand() - 0.5) * 1.5,
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function overlaps(a: Vec, aR: number, b: Vec, bR: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < aR + bR;
}

/** Advance the simulation by one frame. Mutates `state` in place. */
export function step(
  state: GameState,
  input: Input,
  rand: () => number = Math.random,
): GameState {
  if (state.status !== 'playing') return state;

  const { player } = state;
  if (input.left) player.x -= player.speed;
  if (input.right) player.x += player.speed;
  if (input.up) player.y -= player.speed;
  if (input.down) player.y += player.speed;
  player.x = clamp(player.x, player.r, state.width - player.r);
  player.y = clamp(player.y, player.r, state.height - player.r);

  state.spawnTimer += 1;
  if (state.spawnTimer > PROTESTER_SPAWN_INTERVAL) {
    spawnProtester(state, rand);
    state.spawnTimer = 0;
  }
  state.policeTimer += 1;
  if (state.policeTimer > POLICE_SPAWN_INTERVAL) {
    spawnPolice(state, rand);
    state.policeTimer = 0;
  }

  for (let i = state.protesters.length - 1; i >= 0; i -= 1) {
    const p = state.protesters[i];
    const dx = player.x - p.x;
    const dy = player.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 60 && d > 0) {
      p.vx += (dx / d) * 0.05;
      p.vy += (dy / d) * 0.05;
    }
    p.x += p.vx;
    p.y += p.vy;

    const { goal } = state;
    if (p.y < goal.y + goal.h && p.x > goal.x - goal.w / 2 && p.x < goal.x + goal.w / 2) {
      state.protesters.splice(i, 1);
      state.count += 1;
      state.score += POINTS_PER_PROTESTER;
      if (state.count >= WIN_COUNT) {
        state.status = 'won';
        return state;
      }
      continue;
    }
    if (p.y < -10 || p.x < -10 || p.x > state.width + 10) {
      state.protesters.splice(i, 1);
    }
  }

  for (let i = state.police.length - 1; i >= 0; i -= 1) {
    const po = state.police[i];
    po.x += po.vx;
    po.y += po.vy;
    if (po.x < po.r || po.x > state.width - po.r) po.vx *= -1;
    if (po.y < 60 || po.y > state.height - 60) po.vy *= -1;

    if (overlaps(po, po.r, player, player.r)) {
      state.lives -= 1;
      state.score = Math.max(0, state.score - HIT_PENALTY);
      player.x = state.width / 2;
      player.y = state.height - 40;
      state.police.splice(i, 1);
      if (state.lives <= 0) {
        state.status = 'lost';
        return state;
      }
      continue;
    }

    for (let j = state.protesters.length - 1; j >= 0; j -= 1) {
      const p = state.protesters[j];
      if (overlaps(po, po.r, p, p.r)) state.protesters.splice(j, 1);
    }
  }
  if (state.police.length > MAX_POLICE) state.police.shift();

  return state;
}

export function statusMessage(status: GameStatus): string {
  if (status === 'won') return 'POPULLI FITON! Kryeministri jep doreheqje!';
  if (status === 'lost') return 'Protesta u shtyp. Provo perseri.';
  return '';
}
