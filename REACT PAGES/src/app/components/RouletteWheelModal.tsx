import { useEffect, useRef, useCallback } from "react";

interface Props {
  genre: string;
  isSpinning: boolean;
  canFinish: boolean;
  onFinished: () => void;
}

const GENRE_COLORS: Record<string, string> = {
  "28": "#FF6B35",
  "35": "#FFD700",
  "27": "#2ECC71",
  "878": "#00CED1",
  "18": "#9B59B6",
  "16": "#FF69B4",
  "10752": "#6B8E23",
};

const SEGMENT_LABELS = [
  "ACTION", "DRAMA", "COMEDY", "HORROR",
  "SCI-FI", "THRILLER", "ROMANCE", "MYSTERY",
  "FANTASY", "WESTERN", "WAR", "CRIME",
  "HISTORY", "MUSIC", "FAMILY", "ANIMATION",
];

export function getWheelColor(genre: string): string {
  return GENRE_COLORS[genre] ?? "#7C5DBD";
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const d = (v: number) => Math.max(0, Math.floor(v * (1 - amount)));
  return `#${d(r).toString(16).padStart(2, "0")}${d(g).toString(16).padStart(2, "0")}${d(b).toString(16).padStart(2, "0")}`;
}

const DURATION = 6500;
const SEGMENTS = 16;
const BG_COLOR = "#0A0A0A";

export function RouletteWheelModal({ genre, isSpinning, canFinish, onFinished }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const finishedRef = useRef(false);

  const isSpinningRef = useRef(isSpinning);
  const canFinishRef = useRef(canFinish);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => { isSpinningRef.current = isSpinning; }, [isSpinning]);
  useEffect(() => { canFinishRef.current = canFinish; }, [canFinish]);
  useEffect(() => { onFinishedRef.current = onFinished; }, [onFinished]);

  // Reset timing when a new spin starts
  useEffect(() => {
    if (isSpinning) {
      startTimeRef.current = 0;
      finishedRef.current = false;
    }
  }, [isSpinning]);

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    const accentColor = getWheelColor(genre);
    const accentDark = darken(accentColor, 0.45);
    const [ar, ag, ab] = hexToRgb(accentColor);
    const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

    const outerR = Math.min(W, H) * 0.38;
    const innerR = outerR * 0.22;
    const trackR = outerR * 0.88;
    const stripeR = outerR * 0.92;

    // ── Background — match page exactly ──────────────────────────
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // ── Determine spin progress ───────────────────────────────────
    const spinning = isSpinningRef.current;
    let spinAngle: number;
    let ballAngle: number;
    let ballR: number;
    let elapsed: number;
    let pulseSpeed: number;

    if (!spinning) {
      // IDLE: slow drift, ball at rest in groove
      elapsed = timestamp;
      spinAngle = timestamp * 0.00012;
      ballAngle = Math.PI * 0.65;
      ballR = trackR;
      pulseSpeed = 2800;
    } else {
      // SPINNING
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      elapsed = timestamp - startTimeRef.current;
      const t = Math.min(elapsed / DURATION, 1);

      spinAngle = easeOut(t) * Math.PI * 18 + timestamp * 0.0003 * (1 - t);
      const spiralPhase = Math.max((t - 0.65) / 0.35, 0);
      ballAngle = -Math.PI / 2 + elapsed * 0.004 * (1 - t * 0.68) * 8;
      ballR = trackR - (trackR - outerR * 0.55) * easeOut(spiralPhase)
        + Math.sin(elapsed * 0.04) * (1 - spiralPhase) * outerR * 0.04;
      pulseSpeed = 1600;

      // Trigger finish only once, when animation done AND API ready
      if (t >= 1 && !finishedRef.current && canFinishRef.current) {
        finishedRef.current = true;
        setTimeout(() => onFinishedRef.current(), 350);
      }
    }

    // ── Pulsing glow ─────────────────────────────────────────────
    const pulseT = (Math.sin((elapsed / pulseSpeed) * Math.PI * 2) + 1) / 2;
    const pulseAlpha = spinning ? 0.14 + pulseT * 0.24 : 0.06 + pulseT * 0.09;

    const glowGrad = ctx.createRadialGradient(cx, cy, outerR * 0.5, cx, cy, outerR * 1.6);
    glowGrad.addColorStop(0, `rgba(${ar},${ag},${ab},${pulseAlpha})`);
    glowGrad.addColorStop(0.55, `rgba(${ar},${ag},${ab},${pulseAlpha * 0.35})`);
    glowGrad.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx, cy, outerR * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // Ring glow
    const ringAlpha = spinning ? 0.35 + pulseT * 0.45 : 0.15 + pulseT * 0.2;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${ar},${ag},${ab},${ringAlpha})`;
    ctx.lineWidth = spinning ? 4 + pulseT * 5 : 2 + pulseT * 2;
    ctx.shadowColor = `rgba(${ar},${ag},${ab},0.85)`;
    ctx.shadowBlur = spinning ? 14 + pulseT * 22 : 6 + pulseT * 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Segments ──────────────────────────────────────────────────
    for (let i = 0; i < SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2 + spinAngle;
      const nextAngle = ((i + 1) / SEGMENTS) * Math.PI * 2 + spinAngle;
      const isAccent = i % 2 === 0;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, angle, nextAngle);
      ctx.closePath();
      ctx.fillStyle = isAccent ? `rgba(${ar},${ag},${ab},0.82)` : "#1e1e1e";
      ctx.fill();
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Stripe arc
      ctx.beginPath();
      ctx.arc(cx, cy, stripeR, angle + 0.03, nextAngle - 0.03);
      ctx.arc(cx, cy, outerR - 3, nextAngle - 0.03, angle + 0.03, true);
      ctx.closePath();
      ctx.fillStyle = isAccent
        ? `rgba(${ar},${ag},${ab},1)`
        : `rgba(${ar},${ag},${ab},0.18)`;
      ctx.fill();

      // Label
      const midAngle = angle + (nextAngle - angle) / 2;
      const lx = cx + Math.cos(midAngle) * outerR * 0.62;
      const ly = cy + Math.sin(midAngle) * outerR * 0.62;
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

    // ── Ball track groove ─────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(cx, cy, trackR, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, trackR, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 8;
    ctx.stroke();

    // ── Metallic outer rim ────────────────────────────────────────
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

    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${ar},${ag},${ab},${0.45 + pulseT * 0.35})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Metallic studs ────────────────────────────────────────────
    const STUDS = 32;
    for (let i = 0; i < STUDS; i++) {
      const angle = (i / STUDS) * Math.PI * 2 + spinAngle;
      const sx = cx + Math.cos(angle) * outerR;
      const sy = cy + Math.sin(angle) * outerR;
      const sg = ctx.createRadialGradient(sx - 1, sy - 1, 0.5, sx, sy, 4);
      sg.addColorStop(0, "#fff");
      sg.addColorStop(0.5, "#bbb");
      sg.addColorStop(1, "#555");
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // ── Hub — film reel ───────────────────────────────────────────
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
    ctx.beginPath();
    ctx.arc(cx, cy, innerR * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${ar},${ag},${ab},0.9)`;
    ctx.fill();

    // ── Ball ──────────────────────────────────────────────────────
    const bx = cx + Math.cos(ballAngle) * ballR;
    const by = cy + Math.sin(ballAngle) * ballR;
    ctx.beginPath();
    ctx.arc(bx + 2, by + 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fill();
    const ballGrad = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, 9);
    ballGrad.addColorStop(0, "#fff");
    ballGrad.addColorStop(0.4, "#e0e0e0");
    ballGrad.addColorStop(1, "#aaa");
    ctx.beginPath();
    ctx.arc(bx, by, 9, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx - 3, by - 3, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fill();

    // ── Needle ────────────────────────────────────────────────────
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
    ctx.beginPath();
    ctx.arc(cx, needleBase, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();

    // ── Always schedule next frame — loop never dies ───────────────
    animRef.current = requestAnimationFrame(draw);
  }, [genre]); // intentionally minimal deps — all live values are in refs

  // Start loop once on mount; it runs until unmount
  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <div className="flex flex-col items-center w-full">
      <canvas
        ref={canvasRef}
        width={380}
        height={380}
        className="max-w-full"
        style={{ maxHeight: 380 }}
      />
    </div>
  );
}
