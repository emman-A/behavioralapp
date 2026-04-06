# Behavioural Game Mastery

Simple local app for **behavioural interview prep**: flip cards, **STAR** stories (Situation → Task → Action → Result), category filters, shuffle, keyboard nav.

## Run

```bash
cd behavioural-game-mastery
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Your content: `src/data/questions.json`

### Sentence flow mode (default for interview answers)

The **question** (and optional **cues**) stay visible. Put your script in **`sentences`**: an array of strings — one string per sentence or beat you want to rehearse in order. The answer area starts fully hidden; use **Reveal next sentence**, **Reveal all**, or **Space** to drill the flow.

Optional **`label`** (e.g. `"Q1"`, `"Follow-up"`). Optional **`cues`**: bullets under the question (“hit these points”).

```json
{
  "id": 1,
  "category": "Core backend & data flow",
  "label": "Q1",
  "question": "Walk me through a backend system you built.",
  "cues": ["timeouts", "retries"],
  "sentences": [
    "First sentence of your answer.",
    "Second sentence — builds on the first.",
    "Close with impact or metric."
  ]
}
```

### STAR mode (legacy)

```json
{
  "id": 99,
  "category": "Leadership",
  "question": "Tell me about a time you led a team.",
  "stories": [
    {
      "title": "Story 1",
      "situation": "…",
      "task": "…",
      "action": "…",
      "result": "…"
    }
  ]
}
```

- `category` powers the filter chips.
- Valid JSON only (escape `"` inside strings as `\"`).

## Build for static hosting

```bash
npm run build
npm run preview
```

Output is in `dist/`.

## Deploy on Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com), **Add New Project** → import the repo.
3. Framework preset **Vite** (or leave defaults): **Build command** `npm run build`, **Output** `dist`, **Install** `npm install`.
4. Deploy.
