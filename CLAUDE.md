# Teacher Feedback App (Class Anatomy)

AI-powered teaching feedback tool. Teachers upload class transcripts and receive multi-level analysis, coaching, and actionable next-class cards.

## Quick Reference

```bash
npm run dev      # Start dev server (port 5173, auto-opens browser)
npm run build    # Production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

- **Base path**: `/class-anatomy/` (configured in vite.config.js)
- **No backend** — client-side SPA, OpenAI API called directly from browser
- **No TypeScript** — plain JavaScript with JSX
- **No router** — state-based view switching (`view`: upload | session)

## Stack

- React 19 + Vite 7 (ES modules)
- Plain CSS with custom properties for theming
- OpenAI API (GPT-5.2/4.1/4o, user-selectable)
- localStorage for persistence
- html2canvas for image export

## Project Structure

```
src/
├── main.jsx                    # React root
├── App.jsx                     # Top-level: view switching, settings, onboarding
├── App.css                     # Global layout styles
├── index.css                   # CSS custom properties (theme variables)
├── components/
│   ├── SessionHub.jsx          # Central orchestrator — manages state for all tabs
│   ├── UploadZone.jsx          # Transcript file upload (drag & drop)
│   ├── Dashboard.jsx           # "Session Data" tab — analytics, timeline, questions
│   ├── GoDeeper.jsx            # "Go Deeper" tab — Level 2 (3 focus areas)
│   ├── CoachingSession.jsx     # "Coaching" tab — Level 3 multi-turn dialog
│   ├── FeedbackView.jsx        # Renders feedback cards
│   ├── FollowUpChat.jsx        # Follow-up chat (used in Level 1 & 2)
│   ├── IndexCard.jsx           # "Next Class" action card (KEEP/TRY/SAY/WATCH)
│   ├── ProgressDashboard.jsx   # Cross-session teaching trends
│   ├── SessionBrowser.jsx      # Browse/restore saved sessions
│   ├── SettingsModal.jsx       # API key, theme, model, transcript length
│   ├── OnboardingTour.jsx      # First-time user walkthrough
│   ├── Toast.jsx               # Toast notifications + useToast() hook
│   ├── Skeleton.jsx            # Loading skeleton placeholders
│   ├── ErrorBoundary.jsx       # Error boundary wrapper
│   └── *.css                   # Co-located component styles
├── utils/
│   ├── llmService.js           # OpenAI API calls (8+ functions, 2-min timeout)
│   ├── sessionHistory.js       # localStorage CRUD (sessions, cards, AI interactions)
│   ├── transcriptParser.js     # Parsers: WebVTT, plain text, unstructured
│   ├── classAnatomy.js         # Local analysis: speakers, wait times, questions
│   ├── feedbackEngine.js       # Rule-based feedback from analysis data
│   ├── exportUtils.js          # Markdown, text, CSV, clipboard (HTML), print
│   └── promptTemplates.js      # LLM prompt construction helpers
└── assets/

prompts/                        # LLM system prompts (markdown files)
├── lvl1_system.md              # Level 1 main feedback
├── lvl2.1_instructor_questions.md
├── lvl2.2_sense_making.md
└── lvl2.3_time_management.md

samples/                        # Sample transcripts for testing
```

## Architecture & Patterns

### Component Hierarchy

```
App
├── SettingsModal (overlay)
├── SessionBrowser (overlay)
├── OnboardingTour (overlay)
├── UploadZone (when view === 'upload')
└── SessionHub (when view === 'session')
    ├── Summary tab (Level 1) → IndexCard, FollowUpChat
    ├── Go Deeper tab (Level 2) → GoDeeper → IndexCard, FollowUpChat
    ├── Coaching tab (Level 3) → CoachingSession
    ├── Session Data tab → Dashboard
    └── Teaching Progress tab → ProgressDashboard
```

### State Management

- **No Redux/Context** — useState + prop drilling from SessionHub
- **SessionHub** is the state hub: lifts all tab state so it persists across tab switches
- **useEffect** syncs state to localStorage (sessionHistory.js)
- **useToast()** custom hook for notifications (defined in Toast.jsx)

### Three-Level Feedback Model

1. **Level 1** (Summary) — AI-generated framing, strengths, and teaching experiments
2. **Level 2** (Go Deeper) — Three focus areas: instructor questions, sense-making, time management
3. **Level 3** (Coaching) — Multi-turn conversational coaching dialog

### Data Flow

```
File Upload → parseTranscript() → analyzeClass() → [AI calls] → render + localStorage
```

### Styling Conventions

- **Plain CSS** with co-located `ComponentName.css` files
- **CSS custom properties** defined in `src/index.css` (Notion-inspired palette)
- **Dark mode** via `data-theme="dark"` attribute on `<html>`
- Use existing variables: `--color-*`, `--spacing-*`, `--radius-*`, `--shadow-*`
- Print styles via `@media print` blocks
- No CSS modules, no Tailwind, no CSS-in-JS

### Performance

- `React.memo()` on Dashboard sub-components (TimelineSegment, QuestionMarker)
- `useCallback` in GoDeeper to prevent re-creation
- localStorage read cache with 5-second TTL (sessionHistory.js)

### API Integration (llmService.js)

- Direct OpenAI API calls from browser (no proxy)
- API key stored in localStorage (`openai_key`)
- 2-minute fetch timeout via `fetchWithTimeout()`
- Response validation with required field checking
- Key functions: `generateLectureSummary()`, `generateLevel2Analysis()`, `generateIndexCard()`, `classifyQuestions()`, `sendCoachingMessage()`

### Conventions

- Components are PascalCase `.jsx` files with matching `.css` files
- Utilities are camelCase `.js` files in `src/utils/`
- LLM prompts live in `prompts/*.md` (not in JS)
- No test framework currently configured
- ESLint: unused vars starting with `[A-Z_]` are allowed
