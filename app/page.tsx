import { PitchRecorder } from "@/components/pitch-recorder"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="font-heading text-xl font-medium">Quick Pitch.io</h1>
        <p className="text-xs text-muted-foreground">
          Speak your pitch, get AI-powered feedback
        </p>
      </header>

      <main className="flex flex-1 flex-col px-6 py-8">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-6 rounded-none border border-border bg-muted/30 p-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Press the microphone button and speak your pitch. When
              you&apos;re done, click <strong>Analyze Pitch</strong> to get
              structured feedback on clarity, persuasiveness, market fit,
              feasibility, and delivery.
            </p>
          </div>

          <PitchRecorder />
        </div>
      </main>

      <footer className="border-t border-border px-6 py-3">
        <p className="text-[10px] text-muted-foreground">
          Powered by Gemini AI
        </p>
      </footer>
    </div>
  )
}
