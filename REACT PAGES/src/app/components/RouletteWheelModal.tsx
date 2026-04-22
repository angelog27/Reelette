import { useEffect, useRef, useCallback } from "react";

interface Props {
  genre: string;
  isSpinning: boolean; // true = run full animation; false = idle
  canFinish: boolean;  // API result is ready; wheel won't complete until this is true
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

function getWheelColor(genre: string): string {
  return GENRE_COLORS[genre] ?? "#C0392B";
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

const DURATION = 6500; // ms — long enough that API always returns first
const SEGMENTS = 16;

export function RouletteWheelModal({ genre, isSpinning, canFinish, onFinished }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const finishedRef = useRef(false);

  // Refs for values used inside the RAF loop — never deps
  const isSpinningRef = useRef(isSpinning);
  const canFinishRef = useRef(canFinish);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => { isSpinningRef.current = isSpinning; }, [isSpinning]);
  useEffect(() => { canFinishRef.current = canFinish; }, [canFinish]);
  useEffect(() => { onFinishedRef.current = onFinished; }, [onFinished]);

  // When a new spin starts, reset timing
  useEffect(() => {
    if (isSpinning) {
      startTimeRef.current = 0;
      finishedRef.current = false;
    }
  }, [isSpinning]);

  const drawFrame = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    outerR: number, innerR: number, trackR: number, stripeR: number,
    spinAngle: number,
    ballAngle: number, ballR: number,
    accentColor: string, accentDark: string,
    ar: number, ag: number, ab: number,
    elapsed: number,
    isIdle: boolean,
  ) => {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

    // Background
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, W * 0.6);
    bg.addColorStop(0, "#1a1a1a");
    bg.addColorStop(1, "#080808");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Pulsing outer glow
    const pulseSpeed = isIdle ? 2800 : 1600;
    const pulseT = (Math.sin((elapsed / pulseSpeed) * Math.PI * 2) + 1) / 2;
    const pulseAlpha = isIdle ? 0.07 + pulseT * 0.1 : 0.14 + pulseT * 0.24;

    const glowGrad = ctx.createRadialGradient(cx, cy, outerR * 0.5, cx, cy, outerR * 1.6);
    glowGrad.addColorStop(0, `rgba(${ar},${ag},${ab},${pulseAlpha})`);
    glowGrad.addColorStop(0.55, `rgba(${ar},${ag},${ab},${pulseAlpha * 0.35})`);
    glowGrad.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx, cy, outerR * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // Ring glow
    const ringAlpha = isIdle ? 0.2 + pulseT * 0.2 : 0.35 + pulseT * 0.45;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${ar},${ag},${ab},${ringAlpha})`;
    ctx.lineWidth = isIdle ? 3 + pulseT * 2 : 4 + pulseT * 5;
    ctx.shadowColor = `rgba(${ar},${ag},${ab},0.85)`;
    ctx.shadowBlur = isIdle ? 8 + pulseT * 10 : 14 + pulseT * 22;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Segments
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

    // Ball track groove
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

    // Metallic outer rim
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

    // Studs
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

    // Hub — film reel
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

    // Ball
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

    // Needle
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

    void easeOut; // used by callers
  }, []);

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
    const outerR = Math.min(W, H) * 0.38;
    const innerR = outerR * 0.22;
    const trackR = outerR * 0.88;
    const stripeR = outerR * 0.92;
    const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

    if (!isSpinningRef.current) {
      // ── IDLE: slow drift, ball resting in groove ──────────────
      const idleAngle = timestamp * 0.00012;
      const idleBallAngle = Math.PI * 0.65; // fixed pocket
      const idleBallR = trackR;
      drawFrame(
        ctx, cx, cy, outerR, innerR, trackR, stripeR,
        idleAngle, idleBallAngle, idleBallR,
        accentColor, accentDark, ar, ag, ab,
        timestamp, true,
      );
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    // ── SPINNING ──────────────────────────────────────────────
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;
    const t = Math.min(elapsed / DURATION, 1);

    const spinAngle = easeOut(t) * Math.PI * 18 + timestamp * 0.0003 * (1 - t);

    // Ball: orbits trackR at full speed, spirals inward after 65% done
    const spiralPhase = Math.max((t - 0.65) / 0.35, 0);
    const ballAngle = -Math.PI / 2 + elapsed * 0.004 * (1 - t * 0.68) * 8;
    const landR = outerR * 0.55;
    const ballR = trackR - (trackR - landR) * easeOut(spiralPhase)
      + Math.sin(elapsed * 0.04) * (1 - spiralPhase) * outerR * 0.04;

    drawFrame(
      ctx, cx, cy, outerR, innerR, trackR, stripeR,
      spinAngle, ballAngle, ballR,
      accentColor, accentDark, ar, ag, ab,
      elapsed, false,
    );

    if (t >= 1 && !finishedRef.current) {
      if (canFinishRef.current) {
        // API is ready — wrap up
        finishedRef.current = true;
        setTimeout(() => onFinishedRef.current(), 350);
        return;
      }
      // API not ready yet — hold the ball at landing, keep looping
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    animRef.current = requestAnimationFrame(draw);
  }, [genre, drawFrame]); // onFinished, isSpinning, canFinish intentionally in refs

  // Single persistent animation loop
  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <div className="flex flex-col items-center gap-1 w-full">
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
