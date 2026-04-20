import AnimatedSection from "./AnimatedSection";

export default function TaglineSection() {
  return (
    <section className="py-24 md:py-36 px-6 relative overflow-hidden">
      {/* Red accent glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <AnimatedSection className="relative text-center">
        <h2 className="font-space font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight leading-tight">
          One app. Every service.
          <br />
          <span className="text-primary">Zero excuses.</span>
        </h2>
      </AnimatedSection>
    </section>
  );
}
