import { useEffect, useRef, useCallback } from "react";

interface Props {
  genre: string;
  onFinished: () => void;
  onClose: () => void;
}

const GENRE_COLORS: Record<string, string> = {
  "28": "#FF6B35",    // Action - orange
  "35": "#FFD700",    // Comedy - yellow
  "27": "#2ECC71",    // Horror - green
  "878": "#00CED1",   // Sci-Fi - cyan
  "18": "#9B59B6",    // Drama - purple
  "16": "#FF69B4",    // Animation - pink
  "10752": "#6B8E23", // War - olive
};

const SEGMENT_LABELS = [
  "ACTION", "DRAMA", "COMEDY", "HORROR",
  "SCI-FI", "THRILLER", "ROMANCE", "MYSTERY",
  "FANTASY", "WESTERN", "WAR", "CRIME",
  "HISTORY", "MUSIC", "FAMILY", "ANIMATION",
];

function getWheelColor(genre: string): string {
  return GENRE_COLORS[genre] ?? "#C0392B";
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const d = (v: number) => Math.max(0, Math.floor(v * (1 - amount)));
  return `#${d(r).toString(16).padStart(2, "0")}${d(g).toString(16).padStart(2, "0")}${d(b).toString(16).padStart(2, "0")}`;
}

export function RouletteWheelModal({ genre, onFinished, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const finishedRef = useRef(false);

  const DURATION = 4200;
  const SEGMENTS = 16;

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
    const accentDark = darken(accentColor, 0.45);
    const [ar, ag, ab] = hexToRgb(accentColor);

    // ── Background ──────────────────────────────────────────────
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, W * 0.6);
    bg.addColorStop(0, "#1a1a1a");
    bg.addColorStop(1, "#080808");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── Radial glow behind wheel ─────────────────────────────────
    const outerR = Math.min(W, H) * 0.38;
    const innerR = outerR * 0.22;
    const trackR = outerR * 0.88;   // ball groove radius
    const stripeR = outerR * 0.92;  // colored stripe just inside rim

    const glowGrad = ctx.createRadialGradient(cx, cy, outerR * 0.3, cx, cy, outerR * 1.4);
    glowGrad.addColorStop(0, `rgba(${ar},${ag},${ab},0.18)`);
    glowGrad.addColorStop(0.6, `rgba(${ar},${ag},${ab},0.07)`);
    glowGrad.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx, cy, outerR * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // ── Wheel spin ───────────────────────────────────────────────
    const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
    const spinAngle = easeOut(t) * Math.PI * 14 + timestamp * 0.0003 * (1 - t);

    // ── Segments ─────────────────────────────────────────────────
    for (let i = 0; i < SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2 + spinAngle;
      const nextAngle = ((i + 1) / SEGMENTS) * Math.PI * 2 + spinAngle;
      const isAccent = i % 2 === 0;

      // Main wedge
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, angle, nextAngle);
      ctx.closePath();
      ctx.fillStyle = isAccent ? `rgba(${ar},${ag},${ab},0.82)` : "#1e1e1e";
      ctx.fill();
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Colored stripe arc just inside rim
      const stripeVariation = isAccent ? 1 : 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, stripeR, angle + 0.03, nextAngle - 0.03);
      ctx.arc(cx, cy, outerR - 3, nextAngle - 0.03, angle + 0.03, true);
      ctx.closePath();
      ctx.fillStyle = isAccent
        ? `rgba(${ar},${ag},${ab},${stripeVariation})`
        : `rgba(${ar},${ag},${ab},0.18)`;
      ctx.fill();

      // Segment label
      const midAngle = angle + (nextAngle - angle) / 2;
      const labelR = outerR * 0.62;
      const lx = cx + Math.cos(midAngle) * labelR;
      const ly = cy + Math.sin(midAngle) * labelR;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.font = "bold 7px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 4;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(SEGMENT_LABELS[i] ?? "", 0, 0);
      ctx.restore();
    }

    // ── Ball track groove ────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(cx, cy, trackR, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, trackR, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 8;
    ctx.stroke();

    // ── Outer rim ───────────────────────────────────────────────
    // Metallic gradient ring
    const rimGrad = ctx.createLinearGradient(cx - outerR, cy, cx + outerR, cy);
    rimGrad.addColorStop(0, "#555");
    rimGrad.addColorStop(0.3, "#aaa");
    rimGrad.addColorStop(0.5, "#ddd");
    rimGrad.addColorStop(0.7, "#aaa");
    rimGrad.addColorStop(1, "#555");
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${ar},${ag},${ab},0.5)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Metallic studs on rim ────────────────────────────────────
    const STUDS = 32;
    for (let i = 0; i < STUDS; i++) {
      const angle = (i / STUDS) * Math.PI * 2 + spinAngle;
      const sx = cx + Math.cos(angle) * outerR;
      const sy = cy + Math.sin(angle) * outerR;
      const studGrad = ctx.createRadialGradient(sx - 1, sy - 1, 0.5, sx, sy, 4);
      studGrad.addColorStop(0, "#fff");
      studGrad.addColorStop(0.5, "#bbb");
      studGrad.addColorStop(1, "#555");
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = studGrad;
      ctx.fill();
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // ── Hub cap — film reel style ────────────────────────────────
    const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
    hubGrad.addColorStop(0, accentColor);
    hubGrad.addColorStop(0.6, accentDark);
    hubGrad.addColorStop(1, "#0a0a0a");
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = `rgba(${ar},${ag},${ab},0.7)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hub holes (film reel — 4 around center)
    const holeR = innerR * 0.28;
    const holeDist = innerR * 0.55;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + spinAngle * 0.5;
      const hx = cx + Math.cos(angle) * holeDist;
      const hy = cy + Math.sin(angle) * holeDist;
      ctx.beginPath();
      ctx.arc(hx, hy, holeR, 0, Math.PI * 2);
      ctx.fillStyle = "#050505";
      ctx.fill();
      ctx.strokeStyle = `rgba(${ar},${ag},${ab},0.4)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, innerR * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${ar},${ag},${ab},0.9)`;
    ctx.fill();

    // ── Ball physics ─────────────────────────────────────────────
    const spiralPhase = Math.max((t - 0.6) / 0.4, 0);
    const ballAngle = -Math.PI / 2 + elapsed * 0.004 * (1 - t * 0.7) * 8;
    const orbitR = trackR;
    const landR = outerR * 0.55;
    const spiralEase = easeOut(spiralPhase);
    const ballR = orbitR - (orbitR - landR) * spiralEase;
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

    // ── Needle (top, SVG-style triangle pointing inward) ─────────
    const needleTip = cy - outerR + 4;
    const needleBase = cy - outerR - 14;
    ctx.beginPath();
    ctx.moveTo(cx, needleTip);
    ctx.lineTo(cx - 9, needleBase);
    ctx.lineTo(cx + 9, needleBase);
    ctx.closePath();
    ctx.fillStyle = accentColor;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Needle base dot
    ctx.beginPath();
    ctx.arc(cx, needleBase, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();

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
