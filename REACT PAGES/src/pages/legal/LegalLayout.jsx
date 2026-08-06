import { Link } from "react-router-dom";
import reeletteLogo from "../../assets/Reelette_LOGO_upscaled.png";

export default function LegalLayout({ title, effectiveDate, children }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-inter">
      <nav className="border-b border-border/30">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={reeletteLogo} alt="Reelette" className="w-6 h-6 object-contain" />
            <span className="font-space font-bold text-lg tracking-tight text-foreground">
              Reelette
            </span>
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-space font-bold text-3xl sm:text-4xl tracking-tight mb-2">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mb-12">
          Effective {effectiveDate}
        </p>

        <div className="space-y-10 text-sm sm:text-base leading-relaxed text-foreground/85 [&_h2]:font-space [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:mb-3 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:mb-3 [&_a]:text-primary [&_a]:hover:underline">
          {children}
        </div>

        <p className="mt-16 pt-8 border-t border-border/30 text-xs text-muted-foreground/60">
          This page is a general template provided for convenience and does not constitute legal
          advice. Consult a qualified attorney to make sure it fits your specific situation and
          jurisdiction.
        </p>
      </main>
    </div>
  );
}
