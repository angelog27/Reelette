import { useState, useEffect, useRef, CSSProperties, ReactNode } from "react"
import { ChevronLeft, Sparkles, Film, LucideIcon } from "lucide-react"

/* ─── Types ─── */
type Genre = "action" | "drama" | "adventure" | "thriller" | "comedy"

interface QuizOption {
  label: string
  value: string
  genre: Genre
}

interface QuizQuestion {
  id: number
  question: string
  options: QuizOption[]
}

interface ButtonProps {
  onClick?: () => void
  disabled?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}

interface MovieQuizProps {
  onComplete?: (answers: Record<number, string>, topGenre: Genre) => void
  onSkip?: () => void
}

interface EndScreenProps {
  icon: LucideIcon
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
}

/* ─── Data ─── */
const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: "You're at the movies — the trailers are done and the opening scene hits. What kind of shot do you want to see?",
    options: [
      { label: "Someone running from an explosion", value: "opening_action", genre: "action" },
      { label: "A quiet close-up of someone's face about to cry", value: "opening_drama", genre: "drama" },
      { label: "A wide landscape shot — somewhere unknown and beautiful", value: "opening_adventure", genre: "adventure" },
      { label: "A shadowy figure no one else seems to notice", value: "opening_thriller", genre: "thriller" },
      { label: "Someone already in a ridiculous situation", value: "opening_comedy", genre: "comedy" },
    ],
  },
  {
    id: 2,
    question: "You're picking a movie for movie night with friends. What's your go-to pitch?",
    options: [
      { label: "\"It's got insane fight scenes — trust me\"", value: "pitch_action", genre: "action" },
      { label: "\"It wrecked me emotionally but in a good way\"", value: "pitch_drama", genre: "drama" },
      { label: "\"You feel like you actually traveled somewhere\"", value: "pitch_adventure", genre: "adventure" },
      { label: "\"You won't figure out the twist — I promise\"", value: "pitch_thriller", genre: "thriller" },
      { label: "\"I've already rewatched it three times, it's so funny\"", value: "pitch_comedy", genre: "comedy" },
    ],
  },
  {
    id: 3,
    question: "What's your ideal movie snack setup?",
    options: [
      { label: "Something loud and crunchy — vibes match the screen", value: "snack_action", genre: "action" },
      { label: "Nothing. You don't eat when you're emotionally invested.", value: "snack_drama", genre: "drama" },
      { label: "A full spread — you settle in like it's a journey", value: "snack_adventure", genre: "adventure" },
      { label: "One drink, held tight. Your hands need to be busy.", value: "snack_thriller", genre: "thriller" },
      { label: "Whatever's messiest and most embarrassing to eat loudly", value: "snack_comedy", genre: "comedy" },
    ],
  },
  {
    id: 4,
    question: "A character in the movie makes a really bad decision. What's your reaction?",
    options: [
      { label: "You grip the armrest — adrenaline spiked", value: "reaction_action", genre: "action" },
      { label: "You totally understand why they did it, even if it's wrong", value: "reaction_drama", genre: "drama" },
      { label: "You're curious where this is going — you lean in", value: "reaction_adventure", genre: "adventure" },
      { label: "You already saw it coming three scenes ago", value: "reaction_thriller", genre: "thriller" },
      { label: "You audibly say \"no no no no no\" and start laughing", value: "reaction_comedy", genre: "comedy" },
    ],
  },
  {
    id: 5,
    question: "The movie ends. What do you do first?",
    options: [
      { label: "Stand up immediately, still buzzing", value: "after_action", genre: "action" },
      { label: "Stay seated for a moment while it sinks in", value: "after_drama", genre: "drama" },
      { label: "Start looking up where it was filmed", value: "after_adventure", genre: "adventure" },
      { label: "Immediately go back over the clues you missed", value: "after_thriller", genre: "thriller" },
      { label: "Repeat your favorite line to whoever will listen", value: "after_comedy", genre: "comedy" },
    ],
  },
  {
    id: 6,
    question: "What's the most important part of a great film score?",
    options: [
      { label: "Big drums and bass that makes the seat vibrate", value: "score_action", genre: "action" },
      { label: "A melody that makes you ache without knowing why", value: "score_drama", genre: "drama" },
      { label: "Something sweeping that makes you feel small in a great way", value: "score_adventure", genre: "adventure" },
      { label: "Tension that builds so slowly you don't notice until you're stressed", value: "score_thriller", genre: "thriller" },
      { label: "A goofy theme you'll be humming for a week", value: "score_comedy", genre: "comedy" },
    ],
  },
  {
    id: 7,
    question: "How do you feel about a slow-burn movie — one that takes its time?",
    options: [
      { label: "Genuinely anxious — you need something to happen", value: "slowburn_action", genre: "action" },
      { label: "You love it — the quieter the better", value: "slowburn_drama", genre: "drama" },
      { label: "Fine, as long as the world feels rich and alive", value: "slowburn_adventure", genre: "adventure" },
      { label: "You're suspicious of all the quiet — something's coming", value: "slowburn_thriller", genre: "thriller" },
      { label: "You start making side commentary to survive", value: "slowburn_comedy", genre: "comedy" },
    ],
  },
  {
    id: 8,
    question: "A movie has a shocking ending that completely changes everything. Your take?",
    options: [
      { label: "Pumped — that energy carried you to the finish", value: "ending_action", genre: "action" },
      { label: "Devastated but satisfied — that's what stories are for", value: "ending_drama", genre: "drama" },
      { label: "Delighted — you love being surprised by where things go", value: "ending_adventure", genre: "adventure" },
      { label: "Vindicated if you guessed it, furious if you didn't", value: "ending_thriller", genre: "thriller" },
      { label: "You immediately text someone to talk about it", value: "ending_comedy", genre: "comedy" },
    ],
  },
  {
    id: 9,
    question: "Someone next to you at the theatre is on their phone. What do you do?",
    options: [
      { label: "Firmly lean over and say \"Hey — phone down\"", value: "phone_action", genre: "action" },
      { label: "Suffer in silence and spiral internally", value: "phone_drama", genre: "drama" },
      { label: "Move seats — not worth the conflict, the movie awaits", value: "phone_adventure", genre: "adventure" },
      { label: "Quietly stare until they feel it", value: "phone_thriller", genre: "thriller" },
      { label: "Make a pointed comment loud enough to be funny", value: "phone_comedy", genre: "comedy" },
    ],
  },
  {
    id: 10,
    question: "What's a sentence that could describe your dream film?",
    options: [
      { label: "\"You don't breathe for the last thirty minutes\"", value: "dream_action", genre: "action" },
      { label: "\"It changes the way you see something in your own life\"", value: "dream_drama", genre: "drama" },
      { label: "\"It makes the world feel bigger than it did before\"", value: "dream_adventure", genre: "adventure" },
      { label: "\"Every scene means something you only realize at the end\"", value: "dream_thriller", genre: "thriller" },
      { label: "\"You forgot how much you needed to just laugh\"", value: "dream_comedy", genre: "comedy" },
    ],
  },
]

const letterBadges: string[] = ["A", "B", "C", "D", "E"]

const genreLabels: Record<Genre, string> = {
  action: "Action",
  drama: "Drama",
  adventure: "Adventure",
  thriller: "Thriller",
  comedy: "Comedy",
}

const personalityMap: Record<Genre, { title: string; description: string }> = {
  action: {
    title: "The Action Seeker",
    description:
      "You live for adrenaline and intensity. High stakes, fast pace, and explosive moments are your cinematic comfort zone.",
  },
  drama: {
    title: "The Emotional Voyager",
    description:
      "Deep feelings and complex characters speak to your soul. You find meaning in the quiet moments that linger long after.",
  },
  adventure: {
    title: "The Fantasy Dreamer",
    description:
      "You crave exploration and wonder. New worlds, hidden secrets, and epic journeys fuel your imagination.",
  },
  thriller: {
    title: "The Mystery Maven",
    description:
      "Puzzles and plot twists are your playground. You thrive on suspense and the thrill of piecing together clues.",
  },
  comedy: {
    title: "The Comedy Chaos",
    description:
      "Laughter is your love language. You find joy in wit, absurdity, and the perfect comedic timing.",
  },
}

/* ─── Helpers ─── */
function calculateTopGenre(answers: Record<number, string>): Genre {
  const genreScores: Record<Genre, number> = {
    action: 0, drama: 0, adventure: 0, thriller: 0, comedy: 0,
  }
  for (const questionId of Object.keys(answers)) {
    const question = quizQuestions.find((q) => q.id === Number(questionId))
    if (question) {
      const selectedOption = question.options.find(
        (o) => o.value === answers[Number(questionId)]
      )
      if (selectedOption) genreScores[selectedOption.genre]++
    }
  }
  let topGenre: Genre = "adventure"
  let maxScore = 0
  for (const [genre, score] of Object.entries(genreScores) as [Genre, number][]) {
    if (score > maxScore) { maxScore = score; topGenre = genre }
  }
  return topGenre
}

/* ─── Inline Button ─── */
function Button({ onClick, disabled, className, style, children }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "0.5rem",
        fontWeight: 500,
        transition: "opacity 0.2s",
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  )
}

/* ─── Animated Background ─── */
function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let frameCount = 0

    const orbs: {
      x: number; y: number; radius: number
      opacity: number; vx: number; vy: number
    }[] = []

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min

    const initOrbs = () => {
      orbs.length = 0
      const minDim = Math.min(canvas.width, canvas.height)
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = randomInRange(0.25, 0.4)
        orbs.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: minDim * randomInRange(0.10, 0.22),
          opacity: randomInRange(0.15, 0.28),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
        })
      }
    }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initOrbs()
    }

    resize()
    window.addEventListener("resize", resize)

    const gentleRedirect = (orb: typeof orbs[0], axis: "x" | "y") => {
      const rotationAmount = randomInRange(0.4, 0.8) * Math.PI
      const currentAngle = Math.atan2(orb.vy, orb.vx)
      const currentSpeed = Math.sqrt(orb.vx * orb.vx + orb.vy * orb.vy)
      let newAngle: number
      if (axis === "x") {
        newAngle = orb.vx > 0
          ? Math.PI - currentAngle + rotationAmount
          : -currentAngle - rotationAmount
      } else {
        newAngle = orb.vy > 0
          ? -currentAngle + rotationAmount
          : Math.PI + currentAngle - rotationAmount
      }
      orb.vx = Math.cos(newAngle) * currentSpeed
      orb.vy = Math.sin(newAngle) * currentSpeed
    }

    const animate = () => {
      frameCount++
      ctx.fillStyle = "#0A0A0A"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (const orb of orbs) {
        orb.x += orb.vx
        orb.y += orb.vy
        const margin = orb.radius * 0.2
        if (orb.x < margin) { orb.x = margin; gentleRedirect(orb, "x") }
        else if (orb.x > canvas.width - margin) { orb.x = canvas.width - margin; gentleRedirect(orb, "x") }
        if (orb.y < margin) { orb.y = margin; gentleRedirect(orb, "y") }
        else if (orb.y > canvas.height - margin) { orb.y = canvas.height - margin; gentleRedirect(orb, "y") }

        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius)
        gradient.addColorStop(0, `rgba(160, 30, 15, ${orb.opacity})`)
        gradient.addColorStop(0.3, `rgba(160, 30, 15, ${orb.opacity * 0.6})`)
        gradient.addColorStop(0.6, `rgba(160, 30, 15, ${orb.opacity * 0.25})`)
        gradient.addColorStop(1, "transparent")
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      if (frameCount % 4 === 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.012)"
        for (let i = 0; i < 300; i++) {
          ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1)
        }
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, zIndex: 0 }}
    />
  )
}

/* ─── End Screen (Welcome / Skipped) ─── */
function EndScreen({ icon: Icon, iconBg, iconColor, title, subtitle }: EndScreenProps) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "2rem 1rem", background: "#0A0A0A",
    }}>
      <div style={{ textAlign: "center", maxWidth: 448 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 80, height: 80, borderRadius: "50%",
          background: iconBg, marginBottom: 24,
        }}>
          <Icon style={{ width: 40, height: 40, color: iconColor }} />
        </div>
        <h1 style={{
          fontSize: 30, fontWeight: 300, letterSpacing: "-0.5px",
          marginBottom: 12, color: "#FAFAFA",
        }}>
          {title}
        </h1>
        <p style={{ color: "#888", lineHeight: 1.6 }}>{subtitle}</p>
      </div>
    </div>
  )
}

/* ─── Main MovieQuiz Component ─── */
export function MovieQuiz({ onComplete, onSkip }: MovieQuizProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState<"forward" | "backward">("forward")

  const totalQuestions = quizQuestions.length
  const currentQuestion = quizQuestions[currentStep]
  const progress = ((currentStep + 1) / totalQuestions) * 100

  // Reset transition flag after animation
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => setIsTransitioning(false), 50)
      return () => clearTimeout(timer)
    }
  }, [isTransitioning])

  // Auto-dismiss "Welcome to Reelette" after 3 seconds
  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => {
        const topGenre = calculateTopGenre(answers)
        onComplete?.(answers, topGenre)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showWelcome, answers, onComplete])

  const handleNext = () => {
    if (!selectedAnswer) return
    const newAnswers = { ...answers, [currentQuestion.id]: selectedAnswer }
    setAnswers(newAnswers)

    if (currentStep < totalQuestions - 1) {
      setTransitionDirection("forward")
      setIsTransitioning(true)
      setCurrentStep(currentStep + 1)
      setSelectedAnswer(answers[quizQuestions[currentStep + 1]?.id] ?? null)
    } else {
      setIsComplete(true)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setTransitionDirection("backward")
      setIsTransitioning(true)
      setCurrentStep(currentStep - 1)
      setSelectedAnswer(answers[quizQuestions[currentStep - 1].id] ?? null)
    }
  }

  // ── Welcome screen (auto-dismisses after 3s) ──
  if (showWelcome) {
    return (
      <EndScreen
        icon={Film}
        iconBg="rgba(124,93,189,0.2)"
        iconColor="#7C5DBD"
        title="Welcome to Reelette"
        subtitle="Your personalized movie journey begins now. Explore films tailored to your unique taste."
      />
    )
  }

  // ── Results screen (shown after last question, triggers welcome) ──
  if (isComplete) {
    const topGenre = calculateTopGenre(answers)
    const personality = personalityMap[topGenre]

    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "2rem 1rem", position: "relative", overflow: "hidden",
      }}>
        <AnimatedBackground />
        <div style={{ width: "100%", maxWidth: 448, position: "relative", zIndex: 1 }}>
          <div style={{
            borderRadius: 16, padding: "2rem", textAlign: "center",
            background: "#111", border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(124,93,189,0.2)", marginBottom: 24,
            }}>
              <Sparkles style={{ width: 32, height: 32, color: "#7C5DBD" }} />
            </div>
            <p style={{
              fontSize: 12, textTransform: "uppercase",
              letterSpacing: "0.1em", color: "#888", marginBottom: 8,
            }}>
              Your Top Genre
            </p>
            <div style={{
              display: "inline-block", padding: "6px 16px", borderRadius: 999,
              fontSize: 14, fontWeight: 500, marginBottom: 16,
              background: "rgba(124,93,189,0.2)", color: "#7C5DBD",
            }}>
              {genreLabels[topGenre]}
            </div>
            <h1 style={{
              fontSize: 32, fontWeight: 300, letterSpacing: "-0.5px", marginBottom: 16,
              color: "#FAFAFA",
            }}>
              {personality.title}
            </h1>
            <p style={{ color: "#888", lineHeight: 1.6, marginBottom: 32 }}>
              {personality.description}
            </p>
            <Button
              onClick={() => setShowWelcome(true)}
              style={{
                width: "100%", height: 48, fontSize: 16,
                background: "#7C5DBD", color: "#fff", borderRadius: 8,
              }}
            >
              Continue to Reelette
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Quiz screen ──
  const transitStyle: CSSProperties = isTransitioning
    ? {
        opacity: 0,
        transform: transitionDirection === "forward" ? "translateY(12px)" : "translateY(-12px)",
      }
    : { opacity: 1, transform: "translateY(0)" }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      <AnimatedBackground />

      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.5rem", position: "relative", zIndex: 1,
      }}>
        <div>
          {currentStep > 0 ? (
            <button
              onClick={handleBack}
              style={{ display: "flex", alignItems: "center", gap: 4, color: "#888", fontSize: 14 }}
            >
              <ChevronLeft style={{ width: 20, height: 20 }} />
              <span>Back</span>
            </button>
          ) : (
            <div style={{ width: 20 }} />
          )}
        </div>
        <span style={{ fontSize: 14, color: "#888" }}>
          {currentStep + 1}/{totalQuestions}
        </span>
        <button
          onClick={() => onSkip?.()}
          style={{ fontSize: 14, color: "#888", background: "none", border: "none", cursor: "pointer" }}
        >
          Skip Quiz
        </button>
      </header>

      {/* Progress bar */}
      <div style={{ padding: "0 1.5rem", position: "relative", zIndex: 1 }}>
        <div style={{
          height: 8, borderRadius: 999,
          background: "rgba(124,93,189,0.15)", overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 999,
            width: `${progress}%`,
            background: "#7C5DBD",
            boxShadow: "0 0 12px rgba(124,93,189,0.6), 0 0 24px rgba(124,93,189,0.3)",
            transition: "width 0.3s ease-out",
          }} />
        </div>
      </div>

      {/* Question */}
      <main style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "2rem 1rem", position: "relative", zIndex: 1,
      }}>
        <div style={{
          width: "100%", maxWidth: 512,
          transition: "opacity 0.2s ease-out, transform 0.2s ease-out",
          ...transitStyle,
        }}>
          <div style={{
            borderRadius: 16, padding: "1.5rem 2rem",
            background: "#111", border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <h2 style={{
              fontSize: 26, fontWeight: 300, letterSpacing: "-0.5px",
              textAlign: "center", marginBottom: 32, lineHeight: 1.3, color: "#FAFAFA",
            }}>
              {currentQuestion.question}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setSelectedAnswer(option.value)}
                    style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "1rem", borderRadius: 8, textAlign: "left",
                      background: isSelected ? "rgba(124,93,189,0.15)" : "rgba(26,26,26,0.8)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderLeft: `3px solid ${isSelected ? "#7C5DBD" : "transparent"}`,
                      transition: "all 0.2s",
                      color: "#FAFAFA", cursor: "pointer",
                    }}
                  >
                    <span style={{
                      flexShrink: 0, width: 32, height: 32, borderRadius: 8,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 500,
                      background: isSelected ? "#7C5DBD" : "#1A1A1A",
                      color: isSelected ? "#fff" : "#888",
                      transition: "all 0.2s",
                    }}>
                      {letterBadges[index]}
                    </span>
                    <span style={{ fontSize: 15 }}>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: "1.5rem", position: "relative", zIndex: 1 }}>
        <div style={{ width: "100%", maxWidth: 512, margin: "0 auto" }}>
          <Button
            onClick={handleNext}
            disabled={!selectedAnswer}
            style={{
              width: "100%", height: 48, fontSize: 16,
              background: selectedAnswer ? "#7C5DBD" : "transparent",
              color: selectedAnswer ? "#fff" : "#FAFAFA",
              opacity: selectedAnswer ? 1 : 0.3,
              border: selectedAnswer ? "none" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
            }}
          >
            {currentStep === totalQuestions - 1 ? "Complete" : "Next"}
          </Button>
        </div>
      </footer>
    </div>
  )
}