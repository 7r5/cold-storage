// Secret dino game — unlocked by clicking the logo 6 times in /acerca-de
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Canvas dimensions (logical pixels — scaled to full width via CSS)
const W = 600;
const H = 160;
const GROUND_Y = H - 24;

// Truck constants
const DINO_X = 50;
const DINO_W = 56; // truck is wider than the dino was
const DINO_H = 36; // truck is lower/squatter
const GRAVITY = 0.55;
const JUMP_VY = -12;

// Cactus constants
const CACTUS_W = 30;

function drawTruck(ctx, x, y, frame, dead) {
  const WR = 6;           // wheel radius
  const bodyH = DINO_H - WR * 2 - 2; // cargo box height (above wheels)
  const bodyY = y;        // top of cargo box
  const wheelY = y + DINO_H - WR; // wheel centres

  // Colour scheme
  const cargoColor  = dead ? '#94a3b8' : '#1d4ed8'; // blue cargo box
  const cabColor    = dead ? '#cbd5e1' : '#2563eb';
  const stripeColor = dead ? '#cbd5e1' : '#3b82f6';
  const wheelColor  = dead ? '#9ca3af' : '#1e293b';
  const hubColor    = '#94a3b8';
  const windowColor = '#bfdbfe';
  const cabX = x + DINO_W * 0.62;
  const cabW = DINO_W * 0.38;
  const cabH = bodyH * 0.75;
  const cabY = bodyY + bodyH - cabH;

  // ── Cargo box (left ~62% of width) ────────────────────────────
  ctx.fillStyle = cargoColor;
  ctx.fillRect(x, bodyY, DINO_W * 0.62, bodyH);

  // Inner stripe / panel detail
  ctx.fillStyle = stripeColor;
  ctx.fillRect(x + 3, bodyY + 3, DINO_W * 0.62 - 6, bodyH - 6);

  // Snowflake cross on cargo (cold-chain theme)
  ctx.strokeStyle = windowColor;
  ctx.lineWidth = 1.8;
  const cx = x + DINO_W * 0.31;
  const cy = bodyY + bodyH / 2;
  const r = 5;
  [[1,0],[-1,0],[0,1],[0,-1],[0.7,0.7],[-0.7,-0.7],[0.7,-0.7],[-0.7,0.7]].forEach(([dx,dy]) => {
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx*r, cy + dy*r); ctx.stroke();
  });

  // ── Cab (right ~38% of width) ─────────────────────────────────
  ctx.fillStyle = cabColor;
  ctx.fillRect(cabX, cabY, cabW, cabH);

  // Windshield
  ctx.fillStyle = windowColor;
  ctx.fillRect(cabX + 3, cabY + 3, cabW - 8, cabH * 0.55);

  // Front bumper
  ctx.fillStyle = dead ? '#94a3b8' : '#1e40af';
  ctx.fillRect(x + DINO_W - 3, cabY + cabH * 0.55, 4, cabH * 0.35);

  // Divider between cargo and cab
  ctx.fillStyle = dead ? '#94a3b8' : '#1e3a8a';
  ctx.fillRect(cabX - 2, bodyY, 3, bodyH);

  // ── Wheels ────────────────────────────────────────────────────
  const wheelPositions = [x + DINO_W * 0.17, x + DINO_W * 0.77];
  const spoke = frame * 0.07; // rotation angle
  wheelPositions.forEach((wx) => {
    // Tyre
    ctx.fillStyle = wheelColor;
    ctx.beginPath();
    ctx.arc(wx, wheelY, WR, 0, Math.PI * 2);
    ctx.fill();
    // Hub
    ctx.fillStyle = hubColor;
    ctx.beginPath();
    ctx.arc(wx, wheelY, WR * 0.38, 0, Math.PI * 2);
    ctx.fill();
    // Spokes (only while alive)
    if (!dead) {
      ctx.strokeStyle = hubColor;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const a = spoke + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.moveTo(wx, wheelY);
        ctx.lineTo(wx + Math.cos(a) * WR * 0.82, wheelY + Math.sin(a) * WR * 0.82);
        ctx.stroke();
      }
    }
  });
}

// Keep legacy alias so callers don't need changing
const drawDino = drawTruck;

function drawCactus(ctx, x, h) {
  const r = h * 0.38;                 // virus body radius (varies with h)
  const cx = x + CACTUS_W / 2;
  const cy = GROUND_Y - r;           // sits on the ground line
  const spikeCount = 10;
  const spikeLen = r * 0.4;

  // ── Spikes (drawn behind the body) ───────────────────────────────
  ctx.fillStyle = '#b91c1c';
  for (let i = 0; i < spikeCount; i++) {
    const angle = (i / spikeCount) * Math.PI * 2;
    const tipX = cx + Math.cos(angle) * (r + spikeLen);
    const tipY = cy + Math.sin(angle) * (r + spikeLen);
    // Triangle spike
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle - 0.3) * r, cy + Math.sin(angle - 0.3) * r);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(cx + Math.cos(angle + 0.3) * r, cy + Math.sin(angle + 0.3) * r);
    ctx.closePath();
    ctx.fill();
    // Ball at spike tip
    ctx.beginPath();
    ctx.arc(tipX, tipY, spikeLen * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Main body ────────────────────────────────────────────────────
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = '#fca5a5';
  ctx.beginPath();
  ctx.arc(cx - r * 0.22, cy - r * 0.22, r * 0.48, 0, Math.PI * 2);
  ctx.fill();

  // RNA dots
  ctx.fillStyle = '#991b1b';
  [[-0.28, -0.05], [0.1, 0.22], [-0.08, 0.3]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(cx + dx * r, cy + dy * r, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  });
}

export default function DinoGame() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // High score — persisted in localStorage, per device
  const [highScore, setHighScore] = useState(() => {
    try { return JSON.parse(localStorage.getItem('truckHighScore') || '{"score":0,"name":""}'); }
    catch { return { score: 0, name: '' }; }
  });
  const highScoreRef = useRef(null);
  useEffect(() => { highScoreRef.current = highScore; }, [highScore]);

  // Name-input overlay — shown when a new record is set
  const [overlay, setOverlay] = useState(null); // { score: number } | null
  const [nameInput, setNameInput] = useState('');
  const overlayActive = useRef(false);
  // Updated every render so the game loop can call it without stale closure
  const triggerOverlay = useRef(null);
  triggerOverlay.current = (data) => { overlayActive.current = true; setOverlay(data); };

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

  function saveRecord() {
    const name = nameInput.trim() || 'Anónimo';
    const record = { score: overlay.score, name };
    localStorage.setItem('truckHighScore', JSON.stringify(record));
    setHighScore(record);
    setOverlay(null);
    setNameInput('');
    overlayActive.current = false;
  }

  function jump() {
    if (overlayActive.current) return; // esperando que ingresen nombre
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

    function drawHiScore() {
      const hs = highScoreRef.current;
      if (!hs || hs.score <= 0) return;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      const label = hs.name ? `Récord: ${hs.score} · ${hs.name}` : `Récord: ${hs.score}`;
      ctx.fillText(label, 8, 16);
    }

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
        drawHiScore();
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
        drawHiScore();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', W / 2, H / 2 - 8);

        if (!overlayActive.current) {
          ctx.font = '12px monospace';
          ctx.fillStyle = '#64748b';
          ctx.fillText('Espacio / tap para reintentar', W / 2, H / 2 + 14);
        }

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
          if (Math.floor(s.score) > (highScoreRef.current?.score ?? 0)) {
            triggerOverlay.current({ score: Math.floor(s.score) });
          }
          break;
        }
      }

      // Draw
      drawDino(ctx, DINO_X, s.dinoY, s.frame, false);
      s.cacti.forEach((c) => drawCactus(ctx, c.x, c.h));
      drawHiScore();

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
    <div
      className="space-y-4 pb-4 min-h-screen"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        if (e.target.closest('button, input')) return;
        e.preventDefault();
        jump();
      }}
    >
      {/* Header — mismo patrón que otras páginas */}
      <div className="flex items-center gap-2">
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

        <span className="ml-2 text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
          Easter egg desbloqueado
        </span>
      </div>

      {/* Canvas */}
      <div className="card p-2 w-full cursor-pointer select-none relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full rounded"
          aria-label="Juego del camión"
        />

        {/* Nuevo récord — overlay para ingresar nombre */}
        {overlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded">
            <div
              className="bg-white rounded-2xl shadow-xl p-5 flex flex-col gap-3 w-64"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-center text-lg font-bold text-slate-800">🏆 ¡Nuevo récord!</p>
              <p className="text-center text-3xl font-mono font-bold text-blue-600">{overlay.score}</p>
              <input
                autoFocus
                type="text"
                maxLength={20}
                placeholder="Tu nombre"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveRecord(); e.stopPropagation(); }}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
              />
              <button
                onClick={saveRecord}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2 text-sm"
              >
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center">
        Espacio · flecha arriba · tap en cualquier parte para saltar
      </p>
    </div>
  );
}
