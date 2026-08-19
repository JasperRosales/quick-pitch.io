const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse"

const SYSTEM_PROMPT = `You are an expert pitch coach for students. A student will share their pitch with you. Analyze it and provide structured feedback.

For each of the following 5 categories, provide a score from 1-10 and specific, constructive feedback (2-3 sentences):

1. **Clarity** - How clear and easy to understand is the pitch?
2. **Persuasiveness** - How compelling and convincing is the pitch?
3. **Market Fit** - How well does it identify a problem and propose a solution?
4. **Feasibility** - How realistic and implementable is the idea?
5. **Delivery** - How well is the pitch communicated in terms of structure and flow?

You MUST respond in this exact JSON format and nothing else:
{
  "scores": [
    { "category": "Clarity", "score": <number>, "feedback": "<text>" },
    { "category": "Persuasiveness", "score": <number>, "feedback": "<text>" },
    { "category": "Market Fit", "score": <number>, "feedback": "<text>" },
    { "category": "Feasibility", "score": <number>, "feedback": "<text>" },
    { "category": "Delivery", "score": <number>, "feedback": "<text>" }
  ],
  "summary": "<overall summary paragraph>"
}

Be encouraging but honest. Remember the audience is students learning to pitch.`

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === "your_api_key_here") {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured. Please add it to .env.local" },
      { status: 500 }
    )
  }

  const { text } = await request.json()
  if (!text || typeof text !== "string") {
    return Response.json({ error: "No pitch text provided" }, { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const geminiRes = await fetch(
          `${GEMINI_API_URL}&key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nStudent pitch:\n\n${text}` }] }],
              generationConfig: { temperature: 0.7 },
            }),
          }
        )

        if (!geminiRes.ok) {
          const errBody = await geminiRes.text()
          console.error("Gemini API error:", geminiRes.status, errBody)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "Gemini API request failed" })}\n\n`
            )
          )
          controller.close()
          return
        }

        const reader = geminiRes.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        let fullText = ""
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const jsonStr = line.slice(6).trim()
            if (!jsonStr) continue

            try {
              const parsed = JSON.parse(jsonStr)
              const text =
                parsed.candidates?.[0]?.content?.parts?.[0]?.text
              if (text) {
                fullText += text
              }
            } catch {
              // skip non-JSON lines
            }
          }
        }

        const parsed = parseGeminiResponse(fullText)

        if (parsed.scores) {
          for (const score of parsed.scores) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "score", category: score.category, score: score.score, text: score.feedback })}\n\n`
              )
            )
          }
        }

        if (parsed.summary) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "summary", text: parsed.summary })}\n\n`
            )
          )
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      } catch (err) {
        console.error("Stream error:", err)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: "Internal server error" })}\n\n`
          )
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

function parseGeminiResponse(text: string): {
  scores: Array<{ category: string; score: number; feedback: string }> | null
  summary: string | null
} {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { scores: null, summary: text.trim() }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return {
      scores: parsed.scores || null,
      summary: parsed.summary || null,
    }
  } catch {
    return { scores: null, summary: text.trim() }
  }
}
