import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal shape of the Web Speech API's SpeechRecognition — not in default TS lib DOM types.
interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => SpeechRecognitionLike) | null
}

// Speech recognition is entirely browser-native (Web Speech API) — no external
// or paid transcription service is used, and it degrades gracefully when the
// browser doesn't support it.
export function useSpeechRecognition(lang = 'en-IN') {
  const supported = typeof window !== 'undefined' && !!getSpeechRecognitionCtor()
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => () => recognitionRef.current?.stop(), [])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setError('Voice input is not supported in this browser.')
      return
    }
    setError(null)
    setTranscript('')
    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) finalText += result[0].transcript
        else interimText += result[0].transcript
      }
      setTranscript((finalText || interimText).trim())
    }
    recognition.onerror = (event) => {
      setError(event.error === 'not-allowed' ? 'Microphone permission was denied.' : `Voice input error: ${event.error}`)
      setListening(false)
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [lang])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  return { supported, listening, transcript, error, start, stop }
}

// Optional text-to-speech for reading assistant answers aloud — also fully
// browser-native (SpeechSynthesis), no paid API, silently no-ops if unsupported.
export function speak(text: string, lang = 'en-IN') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
}

export function speechSynthesisSupported() {
  return typeof window !== 'undefined' && !!window.speechSynthesis
}
