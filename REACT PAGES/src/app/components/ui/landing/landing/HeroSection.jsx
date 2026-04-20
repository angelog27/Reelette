import { motion } from "framer-motion";
import { Play } from "lucide-react";

export default function HeroSection({ onCtaClick }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden film-grain">
      {/* Animated poster mosaic background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background z-10" />
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1 p-1 h-full">
            {Array.from({ length: 96 }).map((_, i) => (
              <motion.div
                key={i}
                className="bg-muted rounded-sm aspect-[2/3]"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{
                  duration: 4 + Math.random() * 4,
                  delay: Math.random() * 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>
        {/* Red glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[160px] z-10" />
      </div>

      <div className="relative z-20 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/50 bg-secondary/50 mb-8">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              Now in Beta
            </span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="font-space font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[0.95] mb-6"
        >
          Stop Scrolling.
          <br />
          <span className="text-primary">Start Watching.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10 font-inter"
        >
          The average household subscribes to 3–4 streaming services. That's 20,000+ titles
          sitting right in front of you — and still nothing to watch.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.65 }}
        >
          <button
            onClick={onCtaClick}
            className="group relative inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-lg font-space font-semibold text-lg transition-all duration-300 hover:shadow-[0_0_40px_rgba(229,9,20,0.3)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-5 h-5 fill-current" />
            Find My Movie
          </button>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-20" />
    </section>
  );
}
