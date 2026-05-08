# Next Class

Next Class is a browser-based teaching feedback app for instructors who want fast, practical insight from class transcripts. Upload a transcript, review local participation analytics, generate AI feedback, and leave with a small set of coaching prompts and next-class actions.

The app is designed around three levels of reflection:

- **Level 1: Summary** - a teaching-focused overview with strengths, patterns, and experiments.
- **Level 2: Go Deeper** - targeted analysis of instructor questions, sense-making, and time management.
- **Level 3: Coaching** - a conversational coaching space for planning the next class.

## Features

- Upload WebVTT, plain text, and unstructured transcript files.
- Detect speakers, participation patterns, wait time, question moments, and timing signals when transcript data supports it.
- Generate OpenAI-powered feedback, follow-up responses, coaching conversations, and next-class index cards.
- Review and optionally anonymize detected names before sending transcript text to OpenAI.
- Save sessions, cards, AI interactions, tags, and teaching progress locally in the browser.
- Export feedback, coaching notes, progress data, and backup files.
- Switch between light and dark themes.
- Sign in with Google through Firebase Auth.

## Tech Stack

- React 19
- Vite 7
- Firebase Auth and Firestore
- OpenAI API from the browser
- Plain CSS with custom properties
- localStorage for client-side persistence
- html2canvas for image export

There is no custom backend in this repository. API calls are made directly from the client.

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- A Firebase project with Google Auth configured
- An OpenAI API key with access to one of the supported models

### Install

```bash
npm install
```

### Configure Firebase

Create a `.env` file in the project root:

```bash
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

The `.env` file is ignored by git.

### Run Locally

```bash
npm run dev
```

Vite starts on port `5173` and opens the app in your browser.

### Add an OpenAI Key

After signing in, open **Settings** and paste your OpenAI API key. The key is stored in your browser's `localStorage` and is used directly by the client when generating feedback.

## Available Scripts

```bash
npm run dev      # Start the local Vite server
npm run build    # Create a production build
npm run lint     # Run ESLint
npm run preview  # Preview the production build locally
```

## Transcript Support

The parser supports:

- WebVTT files with timestamps and speaker labels
- Plain text transcripts with speaker labels
- Unstructured text transcripts

When timestamps or speaker labels are missing, the app still supports AI feedback, but some local analytics are unavailable.

Sample transcripts are included in `samples/` for local testing.

## Project Structure

```text
src/
  App.jsx                     # Top-level app shell, auth, upload/session switching
  main.jsx                    # React entry point
  components/
    SessionHub.jsx            # Main session state hub and tab coordinator
    UploadZone.jsx            # Transcript upload flow
    Dashboard.jsx             # Session analytics
    GoDeeper.jsx              # Level 2 focus analysis
    CoachingSession.jsx       # Level 3 coaching dialog
    IndexCard.jsx             # Next-class action card
    ProgressDashboard.jsx     # Cross-session teaching trends
    SettingsModal.jsx         # API key, model, theme, export/import, privacy settings
  utils/
    llmService.js             # OpenAI calls and response validation
    transcriptParser.js       # Transcript parsing
    classAnatomy.js           # Local class analytics
    sessionHistory.js         # localStorage persistence
    transcriptAnonymizer.js   # Name detection and anonymization helpers
prompts/
  lvl1_system.md
  lvl2.1_instructor_questions.md
  lvl2.2_sense_making.md
  lvl2.3_time_management.md
samples/
```

## Privacy Notes

Session history, saved cards, AI interactions, tags, preferences, and the OpenAI API key are stored locally in the browser. Transcript text is sent to OpenAI only when the user asks the app to generate AI feedback or coaching. The app includes a privacy review flow that can detect possible names and produce an anonymized transcript before analysis.

Because this is a client-only app, do not commit API keys, Firebase secrets, private transcripts, or exported session backups.

## Deployment

The Vite base path is configured as `/next-class/`, which matches the GitHub repository name and works for GitHub Pages-style hosting.

Build the app with:

```bash
npm run build
```

The production output is written to `dist/`.

## Development Notes

- Components use PascalCase `.jsx` files with matching `.css` files.
- Styling uses plain CSS and theme variables from `src/index.css`.
- There is no router; the app switches views with React state.
- `SessionHub.jsx` owns most session-level state so tab data persists while moving through the app.
- LLM prompt text lives in `prompts/` rather than being embedded directly in components.
- The project currently has ESLint but no test framework configured.
