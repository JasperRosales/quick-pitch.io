"use client"

import type { PitchFeedback } from "@/hooks/use-feedback-stream"
import {
  Progress,
  ProgressLabel,
  ProgressTrack,
  ProgressIndicator,
  ProgressValue,
} from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface FeedbackDisplayProps {
  feedback: PitchFeedback | null
  isStreaming: boolean
}

const CATEGORY_ICONS: Record<string, string> = {
  Clarity: "\u2728",
  Persuasiveness: "\uD83D\uDD25",
  "Market Fit": "\uD83D\uDCCA",
  Feasibility: "\u2699\uFE0F",
  Delivery: "\uD83C\uDFA4",
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 6) return "text-amber-600 dark:text-amber-400"
  return "text-destructive"
}

function scoreBarColor(score: number): string {
  if (score >= 8) return "bg-emerald-600 dark:bg-emerald-400"
  if (score >= 6) return "bg-amber-600 dark:bg-amber-400"
  return "bg-destructive"
}

export function FeedbackDisplay({ feedback, isStreaming }: FeedbackDisplayProps) {
  if (!feedback && !isStreaming) return null

  const hasScores = feedback && feedback.scores.length > 0
  const hasSummary = feedback && feedback.summary

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-lg font-medium">Feedback</h2>

      {isStreaming && !hasScores && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-2 animate-pulse rounded-full bg-primary" />
          Analyzing your pitch...
        </div>
      )}

      {hasScores && (
        <div className="flex flex-col gap-3">
          {feedback!.scores.map((score) => (
            <div
              key={score.category}
              className="flex flex-col gap-1.5 rounded-none border border-border p-3"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-medium">
                  <span>{CATEGORY_ICONS[score.category] || "\uD83C\uDFC6"}</span>
                  {score.category}
                </span>
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    scoreColor(score.score)
                  )}
                >
                  {score.score > 0 ? score.score : "\u2014"}
                  {score.score > 0 && (
                    <span className="text-xs font-normal text-muted-foreground">
                      /10
                    </span>
                  )}
                </span>
              </div>

              <Progress
                value={score.score}
                max={10}
                className="w-full"
              >
                <ProgressLabel className="sr-only">
                  {score.category}
                </ProgressLabel>
                <ProgressTrack>
                  <ProgressIndicator
                    className={cn(scoreBarColor(score.score))}
                  />
                </ProgressTrack>
                <ProgressValue />
              </Progress>

              {score.feedback && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {score.feedback}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {isStreaming && hasScores && !hasSummary && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          Generating summary...
        </div>
      )}

      {hasSummary && (
        <div className="rounded-none border border-border bg-muted/30 p-3">
          <h3 className="mb-1.5 text-xs font-medium">Overall Summary</h3>
          <p className="text-xs leading-relaxed">{feedback!.summary}</p>
        </div>
      )}
    </div>
  )
}
