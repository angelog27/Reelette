import AnimatedSection from "./AnimatedSection";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import reeletteLogo from "../../../../../assets/Reelette_LOGO_upscaled.png";

export default function FooterCTA() {
  const navigate = useNavigate();
  return (
    <section id="signup" className="px-6 pb-12">
      <div className="max-w-4xl mx-auto">
        <AnimatedSection>
          <div className="bg-card border border-border/50 rounded-2xl p-10 md:p-16 text-center relative overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-primary/8 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8">
                <img src={reeletteLogo} alt="Reelette" className="w-8 h-8 object-contain" />
              </div>

              <h2 className="font-space font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight mb-4">
                Your next favorite movie
                <br />
                is <span className="text-primary">one spin away</span>.
              </h2>

              <p className="text-muted-foreground text-base md:text-lg max-w-lg mx-auto mb-10 font-inter">
                Join now and stop wasting your evenings scrolling.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigate("/login")}
                  className="group inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3.5 rounded-lg font-space font-semibold text-base transition-all duration-300 hover:shadow-[0_0_40px_rgba(229,9,20,0.25)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center gap-2 border border-border hover:border-foreground/30 text-foreground/80 hover:text-foreground px-8 py-3.5 rounded-lg font-space font-semibold text-base transition-all duration-300"
                >
                  Log In
                </button>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Footer text */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={reeletteLogo} alt="Reelette" className="w-4 h-4 object-contain" />
            <span className="font-space font-semibold text-sm text-foreground">Reelette</span>
          </div>
          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} Reelette. All rights reserved.
          </p>
        </div>
      </div>
    </section>
  );
}
