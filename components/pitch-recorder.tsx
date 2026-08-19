"use client"

import { Button } from "@/components/ui/button"
import { useVosk } from "@/hooks/use-vosk"
import { useFeedbackStream } from "@/hooks/use-feedback-stream"
import { RiMicLine, RiStopCircleLine, RiRefreshLine } from "@remixicon/react"
import { cn } from "@/lib/utils"
import { useCallback, useRef } from "react"
import { FeedbackDisplay } from "@/components/feedback-display"

export function PitchRecorder() {
  const {
    transcript,
    partialTranscript,
    isListening,
    isModelLoaded,
    isSupported,
    error: voskError,
    start,
    stop,
    reset: resetVosk,
  } = useVosk()

  const {
    feedback,
    isStreaming,
    error: aiError,
    analyze,
    reset: resetFeedback,
  } = useFeedbackStream()

  const transcriptRef = useRef<HTMLDivElement>(null)

  const hasTranscript = transcript.trim().length > 0
  const canAnalyze = hasTranscript && !isListening && !isStreaming

  const handleToggleRecording = useCallback(() => {
    if (isListening) {
      stop()
    } else {
      resetVosk()
      resetFeedback()
      start()
    }
  }, [isListening, start, stop, resetVosk, resetFeedback])

  const handleAnalyze = useCallback(() => {
    if (transcript.trim()) {
      analyze(transcript.trim())
    }
  }, [transcript, analyze])

  const handleStartOver = useCallback(() => {
    resetVosk()
    resetFeedback()
  }, [resetVosk, resetFeedback])

  if (!isSupported) {
    return (
      <div className="rounded-none border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Your browser does not support audio recording.
          Please use a modern browser like Chrome, Firefox, or Safari.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {!isModelLoaded && (
          <div className="flex items-center gap-2 rounded-none border border-border p-3 text-xs text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            Loading speech recognition model (first time only)...
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleToggleRecording}
            variant={isListening ? "destructive" : "default"}
            size="icon-lg"
            aria-label={isListening ? "Stop recording" : "Start recording"}
            disabled={!isModelLoaded}
          >
            {isListening ? (
              <RiStopCircleLine className="size-5" />
            ) : (
              <RiMicLine className="size-5" />
            )}
          </Button>

          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium">
              {!isModelLoaded
                ? "Initializing..."
                : isListening
                  ? "Listening... speak your pitch now"
                  : hasTranscript
                    ? "Recording complete"
                    : "Press to start recording"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {isListening && "Click stop when you're done"}
            </span>
          </div>

          {isListening && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-destructive">
              <span className="size-2 animate-pulse rounded-full bg-destructive" />
              Recording
            </span>
          )}
        </div>

        <div
          ref={transcriptRef}
          className={cn(
            "min-h-[120px] max-h-[300px] overflow-y-auto rounded-none border border-input bg-transparent p-3 text-sm leading-relaxed",
            !transcript && !partialTranscript && "flex items-center justify-center"
          )}
        >
          {transcript || partialTranscript ? (
            <p>
              {transcript}
              {partialTranscript && (
                <span className="text-muted-foreground italic">
                  {" "}
                  {partialTranscript}
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Your transcribed pitch will appear here...
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {canAnalyze && (
            <Button onClick={handleAnalyze} className="flex-1">
              Analyze Pitch
            </Button>
          )}
          {(hasTranscript || isListening) && (
            <Button
              onClick={handleStartOver}
              variant="outline"
              disabled={isListening}
            >
              <RiRefreshLine className="size-4" />
              Start Over
            </Button>
          )}
        </div>

        {voskError && (
          <p className="text-xs text-destructive">{voskError}</p>
        )}
        {aiError && (
          <p className="text-xs text-destructive">{aiError}</p>
        )}
      </div>

      {(isStreaming || !!feedback) && (
        <FeedbackDisplay feedback={feedback} isStreaming={isStreaming} />
      )}
    </div>
  )
}
