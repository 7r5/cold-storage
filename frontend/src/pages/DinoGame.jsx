// Secret dino game — unlocked by clicking the logo 6 times in /acerca-de
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Canvas dimensions (logical pixels — scaled to full width via CSS)
const W = 600;
const H = 160;
const GROUND_Y = H - 24;

// Dino constants
const DINO_X = 60;
const DINO_W = 38;
const DINO_H = 46;
const GRAVITY = 0.55;
const JUMP_VY = -12;

// Cactus constants
const CACTUS_W = 18;

function drawDino(ctx, x, y, frame, dead) {
  ctx.fillStyle = dead ? '#ef4444' : '#1e293b';

  // Body
  ctx.fillRect(x, y, DINO_W, DINO_H - 12);

  // Legs (running animation)
  if (!dead) {
    const leg = Math.floor(frame / 5) % 2;
    ctx.fillRect(x + 6,          y + DINO_H - 12, 9, 12 + (leg === 0 ? 4 : 0));
    ctx.fillRect(x + DINO_W - 15, y + DINO_H - 12, 9, 12 + (leg === 1 ? 4 : 0));
  } else {
    ctx.fillRect(x + 6,           y + DINO_H - 12, 9, 12);
    ctx.fillRect(x + DINO_W - 15, y + DINO_H - 12, 9, 12);
  }

  // Eye
  ctx.fillStyle = dead ? '#fca5a5' : '#f8fafc';
  ctx.fillRect(x + DINO_W - 11, y + 9, 8, 8);
  if (dead) {
    // X eyes
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x + DINO_W - 13, y + 7); ctx.lineTo(x + DINO_W - 5, y + 19); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + DINO_W - 5, y + 7); ctx.lineTo(x + DINO_W - 13, y + 19); ctx.stroke();
  } else {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + DINO_W - 9, y + 11, 5, 5);
  }
}

function drawCactus(ctx, x, h) {
  const green = '#16a34a';
  ctx.fillStyle = green;
  // Trunk
  ctx.fillRect(x + 4, GROUND_Y - h, CACTUS_W - 8, h);
  // Top cap
  ctx.fillRect(x, GROUND_Y - h, CACTUS_W, 14);
  // Arms
  ctx.fillRect(x - 10, GROUND_Y - h + 14, 14, 10);
  ctx.fillRect(x + CACTUS_W - 4, GROUND_Y - h + 14, 14, 10);
}

export default function DinoGame() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // All mutable game state lives in a ref — no React re-renders inside the loop
  const g = useRef({
    dinoY: GROUND_Y - DINO_H,
    dinoVY: 0,
    onGround: true,
    cacti: [],
    score: 0,
    speed: 4,
    frame: 0,
    phase: 'idle', // 'idle' | 'playing' | 'dead'
  });

  const rafId = useRef(null);

  function jump() {
    const s = g.current;
    if (s.phase === 'idle') { s.phase = 'playing'; return; }
    if (s.phase === 'dead') {
      // restart
      s.dinoY = GROUND_Y - DINO_H;
      s.dinoVY = 0;
      s.onGround = true;
      s.cacti = [];
      s.score = 0;
      s.speed = 4;
      s.frame = 0;
      s.phase = 'playing';
      return;
    }
    if (s.onGround) {
      s.dinoVY = JUMP_VY;
      s.onGround = false;
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function loop() {
      const s = g.current;
      ctx.clearRect(0, 0, W, H);

      // Sky
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, W, H);

      // Ground
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(W, GROUND_Y);
      ctx.stroke();

      if (s.phase === 'idle') {
        drawDino(ctx, DINO_X, GROUND_Y - DINO_H, 0, false);
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Presiona ESPACIO o toca la pantalla', W / 2, H / 2 + 4);
        rafId.current = requestAnimationFrame(loop);
        return;
      }

      if (s.phase === 'dead') {
        drawDino(ctx, DINO_X, s.dinoY, s.frame, true);
        s.cacti.forEach((c) => drawCactus(ctx, c.x, c.h));

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', W / 2, H / 2 - 8);
        ctx.font = '12px monospace';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Espacio / tap para reintentar', W / 2, H / 2 + 14);

        ctx.fillStyle = '#475569';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`Score: ${Math.floor(s.score)}`, W - 14, 20);

        rafId.current = requestAnimationFrame(loop);
        return;
      }

      // ── Playing ──────────────────────────────────────────────────
      s.frame++;

      // Dino physics
      s.dinoVY += GRAVITY;
      s.dinoY += s.dinoVY;
      if (s.dinoY >= GROUND_Y - DINO_H) {
        s.dinoY = GROUND_Y - DINO_H;
        s.dinoVY = 0;
        s.onGround = true;
      }

      // Spawn cactus
      const spawnInterval = Math.max(55, 110 - Math.floor(s.score / 15));
      if (s.cacti.length === 0 || (s.frame % spawnInterval === 0)) {
        if (s.frame > 30) {
          s.cacti.push({ x: W + 10, h: 28 + Math.random() * 28 });
        }
      }

      // Move + cull cacti
      s.cacti.forEach((c) => { c.x -= s.speed; });
      s.cacti = s.cacti.filter((c) => c.x > -40);

      // Speed ramp
      s.speed = 4 + s.score / 150;
      s.score += 0.12;

      // Collision (shrunk hitbox for fairness)
      for (const c of s.cacti) {
        const dinoLeft  = DINO_X + 6;
        const dinoRight = DINO_X + DINO_W - 6;
        const dinoBottom = s.dinoY + DINO_H - 4;
        const cLeft  = c.x;
        const cRight = c.x + CACTUS_W;
        const cTop   = GROUND_Y - c.h;
        if (dinoRight > cLeft && dinoLeft < cRight && dinoBottom > cTop) {
          s.phase = 'dead';
          break;
        }
      }

      // Draw
      drawDino(ctx, DINO_X, s.dinoY, s.frame, false);
      s.cacti.forEach((c) => drawCactus(ctx, c.x, c.h));

      // Score
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Score: ${Math.floor(s.score)}`, W - 14, 20);

      rafId.current = requestAnimationFrame(loop);
    }

    rafId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2 self-start">
        <button
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          <span className="text-base font-semibold text-slate-800">Modo desarrollador</span>
        </button>
      </div>

      {/* Badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
          Easter egg desbloqueado
        </span>
      </div>

      {/* Canvas */}
      <div
        className="card p-2 w-full cursor-pointer select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => { e.preventDefault(); jump(); }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full rounded"
          aria-label="Juego del dinosaurio"
        />
      </div>

      <p className="text-xs text-slate-400 text-center">
        Espacio · flecha arriba · tap para saltar
      </p>
    </div>
  );
}
