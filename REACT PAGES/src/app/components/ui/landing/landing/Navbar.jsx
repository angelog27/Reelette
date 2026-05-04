import reeletteLogo from "../../../../../assets/Reelette_LOGO_upscaled.png";
import { useNavigate } from "react-router-dom";

export default function Navbar({ onCtaClick }) {
  const navigate = useNavigate();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/30">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={reeletteLogo} alt="Reelette" className="w-6 h-6 object-contain" />
          <span className="font-space font-bold text-lg tracking-tight text-foreground">
            Reelette
          </span>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Get Started
        </button>
      </div>
    </nav>
  );
}
