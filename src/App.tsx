import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import rawQuestions from './data/questions.json'
import { normalizeAnswerText } from './lib/normalizeAnswer'

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

const MAX_WRONG_BEFORE_REVEAL = 3

type SentenceRecallState = {
  input: string
  wrongCount: number
  solved: boolean
  revealed: boolean
}

function buildInitialSentenceStates(n: number): SentenceRecallState[] {
  return Array.from({ length: n }, () => ({
    input: '',
    wrongCount: 0,
    solved: false,
    revealed: false,
  }))
}

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

/** First index that still needs typing (not solved and not revealed). */
function activeSentenceIndex(states: SentenceRecallState[]): number {
  const i = states.findIndex(s => !s.solved && !s.revealed)
  return i === -1 ? states.length : i
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

function SentenceRecall({
  sentences,
  states,
  setStates,
  onProgress,
}: {
  sentences: string[]
  states: SentenceRecallState[]
  setStates: Dispatch<SetStateAction<SentenceRecallState[]>>
  onProgress: () => void
}) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const active = activeSentenceIndex(states)
  const n = sentences.length
  const solvedCount = states.filter(s => s.solved).length
  const allDone = n > 0 && states.every(s => s.solved || s.revealed)

  useEffect(() => {
    if (active < n && inputRef.current && !states[active]?.solved && !states[active]?.revealed) {
      inputRef.current.focus()
    }
  }, [active, n, states])

  const checkActive = useCallback(() => {
    if (active >= n) return
    const expected = sentences[active]
    if (expected === undefined) return
    setStates(prev => {
      const row = prev[active]
      if (!row || row.solved || row.revealed) return prev
      const ok = normalizeAnswerText(row.input) === normalizeAnswerText(expected)
      if (ok) {
        onProgress()
        const next = [...prev]
        next[active] = { ...row, solved: true, input: expected }
        return next
      }
      const wrongCount = row.wrongCount + 1
      const revealNow = wrongCount >= MAX_WRONG_BEFORE_REVEAL
      const next = [...prev]
      next[active] = {
        ...row,
        wrongCount,
        revealed: revealNow,
        ...(revealNow ? { input: expected } : {}),
      }
      if (revealNow) onProgress()
      return next
    })
  }, [active, n, sentences, setStates, onProgress])

  const setInput = (i: number, value: string) => {
    setStates(prev => {
      const row = prev[i]
      if (!row || row.solved || row.revealed) return prev
      const next = [...prev]
      next[i] = { ...row, input: value }
      return next
    })
  }

  const resetAll = () => {
    setStates(buildInitialSentenceStates(n))
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-white shadow-md overflow-hidden">
      <div className="px-4 py-3 border-b border-indigo-100 bg-indigo-50/80 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-indigo-800">Your answer — type each sentence</h2>
        <span className="text-xs font-semibold text-indigo-600">
          {solvedCount} / {n} exact
        </span>
      </div>

      <div className="px-4 py-4 space-y-3">
        {sentences.map((expected, i) => {
          const st = states[i]
          if (!st) return null

          if (st.solved) {
            return (
              <div
                key={i}
                className="rounded-xl border border-emerald-300 bg-emerald-50/80 px-3 py-2.5 text-sm leading-relaxed text-slate-800"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-emerald-800">{i + 1}.</span>
                  <span className="text-[10px] font-bold uppercase text-emerald-700">Correct</span>
                </div>
                {expected}
              </div>
            )
          }

          if (st.revealed && !st.solved) {
            return (
              <div
                key={i}
                className="rounded-xl border border-amber-300 bg-amber-50/90 px-3 py-2.5 text-sm leading-relaxed text-slate-800"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-amber-900">{i + 1}.</span>
                  <span className="text-[10px] font-bold uppercase text-amber-800">Shown after {MAX_WRONG_BEFORE_REVEAL} tries</span>
                </div>
                {expected}
              </div>
            )
          }

          const isActive = i === active
          const locked = !isActive

          return (
            <div
              key={i}
              className={`rounded-xl border-2 px-3 py-3 ${
                isActive ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/60 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold text-slate-600">Sentence {i + 1}</span>
                {st.wrongCount > 0 && (
                  <span className="text-[10px] font-medium text-rose-600">
                    {st.wrongCount} / {MAX_WRONG_BEFORE_REVEAL} tries
                  </span>
                )}
              </div>
              <textarea
                ref={isActive ? inputRef : undefined}
                value={st.input}
                onChange={e => {
                  if (!locked) setInput(i, e.target.value)
                }}
                onKeyDown={e => {
                  if (locked) return
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    checkActive()
                  }
                }}
                disabled={locked}
                rows={3}
                placeholder={
                  locked
                    ? 'Finish the sentence above first…'
                    : 'Type this sentence from memory, then Check or Enter…'
                }
                className="w-full text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              {isActive && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={checkActive}
                    className="text-xs font-semibold px-4 py-2 rounded-full border border-indigo-500 bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Check
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="px-4 pb-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={resetAll}
          className="text-xs font-semibold px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          Reset drill
        </button>
        {allDone && (
          <span className="text-xs font-semibold text-emerald-700">All sentences done — move to next card or reset.</span>
        )}
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
  const [sentenceStates, setSentenceStates] = useState<SentenceRecallState[]>([])

  const deck = useMemo(() => {
    const f = cat === 'All' ? all : all.filter(q => q.category === cat)
    return shuffled ? shuffle(f) : f
  }, [all, cat, shuffled])

  const card = deck[idx] ?? null

  const markTouched = useCallback(() => {
    if (card && isFlowCard(card)) setVisited(v => new Set(v).add(card.id))
  }, [card])

  useEffect(() => {
    setIdx(0)
    setStoryTab(0)
  }, [cat, shuffled, deck.length])

  useEffect(() => {
    setStoryTab(0)
    if (card && isFlowCard(card)) {
      setSentenceStates(buildInitialSentenceStates(card.sentences.length))
    } else {
      setSentenceStates([])
    }
  }, [card?.id])

  const go = useCallback(
    (d: number) => {
      if (!deck.length) return
      setIdx(i => (i + d + deck.length) % deck.length)
      setStoryTab(0)
    },
    [deck.length]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 pb-12">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-black tracking-tight text-indigo-700">Behavioural Game Mastery</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Question stays visible · type each sentence · Check (or Enter) must match · after {MAX_WRONG_BEFORE_REVEAL} misses
            the answer shows · ← → switch cards
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
              <SentenceRecall
                sentences={card.sentences}
                states={sentenceStates}
                setStates={setSentenceStates}
                onProgress={markTouched}
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
        Checks follow Leet Game (Line Game) rules: trimmed text, collapsed spaces. Edit{' '}
        <code className="bg-slate-200/80 px-1 rounded">src/data/questions.json</code>.
      </footer>
    </div>
  )
}
