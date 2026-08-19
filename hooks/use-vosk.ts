"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createModel, type Model } from "vosk-browser"

const MODEL_URL = "/model.tar.gz"
const SAMPLE_RATE = 16000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Recognizer = InstanceType<any>

let sharedModel: Model | null = null
let modelLoadPromise: Promise<Model> | null = null

async function getModel(): Promise<Model> {
  if (sharedModel?.ready) return sharedModel
  if (modelLoadPromise) return modelLoadPromise

  modelLoadPromise = createModel(MODEL_URL, -1).then((m) => {
    sharedModel = m
    return m
  })

  return modelLoadPromise
}

interface UseVoskReturn {
  transcript: string
  partialTranscript: string
  isListening: boolean
  isModelLoaded: boolean
  isSupported: boolean
  error: string | null
  start: () => Promise<void>
  stop: () => void
  reset: () => void
}

export function useVosk(): UseVoskReturn {
  const [transcript, setTranscript] = useState("")
  const [partialTranscript, setPartialTranscript] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recognizerRef = useRef<Recognizer | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  const isSupported = useSyncExternalStore(
    () => () => {},
    () =>
      !!navigator.mediaDevices?.getUserMedia &&
      typeof AudioContext !== "undefined",
    () => false
  )

  useEffect(() => {
    if (!isSupported) return

    let cancelled = false
    getModel()
      .then(() => {
        if (!cancelled) setIsModelLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load speech recognition model.")
      })

    return () => {
      cancelled = true
    }
  }, [isSupported])

  const cleanup = useCallback(() => {
    processorRef.current?.disconnect()
    sourceRef.current?.disconnect()
    audioContextRef.current?.close()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    recognizerRef.current?.remove()

    processorRef.current = null
    sourceRef.current = null
    audioContextRef.current = null
    streamRef.current = null
    recognizerRef.current = null
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setTranscript("")
    setPartialTranscript("")

    try {
      const model = await getModel()
      const recognizer = new model.KaldiRecognizer(SAMPLE_RATE)
      recognizerRef.current = recognizer

      recognizer.on("result", (message) => {
        if (message.event === "result") {
          const text = message.result.text
          if (text) {
            setTranscript((prev) => (prev ? prev + " " + text : text))
          }
          setPartialTranscript("")
        }
      })

      recognizer.on("partialresult", (message) => {
        if (message.event === "partialresult") {
          setPartialTranscript(message.result.partial)
        }
      })

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: SAMPLE_RATE,
        },
        video: false,
      })
      streamRef.current = stream

      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      sourceRef.current = source

      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        try {
          recognizer.acceptWaveform(event.inputBuffer)
        } catch {
          // ignore waveform errors during cleanup
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      setIsListening(true)
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Microphone access denied. Please allow microphone permissions.")
      } else {
        setError("Could not start speech recognition. Please try again.")
      }
    }
  }, [])

  const stop = useCallback(() => {
    recognizerRef.current?.retrieveFinalResult()
    cleanup()
    setIsListening(false)
    setPartialTranscript("")
  }, [cleanup])

  const reset = useCallback(() => {
    cleanup()
    setTranscript("")
    setPartialTranscript("")
    setIsListening(false)
    setError(null)
  }, [cleanup])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    transcript,
    partialTranscript,
    isListening,
    isModelLoaded,
    isSupported,
    error,
    start,
    stop,
    reset,
  }
}
