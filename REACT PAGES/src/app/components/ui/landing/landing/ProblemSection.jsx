import AnimatedSection from "./AnimatedSection";
import { Tv, Search, Star } from "lucide-react";

const problems = [
  { icon: Tv, service: "Netflix", verb: "catalogues." },
  { icon: Search, service: "JustWatch", verb: "tells." },
  { icon: Star, service: "Letterboxd", verb: "rates." },
];

export default function ProblemSection() {
  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <p className="text-xs font-medium text-primary uppercase tracking-[0.2em] mb-4">
            The Problem
          </p>
          <h2 className="font-space font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight max-w-3xl mx-auto leading-tight">
            Everyone tells you <span className="text-primary">what</span> to watch.
            <br />
            Nobody helps you <span className="text-primary">decide</span>.
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {problems.map((p, i) => (
            <AnimatedSection key={p.service} delay={i * 0.12}>
              <div className="bg-card border border-border/50 rounded-xl p-8 text-center hover:border-primary/20 transition-colors duration-500">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-5">
                  <p.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="font-space font-semibold text-lg text-foreground mb-1">{p.service}</p>
                <p className="text-muted-foreground text-sm">{p.verb}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="text-center" delay={0.2}>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto font-inter leading-relaxed">
            But nobody just gives you a movie <span className="text-foreground font-medium">right now</span>.
            <br />
            <span className="text-primary font-semibold">Reelette does.</span>
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
