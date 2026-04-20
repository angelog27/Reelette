import AnimatedSection from "./AnimatedSection";
import { Disc3, Layers, Users, Rss, Bot } from "lucide-react";

const features = [
  {
    icon: Disc3,
    title: "Roulette Wheel Discovery",
    desc: "Spin, land, watch. The thrill of randomness meets smart filtering for serendipitous picks every time.",
  },
  {
    icon: Layers,
    title: "Cross-Platform Streaming",
    desc: "One unified search across every service you subscribe to. No more app-hopping to find where something plays.",
  },
  {
    icon: Users,
    title: "Group Watch",
    desc: "Collaborative ranking with friends. Everyone votes, Reelette picks the winner. No more group chat arguments.",
  },
  {
    icon: Rss,
    title: "Social Feed",
    desc: "See what your friends are watching, rating, and recommending. Your personal movie community, built in.",
  },
  {
    icon: Bot,
    title: '"The Director" AI',
    desc: "Your personal AI film advisor. Describe a vibe, a memory, a feeling — and it finds the perfect match.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <p className="text-xs font-medium text-primary uppercase tracking-[0.2em] mb-4">
            Features
          </p>
          <h2 className="font-space font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight">
            Everything you need. Nothing you don't.
          </h2>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <AnimatedSection
              key={f.title}
              delay={i * 0.1}
              className={i === features.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""}
            >
              <div className="bg-card border border-border/50 rounded-xl p-7 h-full hover:border-primary/20 hover:bg-card/80 transition-all duration-500 group">
                <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors duration-500">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-space font-semibold text-lg text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-inter">{f.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
