import { useEffect, useRef, useCallback } from "react";

interface Props {
  genre: string;
  onFinished: () => void;
  onClose: () => void;
}

const GENRE_COLORS: Record<string, string> = {
  "28": "#FF6B35",   // Action - orange
  "35": "#FFD700",   // Comedy - yellow
  "27": "#2ECC71",   // Horror - green
  "878": "#00CED1",  // Sci-Fi - cyan
  "18": "#9B59B6",   // Drama - purple
  "16": "#FF69B4",   // Animation - pink
  "10752": "#6B8E23",// War - olive
};

function getWheelColor(genre: string): string {
  return GENRE_COLORS[genre] ?? "#C0392B";
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function RouletteWheelModal({ genre, onFinished, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const finishedRef = useRef(false);

  const DURATION = 4200;

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;
    const t = Math.min(elapsed / DURATION, 1);

    const accentColor = getWheelColor(genre);
    const [ar, ag, ab] = hexToRgb(accentColor);

    // ── Background ──────────────────────────────────────────────
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, W * 0.6);
    bg.addColorStop(0, "#1a1a1a");
    bg.addColorStop(1, "#080808");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── Wheel geometry ───────────────────────────────────────────
    const SEGMENTS = 16;
    const outerR = Math.min(W, H) * 0.38;
    const innerR = outerR * 0.22;

    // Wheel spin: fast at start, decelerates with easeOut
    const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
    const spinAngle = easeOut(t) * Math.PI * 14 + timestamp * 0.0003 * (1 - t);

    // Draw segments
    for (let i = 0; i < SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2 + spinAngle;
      const nextAngle = ((i + 1) / SEGMENTS) * Math.PI * 2 + spinAngle;
      const isAccent = i % 2 === 0;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, angle, nextAngle);
      ctx.closePath();

      if (isAccent) {
        ctx.fillStyle = `rgba(${ar},${ag},${ab},0.85)`;
      } else {
        ctx.fillStyle = "#1e1e1e";
      }
      ctx.fill();

      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Outer ring glow
    const glow = ctx.createRadialGradient(cx, cy, outerR * 0.9, cx, cy, outerR * 1.08);
    glow.addColorStop(0, `rgba(${ar},${ag},${ab},0.4)`);
    glow.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx, cy, outerR * 1.05, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Outer border
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${ar},${ag},${ab},0.8)`;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pin bumpers on rim
    for (let i = 0; i < SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2 + spinAngle;
      const bx = cx + Math.cos(angle) * outerR;
      const by = cy + Math.sin(angle) * outerR;
      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }

    // Hub cap
    const hub = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
    hub.addColorStop(0, "#333");
    hub.addColorStop(1, "#111");
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = hub;
    ctx.fill();
    ctx.strokeStyle = `rgba(${ar},${ag},${ab},0.6)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Ball physics ─────────────────────────────────────────────
    // Phase 1 (0–0.6): orbiting at full outerR, fast angular speed
    // Phase 2 (0.6–1): spiraling inward, decelerating
    const orbitPhase = Math.min(t / 0.6, 1);
    const spiralPhase = Math.max((t - 0.6) / 0.4, 0);

    // Angular velocity: starts fast, slows
    const angularSpeed = 8 * (1 - easeOut(t));
    const ballAngle = -Math.PI / 2 + elapsed * 0.004 * (1 - t * 0.7) * 8;

    // Radius: orbit near rim, then spiral toward center-ish
    const orbitR = outerR * 1.02;
    const landR = outerR * 0.55;
    const spiralEase = easeOut(spiralPhase);
    const ballR = orbitR - (orbitR - landR) * spiralEase;

    // Add wobble / bounce as it spirals in
    const wobble = Math.sin(elapsed * 0.04) * (1 - spiralPhase) * outerR * 0.04;
    const finalBallR = ballR + wobble;

    const bx = cx + Math.cos(ballAngle) * finalBallR;
    const by = cy + Math.sin(ballAngle) * finalBallR;

    // Ball shadow
    ctx.beginPath();
    ctx.arc(bx + 2, by + 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fill();

    // Ball gradient
    const ballGrad = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, 9);
    ballGrad.addColorStop(0, "#fff");
    ballGrad.addColorStop(0.4, "#e0e0e0");
    ballGrad.addColorStop(1, "#aaa");
    ctx.beginPath();
    ctx.arc(bx, by, 9, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();

    // Ball shimmer
    ctx.beginPath();
    ctx.arc(bx - 3, by - 3, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fill();

    // ── Pointer (top) ────────────────────────────────────────────
    const pTip = cy - outerR - 4;
    ctx.beginPath();
    ctx.moveTo(cx, pTip + 18);
    ctx.lineTo(cx - 8, pTip + 4);
    ctx.lineTo(cx + 8, pTip + 4);
    ctx.closePath();
    ctx.fillStyle = `rgb(${ar},${ag},${ab})`;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Center label ─────────────────────────────────────────────
    ctx.save();
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(${ar},${ag},${ab},0.9)`;
    ctx.fillText("REELETTE", cx, cy);
    ctx.restore();

    // ── Done? ────────────────────────────────────────────────────
    if (t >= 1 && !finishedRef.current) {
      finishedRef.current = true;
      setTimeout(onFinished, 300);
      return;
    }

    animRef.current = requestAnimationFrame(draw);
  }, [genre, onFinished]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    finishedRef.current = false;
    startTimeRef.current = 0;
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-gray-400 text-sm tracking-widest uppercase animate-pulse">
          Spinning…
        </p>
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          style={{ borderRadius: "50%" }}
        />
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-300 text-xs transition-colors"
        >
          cancel
        </button>
      </div>
    </div>
  );
}
