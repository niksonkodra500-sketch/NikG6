import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  createState,
  statusMessage,
  step,
  type GameState,
  type Input,
} from '../game/protest';

interface ProtestGameProps {
  onClose: () => void;
}

const NO_INPUT: Input = { left: false, right: false, up: false, down: false };

/**
 * "Protesta Shqiptare" - a small arcade game about leading a crowd of
 * protesters to the parliament. Included in the photo editor so it is
 * reachable from the main screen and inside the Android build.
 */
export function ProtestGame({ onClose }: ProtestGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState>(createState());
  const inputRef = useRef<Input>({ ...NO_INPUT });
  const frameRef = useRef<number | null>(null);
  const [hud, setHud] = useState({ count: 0, lives: 0, score: 0 });
  const [message, setMessage] = useState('');
  const hudRef = useRef({ count: 0, lives: 0, score: 0 });
  const messageRef = useRef('');

  const restart = useCallback(() => {
    stateRef.current = createState();
    hudRef.current = { count: 0, lives: 0, score: 0 };
    messageRef.current = '';
    setHud(hudRef.current);
    setMessage('');
  }, []);

  // Keyboard controls.
  useEffect(() => {
    const setKey = (key: string, down: boolean) => {
      const input = inputRef.current;
      switch (key) {
        case 'arrowleft':
        case 'a':
          input.left = down;
          break;
        case 'arrowright':
        case 'd':
          input.right = down;
          break;
        case 'arrowup':
        case 'w':
          input.up = down;
          break;
        case 'arrowdown':
        case 's':
          input.down = down;
          break;
        default:
          break;
      }
    };
    const onDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(key)) {
        event.preventDefault();
        setKey(key, true);
      }
    };
    const onUp = (event: KeyboardEvent) => setKey(event.key.toLowerCase(), false);
    const onBlur = () => {
      inputRef.current = { ...NO_INPUT };
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Main loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = (state: GameState) => {
      const { width, height, goal, player, protesters, police } = state;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#3b4a5c';
      ctx.fillRect(0, 0, width, height);

      // Parliament building.
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(goal.x - goal.w / 2, goal.y, goal.w, goal.h);
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PARLAMENTI', goal.x, goal.y + 20);

      // Protesters.
      ctx.fillStyle = '#60a5fa';
      for (const p of protesters) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Police.
      for (const po of police) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(po.x, po.y, po.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('P', po.x, po.y + 3);
      }

      // Leader.
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('L', player.x, player.y + 3);
    };

    const tick = () => {
      const state = step(stateRef.current, inputRef.current);
      draw(state);
      if (
        state.count !== hudRef.current.count ||
        state.lives !== hudRef.current.lives ||
        state.score !== hudRef.current.score
      ) {
        hudRef.current = { count: state.count, lives: state.lives, score: state.score };
        setHud(hudRef.current);
      }
      if (state.status !== 'playing' && !messageRef.current) {
        messageRef.current = statusMessage(state.status);
        setMessage(messageRef.current);
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const hold = (key: keyof Input) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    inputRef.current[key] = true;
  };
  const release = (key: keyof Input) => () => {
    inputRef.current[key] = false;
  };

  return (
    <div className="protest-game" role="dialog" aria-label="Protesta Shqiptare">
      <div className="protest-game__panel">
        <div className="protest-game__title">
          <h2>Protesta Shqiptare</h2>
          <button type="button" className="protest-game__close" onClick={onClose}>
            X
          </button>
        </div>
        <div className="protest-game__hud">
          <span>
            Protestues: <b>{hud.count}</b>/100
          </span>
          <span>
            Jeta: <b>{hud.lives}</b>
          </span>
          <span>
            Pike: <b>{hud.score}</b>
          </span>
        </div>
        <canvas ref={canvasRef} width={600} height={400} className="protest-game__canvas" />
        {message && <p className="protest-game__message">{message}</p>}
        {message && (
          <button type="button" className="protest-game__restart" onClick={restart}>
            Fillo perseri
          </button>
        )}
        <div className="protest-game__touch">
          <button type="button" onPointerDown={hold('up')} onPointerUp={release('up')}>
            ^
          </button>
          <button type="button" onPointerDown={hold('left')} onPointerUp={release('left')}>
            {'<'}
          </button>
          <button type="button" onPointerDown={hold('down')} onPointerUp={release('down')}>
            v
          </button>
          <button type="button" onPointerDown={hold('right')} onPointerUp={release('right')}>
            {'>'}
          </button>
        </div>
        <p className="protest-game__hint">
          Shigjetat ose WASD per te levizur. Shmang policine dhe shoq protestuesit deri ne
          parlament.
        </p>
      </div>
    </div>
  );
}
