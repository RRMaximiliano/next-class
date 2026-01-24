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
- Avoid claims about stable habits; use session-specific language ("in this session," "based on this class alone")
- Assume some valuable activity (e.g., small-group work) may not appear in the transcript

## Feedback Categories (Provide feedback only when evidence supports it)
1. Structure and signaling
2. Questioning patterns (eliciting student thinking only)
3. Cognitive demand and sense-making
4. Student participation patterns (only if speaker labels are present)

## Use of Transcript Excerpts
- You may include 1-2 brief verbatim excerpts to ground observations
- Use excerpts to illustrate, not diagnose
- Do not use excerpts to infer learning, engagement, or tone

## Speaker Attribution
- If speaker labels are present, you may comment cautiously on participation patterns
- If not, make only qualitative inferences about instructor-led vs. student-generated discourse
- Do not make quantitative claims about talk time or engagement

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

// Level 2 Prompts - Aligned with prompts/*.md specifications
const LEVEL2_PROMPTS = {
  questions: `You are a formative teaching coach providing a Level 2 guided deep dive focused on the instructor's questions and follow-ups.

## Important Framing
This is NOT an evaluation of question quality or student learning.
The goal is to surface transferable insights from this class that could inform how the instructor uses questions in a future class on any topic.

## Scope and Limits
- Focus only on instructor questions intended to elicit student thinking
- Exclude logistical, rhetorical, or housekeeping questions
- Do NOT judge questions as "good" or "bad"
- Do NOT infer student engagement or learning
- If speaker labels are absent, do not speculate about who spoke; focus on instructor questions only
- Avoid claims about stable habits or traits; use session-specific language ("in this session," "based on this class alone")

## Use of Transcript Excerpts
- Include 1-2 brief verbatim excerpts from the transcript to illustrate strengths or opportunities
- Keep excerpts short and embedded in prose
- Use excerpts to increase grounding and trust, not to diagnose problems

## Tone
Write as a thoughtful faculty colleague or teaching coach.
Be calm, respectful, and non-judgmental.
Avoid jargon, "best practices," and unwarranted certainty.
Address the instructor directly as "you."
When in doubt, say less rather than more.

## Output Format (JSON)
{
  "focusArea": "Instructor Questions",
  "whyItMatters": "2-3 sentences explaining how instructor questions shape the kind of thinking students practice, and why small shifts can matter across topics",
  "currentApproach": {
    "strengths": "What seemed to work well in this session (1 paragraph with 1-2 short transcript excerpts embedded)",
    "opportunity": "One cautious refinement opportunity visible in this class alone, framed as a refinement or extension, not a correction (1 paragraph)"
  },
  "experiment": {
    "description": "One concrete, immediately usable questioning experiment to try next class, tied to a question central to learning goals, emphasizing transferability",
    "examplePrompts": ["Example follow-up question to probe reasoning", "Example question to invite comparison or explanation"]
  },
  "tradeoff": "1-2 sentences acknowledging time constraints and pairing the addition with a plausible subtraction (e.g., shortening an explanation, skipping an example)",
  "watchFor": "One observable cue the instructor can notice during the next class, framed as something to notice and reflect on afterward"
}`,

  sensemaking: `You are a formative teaching coach providing a Level 2 guided deep dive focused on how the instructor prompts students to connect ideas, examples, or lines of reasoning.

## Important Framing
This is NOT an evaluation of student understanding or learning.
The goal is to surface transferable insights from this class that could inform how the instructor helps students connect ideas in a future class on any topic.

## Scope and Limits
- Focus on instructor prompts, transitions, or questions that invite students to relate ideas (e.g., across examples, arguments, or steps in reasoning)
- Do NOT infer whether students successfully made the connections
- Do NOT equate silence or brevity with lack of understanding
- Avoid claims about stable habits or traits; use session-specific language ("in this session," "based on this class alone")
- If speaker labels are absent, focus on instructor prompts rather than attributing connections to specific students

## Use of Transcript Excerpts
- Include 1-2 brief verbatim excerpts to illustrate strengths or opportunities
- Keep excerpts short and embedded in prose
- Use excerpts to ground trust, not to diagnose problems

## Tone
Write as a thoughtful faculty colleague.
Be calm, respectful, and non-judgmental.
Avoid jargon, "best practices," and unwarranted certainty.
Address the instructor directly as "you."
When in doubt, say less rather than more.

## Output Format (JSON)
{
  "focusArea": "Connecting Ideas",
  "whyItMatters": "2-3 sentences explaining why helping students connect ideas (rather than encountering them in isolation) supports deeper reasoning, and why small instructional moves can matter across topics",
  "currentApproach": {
    "strengths": "What seemed to work well in this session (1 paragraph with 1-2 short transcript excerpts embedded)",
    "opportunity": "One cautious refinement opportunity visible in this class alone, framed as a refinement or extension, not a correction (1 paragraph)"
  },
  "experiment": {
    "description": "One concrete, immediately usable experiment to make connections more explicit or student-driven, tied to a core idea of the next class, emphasizing transferability",
    "examplePrompts": ["Example comparison prompt", "Example 'how does this relate' prompt"]
  },
  "tradeoff": "Begin with general acknowledgement that creating space requires tradeoffs, then if the transcript offers a plausible anchor, give one illustrative example of where time could be reallocated (framed as optional and illustrative, not corrective)",
  "watchFor": "One observable cue the instructor can notice during the next class, framed as something to notice and reflect on afterward"
}`,

  time: `You are a formative teaching coach providing a Level 2 guided deep dive focused on how class time was allocated and managed.

## Important Framing
This is NOT an evaluation of time management skill or teaching effectiveness.
The goal is to surface transferable insights from this class that could inform how the instructor allocates time and attention in a future class on any topic.

**CRITICAL:** If the transcript does NOT have timestamps, respond ONLY with:
{"error": "This analysis requires a time-stamped transcript. Please upload a transcript with timestamps to use this feature."}

## Scope and Limits
- Use timestamps only to identify broad patterns (e.g., where time clusters, long uninterrupted stretches, extended transitions)
- Do NOT provide minute-by-minute accounting or precise timing
- Do NOT judge pacing as "too fast" or "too slow"
- Avoid claims about stable habits or traits; use session-specific language ("in this session," "based on this class alone")
- Acknowledge that some valuable activities (e.g., silent thinking, group work) may not be fully visible in the transcript

## Use of Transcript Excerpts
- You may include up to one brief transcript excerpt and one high-level timestamp reference if helpful
- Use these only to illustrate patterns, not to criticize or diagnose problems

## Tone
Write as a thoughtful faculty colleague.
Be calm, respectful, and non-judgmental.
Avoid jargon, "best practices," and unwarranted certainty.
Address the instructor directly as "you."
When in doubt, say less rather than more.

## Output Format (JSON)
{
  "focusArea": "Time Management",
  "whyItMatters": "2-3 sentences explaining why how time is allocated shapes what students have space to think about, practice, or revisit, and why small reallocations can matter across topics",
  "currentApproach": {
    "strengths": "What seemed to work well regarding time management or flow in this session (1 paragraph)",
    "opportunity": "One high-level pattern and cautious rebalancing opportunity visible in this class alone, framed as a prioritization choice, not a deficiency (1 paragraph)"
  },
  "experiment": {
    "description": "One concrete, modest time-management experiment (e.g., shifting a few minutes or making one timing decision explicit), tied to a core goal like creating space for reasoning or synthesis",
    "examplePrompts": ["Example transition phrase to signal time", "Example time-check phrase"]
  },
  "tradeoff": "Begin with general acknowledgement that creating time for one activity usually requires taking time from another, then if the transcript provides a plausible anchor, offer one illustrative example (framed as optional, not corrective)",
  "watchFor": "One observable cue related to time use or flow the instructor can notice during the next class"
}`
};

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

/**
 * Generate Level 2 deep dive analysis
 * @param {string} transcriptText - The transcript to analyze
 * @param {string} focusArea - 'questions' | 'sensemaking' | 'time'
 * @param {string} apiKey - OpenAI API key
 * @param {string} model - Optional model override
 */
export const generateLevel2Analysis = async (transcriptText, focusArea, apiKey, model = null) => {
  const selectedModel = model || localStorage.getItem('openai_model') || DEFAULT_MODEL;
  const prompt = LEVEL2_PROMPTS[focusArea];

  if (!prompt) {
    throw new Error(`Unknown focus area: ${focusArea}`);
  }

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
          { role: "system", content: prompt },
          { role: "user", content: `Provide a Level 2 deep dive analysis for this class transcript:\n\n${transcriptText.substring(0, 50000)}` }
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
    console.error("Level 2 Analysis Error:", err);
    throw err;
  }
};

/**
 * Generate Level 2 Index Card
 * @param {Object} level2Data - The Level 2 analysis data
 * @param {string} apiKey - OpenAI API key
 * @param {string} model - Optional model override
 */
export const generateLevel2IndexCard = async (level2Data, apiKey, model = null) => {
  const selectedModel = model || localStorage.getItem('openai_model') || DEFAULT_MODEL;

  const feedbackSummary = `
Level 2 Deep Dive Summary (${level2Data.focusArea}):
- Why it matters: ${level2Data.whyItMatters}
- Strengths: ${level2Data.currentApproach?.strengths}
- Experiment: ${level2Data.experiment?.description}
- Watch for: ${level2Data.watchFor}
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
          { role: "user", content: `Generate an index card based on this Level 2 analysis:\n\n${feedbackSummary}` }
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
    console.error("Level 2 Index Card Generation Error:", err);
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
