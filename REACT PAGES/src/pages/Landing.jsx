import { useEffect, useRef } from "react";
import Navbar from "../app/components/ui/landing/landing/Navbar";
import HeroSection from "../app/components/ui/landing/landing/HeroSection";
import StreamingMarquee from "../app/components/ui/landing/landing/StreamingMarquee";
import ProblemSection from "../app/components/ui/landing/landing/ProblemSection";
import HowItWorksSection from "../app/components/ui/landing/landing/HowItWorksSection";
import FeaturesSection from "../app/components/ui/landing/landing/FeaturesSection";
import TaglineSection from "../app/components/ui/landing/landing/TaglineSection";
import FooterCTA from "../app/components/ui/landing/landing/FooterCTA";

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}

export default function Landing() {
  const signupRef = useRef(null);

  useEffect(() => {
    const visited = getCookie("reelette_visited");
    if (visited) {
      setTimeout(() => {
        signupRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
    setCookie("reelette_visited", "true", 30);
  }, []);

  const scrollToSignup = () => {
    signupRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-inter">
      <Navbar onCtaClick={scrollToSignup} />
      <HeroSection onCtaClick={scrollToSignup} />
      <StreamingMarquee />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <TaglineSection />
      <div ref={signupRef}>
        <FooterCTA />
      </div>
    </div>
  );
}
