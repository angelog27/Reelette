import netflixLogo from "../../../../../assets/netflix-logo.png";
import huluLogo from "../../../../../assets/hulu.webp";
import disneyLogo from "../../../../../assets/disney-plus.jpg";
import hboLogo from "../../../../../assets/hbo-max.png";
import primeLogo from "../../../../../assets/prime-video.jpg";
import appleLogo from "../../../../../assets/apple-tv+.webp";
import paramountLogo from "../../../../../assets/paramount-plus.jpg";
import peacockLogo from "../../../../../assets/Peacock.png";

const services = [
  { name: "Netflix", logo: netflixLogo },
  { name: "Hulu", logo: huluLogo },
  { name: "Disney+", logo: disneyLogo },
  { name: "HBO Max", logo: hboLogo },
  { name: "Prime Video", logo: primeLogo },
  { name: "Apple TV+", logo: appleLogo },
  { name: "Paramount+", logo: paramountLogo },
  { name: "Peacock", logo: peacockLogo },
];

function LogoTile({ name, logo }) {
  return (
    <div className="flex-shrink-0 flex flex-col items-center gap-2">
      <div className="w-28 h-28 rounded-xl border border-[#e50914]/20 bg-[#e50914]/10 flex items-center justify-center overflow-hidden">
        <img
          src={logo}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <span className="text-xs font-medium text-foreground/40 whitespace-nowrap">{name}</span>
    </div>
  );
}

function MarqueeRow({ reverse = false }) {
  const doubled = [...services, ...services, ...services, ...services];
  return (
    <div className="flex gap-5 animate-marquee-left" style={{ direction: reverse ? "rtl" : "ltr" }}>
      {doubled.map((s, i) => (
        <LogoTile key={`${s.name}-${i}`} name={s.name} logo={s.logo} />
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
        className="space-y-5"
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
