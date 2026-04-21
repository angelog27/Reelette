import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { MovieQuiz } from "./MovieQuiz"

interface QuizGateProps {}

export default function QuizGate({}: QuizGateProps) {
  const [needsQuiz, setNeedsQuiz] = useState<boolean | null>(null)
  const navigate = useNavigate()

  const uid = localStorage.getItem('user_id')

useEffect(() => {
    if (!uid) { navigate('/'); return }
    
    // If they've already dismissed the quiz this session, skip it
    const quizDone = localStorage.getItem(`quiz_done_${uid}`)
    if (quizDone) { setNeedsQuiz(false); return }

    fetch(`/api/user/${uid}/profile`)
      .then(r => r.json())
      .then(data => setNeedsQuiz(!data.quizCompleted))
      .catch(() => setNeedsQuiz(true))
  }, [uid])

  const handleComplete = async (_answers: Record<number, string>, topGenre: string) => {
    await fetch("/api/quiz/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, topGenre, answers: _answers }),
    })
    localStorage.setItem(`quiz_done_${uid}`, 'true')
    navigate("/home")
  }

  const handleSkip = async () => {
    await fetch("/api/quiz/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, topGenre: null, answers: {} }),
    })
    navigate("/home")
  }

  if (needsQuiz === null) return null
  if (!needsQuiz) { navigate("/home"); return null }

  return <MovieQuiz onComplete={handleComplete} onSkip={handleSkip} />
}