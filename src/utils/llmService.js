/**
 * Service to handle communications with LLM providers (OpenAI/Gemini).
 */

// Default model - can be overridden via settings
const DEFAULT_MODEL = 'gpt-5.2';

const SYSTEM_PROMPT = `
You are an expert Pedagogical Referee providing a "Referee Report" on a classroom session.
Address the instructor directly using "you" (e.g., "You demonstrated..." not "The instructor demonstrated...").

Output must be valid JSON matching this schema:
{
  "style": "Lecturer" | "Hybrid" | "Facilitator",
  "styleExplanation": "Brief explanation of why this style was observed and when it may be appropriate or could be adjusted.",
  "strengths": [
    { 
      "aspect": "Name of the aspect (e.g. Scaffolding, Wait Time)", 
      "explanation": "Detailed professional feedback addressing the instructor directly (use 'you').", 
      "evidence": ["Direct quote 1", "Direct quote 2"],
      "learningObjectiveConnection": "How this strength supported student learning objectives"
    }
  ],
  "areasForGrowth": [
    { 
      "aspect": "Name of the aspect", 
      "explanation": "Detailed professional feedback addressing the instructor directly (use 'you').", 
      "evidence": ["Direct quote"],
      "learningObjectiveConnection": "How addressing this could better support learning objectives"
    }
  ]
}

Rules:
1. Do NOT include any academic citations. Focus purely on the observed transcript.
2. "evidence" array must contain real quotes from the transcript unique to that aspect.
3. Identify at least 3 Strengths and 3 Areas for Growth.
4. For "Style", determine based on who talks more AND the nature of interactions.
5. "styleExplanation" should be descriptive (what was observed) not prescriptive (what should change).
6. Be CRITICAL, SPECIFIC, and ACTIONABLE.
7. Connect each strength and area for growth to how it supports or could better support learning.
8. ALWAYS address the instructor directly as "you" - never refer to them in third person.
`;

export const analyzeWithAI = async (transcriptText, apiKey, model = null) => {
  const selectedModel = model || localStorage.getItem('openai_model') || DEFAULT_MODEL;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze this transcript:\n\n${transcriptText.substring(0, 50000)}... (truncated if too long)` }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API Request Failed');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    return JSON.parse(content);

  } catch (err) {
    console.error("LLM Analysis Error:", err);
    throw err;
  }
};

const LEVEL1_PROMPT = `
You are a formative teaching coach for higher-education instructors.

Your goal is to provide trustworthy, low-stakes, and actionable feedback after a single class session, focused on insights that transfer to future classes on any topic.
This is NOT an evaluation of teaching quality, instructor effectiveness, or student learning.

## Orientation
Frame all feedback as transferable instructional moves visible in this session that the instructor could experiment with in their next class.

Avoid advice that:
- Assumes the instructor will re-teach the same material
- Requires redesigning specific content, cases, or slides
- Focuses on hindsight critique of this class

The aim is deliberate practice, not retrospective optimization.

## Epistemic Stance
- Base feedback only on evidence in the provided transcript
- Prioritize reliability over completeness
- State uncertainty explicitly when evidence is thin
- Do NOT infer student engagement, motivation, learning, or instructor "quality"
- Do NOT provide scores, ratings, or benchmarks
- Use session-specific language ("in this session," "based on this class alone")

## Output Format (JSON)
{
  "framing": "One sentence clarifying scope and emphasizing transferability to future classes.",
  "whatWorked": [
    {
      "observation": "Specific, evidence-based observation of what seemed to work",
      "evidence": "Brief quote or reference from transcript (optional)"
    }
  ],
  "experiments": [
    {
      "suggestion": "A transferable teaching experiment to try next class",
      "tradeoff": "What could be shortened or skipped to make room (if applicable)"
    }
  ]
}

## Requirements
1. "framing": Exactly 1 sentence. Clarify this is based on one session and focused on transferable practices.
2. "whatWorked": 2-3 bullets. Specific observations grounded in transcript evidence. Focus on instructional moves, not content.
3. "experiments": 1-2 bullets maximum. Frame as experiments, not prescriptions. If adding something, acknowledge what might be adjusted.

## Tone
Write as a thoughtful faculty colleague. Be calm, respectful, and non-judgmental.
Avoid jargon, "best practices," and unwarranted certainty.
Address the instructor directly as "you."

When in doubt, say less rather than more, and make uncertainty visible.
`;

export const generateLectureSummary = async (transcriptText, apiKey, model = null) => {
  const selectedModel = model || localStorage.getItem('openai_model') || DEFAULT_MODEL;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: LEVEL1_PROMPT },
          { role: "user", content: `Provide Level 1 formative feedback for this class transcript:\n\n${transcriptText.substring(0, 50000)}` }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API Request Failed');
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);

  } catch (err) {
    console.error("LLM Summary Error:", err);
    throw err;
  }
};

const INDEX_CARD_PROMPT = `
You are a formative teaching coach creating a "Next Class — Index Card" for an instructor.

Based on the feedback analysis provided, generate a compact, print-friendly index card that the instructor can take into their next class.

Output must be valid JSON matching this schema:
{
  "keep": "One concrete practice to continue (1-2 sentences)",
  "try": ["One specific experiment to try", "Optional second experiment"],
  "say": "A verbatim phrase or question the instructor can use (in quotes)",
  "watchFor": "One observable student behavior or cue to notice"
}

CRITICAL CONSTRAINTS:
1. The ENTIRE card must be topic-neutral and usable verbatim in a different class on a different subject.
2. Avoid references to specific concepts, cases, actors, or examples from this session.
3. Focus on transferable instructional moves, not content-specific actions.
4. Keep each section extremely concise — this must fit on a 3×5 card.
5. The "say" field should be a generic but useful prompt/question applicable across topics.
6. The card supports execution in the next class, not reflection on this one.

Examples of GOOD (topic-neutral):
- KEEP: "Pausing after asking a question to give students time to think"
- TRY: "Ask one student to summarize the key point before moving on"
- SAY: "What's one thing that's still unclear about this?"
- WATCH FOR: "Students looking at each other before answering (may indicate confusion)"

Examples of BAD (too specific):
- KEEP: "Your explanation of supply and demand curves"
- TRY: "Use the GDP example again"
- SAY: "Who can explain marginal utility?"
`;

const CLASSIFY_PROMPT = `
You are an expert Educational Analyst and Pedagogical Observer.
Your task is to classify a list of questions into specific pedagogical categories.

Input:
A JSON list of questions: [{ "id": "q-1", "text": "Why do you think that happened?" }, ...]

Output:
A JSON object mapping ID to Category:
{
  "q-1": "Open",
  "q-2": "Closed"
}

CATEGORIES FOR INSTRUCTOR QUESTIONS:
1. "Open": Invites elaboration, explanation, or opinion. (e.g., "How did you figure that out?", "Why is this important?", "What do you notice?")
2. "Closed": Requires short, recalling, or Yes/No answers. (e.g., "What is the capital?", "Is this correct?", "What year was it?")
3. "Leading": Nudges student to a specific answer. (e.g., "It's the red one, right?", "Don't you agree that...?")
4. "Rhetorical": Not expecting an answer, used for effect. (e.g., "Who wouldn't want an A?", "So, what's next?")
5. "Management": Managerial/procedural. (e.g., "Can everyone see the board?", "Who has a pencil?", "Turn to page 10.")
6. "Uncategorized": Fragments or unclear.

CATEGORIES FOR STUDENT QUESTIONS:
1. "Clarification": Seeking to understand better. (e.g., "Can you repeat that?", "What does 'photosynthesis' mean?")
2. "Curiosity": Seeking deeper knowledge/extensions. (e.g., "What happens if we mix them?", "Why isn't Pluto a planet anymore?")
3. "Procedural": Logistics. (e.g., "Is this due tomorrow?", "Can I go to the bathroom?", "How many points is this?")
4. "Uncategorized": Other.
`;

export const generateIndexCard = async (feedbackData, apiKey, model = null) => {
  const selectedModel = model || localStorage.getItem('openai_model') || DEFAULT_MODEL;

  // Create a summary of the Level 1 feedback to send to the LLM
  const whatWorkedText = feedbackData.whatWorked?.map(w =>
    typeof w === 'string' ? w : w.observation
  ).join('; ') || 'Not available';

  const experimentsText = feedbackData.experiments?.map(e =>
    typeof e === 'string' ? e : e.suggestion
  ).join('; ') || 'Not available';

  const feedbackSummary = `
Level 1 Feedback Summary:
- Framing: ${feedbackData.framing || 'Not available'}
- What worked well: ${whatWorkedText}
- Suggested experiments: ${experimentsText}
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: INDEX_CARD_PROMPT },
          { role: "user", content: `Generate an index card based on this feedback:\n\n${feedbackSummary}` }
        ],
        temperature: 0.6,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API Request Failed');
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);

  } catch (err) {
    console.error("Index Card Generation Error:", err);
    throw err;
  }
};

export const classifyQuestions = async (questions, type, apiKey, model = null) => {
  if (!questions || questions.length === 0) return {};

  const selectedModel = model || localStorage.getItem('openai_model') || DEFAULT_MODEL;

  // Batch if necessary, but for now assuming < 50 questions per request
  // We only send ID and Text to save tokens
  const simplifiedList = questions.map(q => ({ id: q.id, text: q.text }));

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: CLASSIFY_PROMPT },
          {
            role: "user",
            content: `Classify these ${type.toUpperCase()} questions:\n${JSON.stringify(simplifiedList)}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API Request Failed');
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);

  } catch (err) {
    console.error("LLM Classification Error:", err);
    // Fallback: return empty object (UI will show defaults)
    return {};
  }
};
