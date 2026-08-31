import { useEffect, useState } from 'react'
import { Bot, Send, Sparkles, Mic, MicOff, Volume2, VolumeX, Radio } from 'lucide-react'
import { AssistantService } from '../../api/service'
import type { AssistantResponse } from '../../types'
import { PageHeader } from '../../components/PageHeader'
import { Card, LoadingState } from '../../components/StatusBadges'
import { useSpeechRecognition, speak, stopSpeaking, speechSynthesisSupported } from '../../hooks/useSpeechRecognition'

const suggestions = [
  'Which zones need immediate evacuation?',
  'What task forces should we deploy?',
  'Which roads are impassable right now?',
]

interface Turn {
  question: string
  response: AssistantResponse
}

export default function AssistantPage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [speakEnabled, setSpeakEnabled] = useState(false)
  const voice = useSpeechRecognition('en-IN')
  const ttsSupported = speechSynthesisSupported()

  async function ask(question: string) {
    if (!question.trim()) return
    setLoading(true)
    setInput('')
    try {
      const response = await AssistantService.query(question)
      setTurns((prev) => [...prev, { question, response }])
      if (speakEnabled) speak(response.answer)
    } finally {
      setLoading(false)
    }
  }

  // When voice recognition finishes with a final transcript, submit it automatically.
  useEffect(() => {
    if (!voice.listening && voice.transcript) {
      ask(voice.transcript)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.listening])

  useEffect(() => stopSpeaking, [])

  return (
    <div>
      <PageHeader
        title="AI Decision Assistant"
        subtitle="Ask about risk, resources, and recommended actions"
        action={
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-base-panel2 border border-base-border rounded-full px-2.5 py-1">
              <Radio className="w-3 h-3 text-blue-400" /> Based on live system data — no LLM
            </span>
            {ttsSupported && (
              <button
                onClick={() => { setSpeakEnabled((v) => !v); if (speakEnabled) stopSpeaking() }}
                title={speakEnabled ? 'Voice answers on — click to mute' : 'Voice answers off — click to enable'}
                className={`p-2 rounded-lg border transition-colors ${speakEnabled ? 'bg-blue-600/15 border-blue-600/40 text-blue-400' : 'bg-base-panel2 border-base-border text-slate-500 hover:text-slate-300'}`}
              >
                {speakEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            )}
          </div>
        }
      />
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        {turns.length === 0 && !loading && (
          <Card className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-600/15 flex items-center justify-center mx-auto mb-3">
              <Bot className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-sm font-semibold text-slate-200 mb-1">Ask the decision-support assistant</p>
            <p className="text-xs text-slate-500 mb-4">Get instant answers grounded in live risk, incident and resource data</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="text-xs bg-base-panel2 hover:bg-base-panel2/70 border border-base-border rounded-full px-3 py-1.5 text-slate-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-4">
          {turns.map((t, i) => (
            <div key={i} className="space-y-2 animate-fade-in">
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-sm max-w-md">{t.question}</div>
              </div>
              <Card className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-slate-400">Assistant</span>
                </div>
                <p className="text-sm text-slate-200 mb-3">{t.response.answer}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Supporting Data</p>
                    <ul className="space-y-1">
                      {t.response.supportingData.map((d, j) => (
                        <li key={j} className="text-xs text-slate-400 flex gap-1.5"><span className="text-blue-500">•</span>{d}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Recommended Actions</p>
                    <ul className="space-y-1">
                      {t.response.recommendedActions.map((a, j) => (
                        <li key={j} className="text-xs text-slate-400 flex gap-1.5"><span className="text-risk-low">✓</span>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          ))}
          {loading && <LoadingState label="Analyzing regional data…" />}
        </div>

        {voice.error && <p className="text-[11px] text-risk-critical text-center">{voice.error}</p>}

        <form
          onSubmit={(e) => { e.preventDefault(); ask(input) }}
          className="sticky bottom-6 flex items-center gap-2 bg-base-panel border border-base-border rounded-xl p-2"
        >
          <input
            value={voice.listening ? (voice.transcript || 'Listening…') : input}
            onChange={(e) => setInput(e.target.value)}
            readOnly={voice.listening}
            placeholder="Ask about risk, resources, or recommended actions…"
            className="flex-1 bg-transparent px-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
          />
          {voice.supported && (
            <button
              type="button"
              onClick={() => (voice.listening ? voice.stop() : voice.start())}
              title={voice.listening ? 'Stop listening' : 'Ask by voice'}
              className={`p-2 rounded-lg transition-colors ${voice.listening ? 'bg-risk-critical/15 text-risk-critical animate-pulse' : 'bg-base-panel2 text-slate-400 hover:text-slate-200'}`}
            >
              {voice.listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button type="submit" disabled={loading || !input.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors text-white p-2 rounded-lg">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
