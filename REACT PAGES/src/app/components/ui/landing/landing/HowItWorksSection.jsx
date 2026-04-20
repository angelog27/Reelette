import AnimatedSection from "./AnimatedSection";
import { MonitorPlay, SlidersHorizontal, Sparkles } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: MonitorPlay,
    title: "Pick your streaming services",
    desc: "Tell us what you have — Netflix, Hulu, Disney+, whatever. We only show what you can actually watch.",
  },
  {
    num: "02",
    icon: SlidersHorizontal,
    title: "Set your mood with filters",
    desc: "Genre, decade, runtime, rating — dial in exactly what you're feeling tonight. Or don't. We'll surprise you.",
  },
  {
    num: "03",
    icon: Sparkles,
    title: "Spin the Reel",
    desc: "One tap. One movie. Instantly. No more 45 minutes of browsing for a 90-minute film.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-24 md:py-32 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/30 to-transparent pointer-events-none" />
      <div className="max-w-6xl mx-auto relative">
        <AnimatedSection className="text-center mb-20">
          <p className="text-xs font-medium text-primary uppercase tracking-[0.2em] mb-4">
            How It Works
          </p>
          <h2 className="font-space font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight">
            Three steps. One movie.
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, i) => (
            <AnimatedSection key={step.num} delay={i * 0.15}>
              <div className="relative group">
                <span className="font-space font-bold text-6xl md:text-7xl text-primary/10 group-hover:text-primary/20 transition-colors duration-500 absolute -top-4 -left-2">
                  {step.num}
                </span>
                <div className="relative pt-12">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-space font-semibold text-xl text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed font-inter">{step.desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
