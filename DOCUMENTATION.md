# ClassAnatomy: Technical Documentation

This document explains the key metrics and algorithms used in the ClassAnatomy application.

## Metrics Explanation

### 1. Interaction Density (turns/min)

**Formula:** `Total Speaker Turns ÷ Session Duration (in minutes)`

**What it measures:** How frequently the conversation switches between different speakers. A "turn" is counted each time a different person starts speaking.

**Interpretation:**
- **< 2.0 turns/min:** Low interaction, lecture-heavy
- **2.0 - 4.0 turns/min:** Moderate interaction
- **> 4.0 turns/min:** High interaction, dialogue-rich

---

### 2. Average Wait Time (seconds)

**Formula:** `Sum of (Student Response Start - Instructor Question End) ÷ Number of Q&A Pairs`

**What it measures:** The average number of seconds between when the instructor finishes asking a question and when a student begins to respond.

**Interpretation:**
- **< 1.5 seconds:** Very fast (may limit participation from slower processors)
- **1.5 - 3.0 seconds:** Good
- **3.0 - 5.0 seconds:** Excellent (research-backed optimal range)
- **> 5.0 seconds:** Long pauses (may indicate confusion or disengagement)

---

### 3. Class Structure

**Speaking Time:** Total duration where active speech is detected (anyone talking).

**Gaps/Activity:** Total time in gaps of 3+ seconds where no one is speaking. This includes:
- **Activity periods (10+ seconds):** Likely indicate group work, individual activities, or demonstrations
- **Brief pauses (3-10 seconds):** Likely transitions, thinking time, or writing

**How gaps are detected:** The system analyzes the transcript timestamps. When the gap between one speaker's end time and the next speaker's start time exceeds 3 seconds, it's recorded as a gap.

---

## Question Classification Categories

Questions are classified using AI (OpenAI) based on pedagogical best practices.

### Instructor Question Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Open** | Invites elaboration, explanation, or opinion | "How did you figure that out?", "Why is this important?", "What do you notice?" |
| **Closed** | Requires short, recall, or Yes/No answers | "What is the capital?", "Is this correct?", "What year was it?" |
| **Leading** | Nudges student to a specific answer | "It's the red one, right?", "Don't you agree that...?" |
| **Rhetorical** | Not expecting an answer, used for effect | "Who wouldn't want an A?", "So, what's next?" |
| **Management** | Managerial/procedural questions | "Can everyone see the board?", "Who has a pencil?", "Ready to move on?" |

### Student Question Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Clarification** | Seeking to understand better | "Can you repeat that?", "What does 'photosynthesis' mean?" |
| **Curiosity** | Seeking deeper knowledge/extensions | "What happens if we mix them?", "Why isn't Pluto a planet anymore?" |
| **Procedural** | Logistics and administration | "Is this due tomorrow?", "Can I go to the bathroom?" |

---

## Speaker Role Assignment

The system uses a heuristic to identify the instructor:
1. **Primary method:** The speaker with the most total words spoken is assumed to be the instructor
2. **The instructor selector allows manual override** if the heuristic is incorrect

---

## Session Stats Persistence

When a session is saved, the following stats are stored:
- `teacherTalkPercent`: Percentage of time the selected instructor spoke
- `studentTalkPercent`: Combined percentage for all other speakers (excluding system/silence)
- `questionCount`: Total questions detected in the session
- `silencePercent`: Percentage of session time in gaps/activity periods

These stats are used in the **Teaching Progress** tab to track trends over time.

---

## Timeline Visualization

The interaction timeline shows speaking segments color-coded by speaker:
- Each colored bar represents a continuous speaking segment
- Gaps (gray/light) represent periods of silence or activity
- Hover over any segment to see the speaker name and time range

---

## Data Privacy

- All analysis runs locally in your browser
- Transcripts are stored in browser localStorage
- OpenAI API calls (for AI features) send only the transcript text to OpenAI's servers
- Your API key is stored only in your browser's localStorage
