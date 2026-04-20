const services = [
  { name: "Netflix", letter: "N" },
  { name: "Hulu", letter: "H" },
  { name: "Disney+", letter: "D+" },
  { name: "HBO Max", letter: "HBO" },
  { name: "Prime Video", letter: "P" },
  { name: "Apple TV+", letter: "TV+" },
  { name: "Paramount+", letter: "P+" },
  { name: "Peacock", letter: "🦚" },
];

function LogoPill({ name, letter }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-border/40 bg-secondary/30">
      <span className="font-space font-bold text-sm text-foreground/40">{letter}</span>
      <span className="text-sm font-medium text-foreground/30 whitespace-nowrap">{name}</span>
    </div>
  );
}

function MarqueeRow({ reverse = false }) {
  const doubled = [...services, ...services, ...services, ...services];
  return (
    <div className="flex gap-3 animate-marquee-left" style={{ direction: reverse ? "rtl" : "ltr" }}>
      {doubled.map((s, i) => (
        <LogoPill key={`${s.name}-${i}`} name={s.name} letter={s.letter} />
      ))}
    </div>
  );
}

export default function StreamingMarquee() {
  return (
    <section className="py-16 overflow-hidden relative">
      <p className="text-center text-xs font-medium text-muted-foreground/60 uppercase tracking-[0.2em] mb-8">
        Works with all your services
      </p>
      <div
        className="space-y-3"
        style={{
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
          maskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
        }}
      >
        <div className="overflow-hidden">
          <MarqueeRow />
        </div>
        <div className="overflow-hidden">
          <MarqueeRow reverse />
        </div>
      </div>
    </section>
  );
}
