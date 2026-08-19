"use client"

import { useCallback, useState } from "react"

export interface FeedbackScore {
  category: string
  score: number
  feedback: string
}

export interface PitchFeedback {
  scores: FeedbackScore[]
  summary: string
}

interface UseFeedbackStreamReturn {
  feedback: PitchFeedback | null
  isStreaming: boolean
  error: string | null
  analyze: (text: string) => Promise<void>
  reset: () => void
}

export function useFeedbackStream(): UseFeedbackStreamReturn {
  const [feedback, setFeedback] = useState<PitchFeedback | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(async (text: string) => {
    setIsStreaming(true)
    setError(null)
    setFeedback(null)

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        throw new Error(`Failed to analyze pitch: ${res.statusText}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let buffer = ""
      const scores: FeedbackScore[] = []
      let summary = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr || jsonStr === "[DONE]") continue

          try {
            const chunk = JSON.parse(jsonStr)

            if (chunk.type === "score") {
              const existing = scores.find(
                (s) => s.category === chunk.category
              )
              if (existing) {
                existing.feedback += chunk.text || ""
                if (chunk.score !== undefined) existing.score = chunk.score
              } else {
                scores.push({
                  category: chunk.category,
                  score: chunk.score || 0,
                  feedback: chunk.text || "",
                })
              }
              setFeedback({ scores: [...scores], summary })
            } else if (chunk.type === "summary") {
              summary += chunk.text || ""
              setFeedback({ scores: [...scores], summary })
            }
          } catch {
            // skip malformed JSON lines
          }
        }
      }

      setFeedback({ scores, summary })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      )
    } finally {
      setIsStreaming(false)
    }
  }, [])

  const reset = useCallback(() => {
    setFeedback(null)
    setError(null)
    setIsStreaming(false)
  }, [])

  return { feedback, isStreaming, error, analyze, reset }
}
