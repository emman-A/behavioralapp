import { useCallback, useEffect, useMemo, useState } from 'react'
import rawQuestions from './data/questions.json'

export interface Story {
  title: string
  situation: string
  task: string
  action: string
  result: string
}

export type Card =
  | {
      id: number
      category: string
      label?: string
      question: string
      cues?: string[]
      sentences: string[]
      stories?: never
    }
  | {
      id: number
      category: string
      label?: string
      question: string
      cues?: string[]
      stories: Story[]
      sentences?: never
    }

const STAR: { key: keyof Story; label: string; cls: string }[] = [
  { key: 'situation', label: 'S — Situation', cls: 'bg-sky-50 border-sky-200 text-sky-950' },
  { key: 'task', label: 'T — Task', cls: 'bg-violet-50 border-violet-200 text-violet-950' },
  { key: 'action', label: 'A — Action', cls: 'bg-amber-50 border-amber-200 text-amber-950' },
  { key: 'result', label: 'R — Result', cls: 'bg-emerald-50 border-emerald-200 text-emerald-950' },
]

const TAB_STYLES = [
  'bg-indigo-600 text-white border-indigo-600',
  'bg-emerald-600 text-white border-emerald-600',
  'bg-amber-600 text-white border-amber-600',
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isFlowCard(c: Card): c is Extract<Card, { sentences: string[] }> {
  return Array.isArray((c as { sentences?: string[] }).sentences)
}

function QuestionPanel({
  category,
  label,
  question,
  cues,
}: {
  category: string
  label?: string
  question: string
  cues?: string[]
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
          {category}
        </span>
        {label && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {label}
          </span>
        )}
      </div>
      <div className="px-4 py-6 flex flex-col gap-4">
        <p className="text-lg font-bold text-slate-900 leading-snug">{question}</p>
        {cues && cues.length > 0 && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800 mb-1">Hit these points</p>
            <ul className="text-xs text-amber-950 list-disc list-inside space-y-0.5">
              {cues.map((cue, i) => (
                <li key={i}>{cue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function SentenceFlow({
  sentences,
  revealedCount,
  onRevealNext,
  onRevealAll,
  onReset,
}: {
  sentences: string[]
  revealedCount: number
  onRevealNext: () => void
  onRevealAll: () => void
  onReset: () => void
}) {
  const n = sentences.length
  const nextIndex = revealedCount
  const allRevealed = revealedCount >= n

  return (
    <div className="rounded-2xl border border-indigo-200 bg-white shadow-md overflow-hidden">
      <div className="px-4 py-3 border-b border-indigo-100 bg-indigo-50/80 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-indigo-800">Your answer — one sentence at a time</h2>
        <span className="text-xs font-semibold text-indigo-600">
          {revealedCount} / {n} shown
        </span>
      </div>

      <div className="px-4 py-4 space-y-3">
        {sentences.map((s, i) => {
          const shown = i < revealedCount
          if (shown) {
            return (
              <div
                key={i}
                className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-sm leading-relaxed text-slate-800"
              >
                <span className="text-[10px] font-bold text-emerald-700 mr-2">{i + 1}.</span>
                {s}
              </div>
            )
          }
          const isNext = i === nextIndex
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (isNext) onRevealNext()
              }}
              disabled={!isNext}
              className={`w-full text-left rounded-xl border-2 border-dashed px-3 py-3 min-h-[3rem] transition-colors ${
                isNext
                  ? 'border-amber-400 bg-amber-50/90 hover:bg-amber-100 cursor-pointer'
                  : 'border-slate-200 bg-slate-50/80 opacity-70 cursor-not-allowed'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-500 mr-2">{i + 1}.</span>
              <span className="text-sm text-slate-400 italic">
                {isNext ? 'Tap here or use “Reveal next” / Space — what’s your next sentence?' : 'Hidden until previous lines are revealed'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="px-4 pb-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={allRevealed}
          onClick={onRevealNext}
          className="text-xs font-semibold px-4 py-2 rounded-full border border-indigo-500 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Reveal next sentence
        </button>
        <button
          type="button"
          disabled={allRevealed}
          onClick={onRevealAll}
          className="text-xs font-semibold px-4 py-2 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Reveal all
        </button>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          Hide all · restart
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const all = rawQuestions as Card[]
  const categories = useMemo(() => {
    const s = new Set(all.map(q => q.category))
    return ['All', ...[...s].sort()]
  }, [all])

  const [cat, setCat] = useState('All')
  const [shuffled, setShuffled] = useState(false)
  const [idx, setIdx] = useState(0)
  const [storyTab, setStoryTab] = useState(0)
  const [visited, setVisited] = useState<Set<number>>(() => new Set())
  const [revealedSentenceCount, setRevealedSentenceCount] = useState(0)

  const deck = useMemo(() => {
    const f = cat === 'All' ? all : all.filter(q => q.category === cat)
    return shuffled ? shuffle(f) : f
  }, [all, cat, shuffled])

  const card = deck[idx] ?? null

  useEffect(() => {
    setIdx(0)
    setStoryTab(0)
    setRevealedSentenceCount(0)
  }, [cat, shuffled, deck.length])

  useEffect(() => {
    setRevealedSentenceCount(0)
    setStoryTab(0)
  }, [card?.id])

  const go = useCallback(
    (d: number) => {
      if (!deck.length) return
      setIdx(i => (i + d + deck.length) % deck.length)
      setStoryTab(0)
      setRevealedSentenceCount(0)
    },
    [deck.length]
  )

  const revealNext = useCallback(() => {
    if (!card || !isFlowCard(card)) return
    setRevealedSentenceCount(c => {
      const next = Math.min(c + 1, card.sentences.length)
      if (next > 0) setVisited(v => new Set(v).add(card.id))
      return next
    })
  }, [card])

  const revealAll = useCallback(() => {
    if (!card || !isFlowCard(card)) return
    setRevealedSentenceCount(card.sentences.length)
    setVisited(v => new Set(v).add(card.id))
  }, [card])

  const resetFlow = useCallback(() => setRevealedSentenceCount(0), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === ' ' || e.key === 'Enter') {
        if (card && isFlowCard(card) && revealedSentenceCount < card.sentences.length) {
          e.preventDefault()
          revealNext()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, card, revealedSentenceCount, revealNext])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 pb-12">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-black tracking-tight text-indigo-700">Behavioural Game Mastery</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Question stays visible · reveal your answer sentence by sentence · Space = next sentence · ← → = cards
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-semibold bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
            {deck.length ? `${idx + 1} / ${deck.length}` : '0 / 0'}
          </span>
          <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full">
            {visited.size} / {all.length} touched
          </span>
          <button
            type="button"
            onClick={() => setShuffled(s => !s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border shadow-sm transition-colors ${
              shuffled ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            Shuffle
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {categories.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                cat === c
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {!card && <p className="text-center text-slate-400 py-16 text-sm">No cards. Add questions in src/data/questions.json</p>}

        {card && (
          <>
            <QuestionPanel category={card.category} label={card.label} question={card.question} cues={card.cues} />

            {isFlowCard(card) ? (
              <SentenceFlow
                sentences={card.sentences}
                revealedCount={revealedSentenceCount}
                onRevealNext={revealNext}
                onRevealAll={revealAll}
                onReset={resetFlow}
              />
            ) : (
              <div className="rounded-2xl border border-indigo-200 bg-white shadow-md overflow-hidden">
                <div className="px-4 py-3 border-b border-indigo-100 bg-indigo-50/80">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-indigo-800">STAR stories</h2>
                </div>
                <div className="px-4 pt-3 flex flex-wrap gap-2">
                  {card.stories.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setStoryTab(i)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                        storyTab === i ? TAB_STYLES[i % 3] : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {i + 1}. {s.title}
                    </button>
                  ))}
                </div>
                <div className="px-4 py-3 space-y-2">
                  {STAR.map(({ key, label, cls }) => (
                    <div key={key} className={`rounded-xl border p-3 ${cls}`}>
                      <div className="text-xs font-bold mb-1 opacity-90">{label}</div>
                      <p className="text-sm leading-relaxed">{card.stories[storyTab]?.[key]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                type="button"
                onClick={() => go(-1)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
              >
                ← Prev card
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
              >
                Next card →
              </button>
            </div>
          </>
        )}
      </main>

      <footer className="max-w-2xl mx-auto px-4 py-6 text-center text-[11px] text-slate-400">
        Edit <code className="bg-slate-200/80 px-1 rounded">src/data/questions.json</code> —{' '}
        <code className="bg-slate-200/80 px-1 rounded">sentences</code> is an array of strings (one flow step each). Legacy
        STAR: <code className="bg-slate-200/80 px-1 rounded">stories</code>.
      </footer>
    </div>
  )
}
