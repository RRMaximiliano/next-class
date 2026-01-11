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

const SUMMARY_PROMPT = `
You are a collegial assistant supporting instructors in reflecting on their classroom practice by analyzing transcripts.
Address the instructor directly using "you" throughout your feedback (e.g., "You effectively..." not "The instructor...").

Output must be valid JSON matching this schema:
{
  "executiveSummary": "A concise paragraph summarizing the session's main theme and flow, addressing the instructor directly as 'you'.",
  "learningObjectives": [
    {
      "objective": "Specific, measurable learning objective",
      "evidenceOfProgress": "How this objective was addressed in the session"
    }
  ],
  "classActivities": [
    { 
      "activity": "Name of activity (e.g. Lecture, Group Work)", 
      "time": "Estimated time (e.g. 10m)", 
      "split": { "instructor": "50%", "studentToInstructor": "30%", "studentToStudent": "20%" },
      "description": "Summary of your actions and student engagement. 1-2 sentences addressing you directly.",
      "objectiveMapping": "Which specific learning objective this activity addressed"
    }
  ],
  "feedback": {
    "momentThatSang": {
      "quote": "Direct quote of the moment",
      "timestamp": "Time string",
      "explanation": "Why this was a standout moment of engaged learning, addressing you directly.",
      "objectiveConnection": "Which learning objective this moment advanced"
    },
    "momentToRevisit": {
      "quote": "Direct quote",
      "timestamp": "Time string",
      "explanation": "Significant tension, confusion, or challenge to review, addressing you directly.",
      "objectiveConnection": "Which learning objective was at stake"
    },
    "strengths": [
      {
        "strength": "Description of the strength, addressing you directly (e.g., 'You demonstrated...')",
        "objectiveConnection": "How this supported specific learning objectives"
      }
    ],
    "improvements": [
      {
        "improvement": "Description of improvement opportunity, addressing you directly (e.g., 'You could...')",
        "objectiveConnection": "How this change could better support learning objectives"
      }
    ]
  }
}

CRITICAL INSTRUCTIONS FOR LEARNING OBJECTIVES:
Generate 3-5 SPECIFIC, MEASURABLE learning objectives that students should be able to demonstrate after this session.

Examples of BAD (too vague) learning objectives:
- "Students will understand the topic"
- "Students will learn about economics"
- "Students will know the key concepts"

Examples of GOOD (specific, measurable) learning objectives:
- "Students will be able to calculate the marginal rate of substitution given a utility function"
- "Students will be able to distinguish between nominal and real GDP and explain when each is appropriate"
- "Students will be able to identify three key factors that led to the 2008 financial crisis and explain their interconnections"

INSTRUCTIONS:
1. Write a concise executive summary of the session, addressing the instructor as "you".
2. Infer 3-5 SPECIFIC, MEASURABLE learning objectives from the transcript (see examples above).
3. For each objective, note evidence of how it was addressed in the session.
4. Create a "Session Activities" table. Map each activity to specific objectives.
5. Provide feedback:
   - "Moment that sang": Standout moment of engaged learning, connected to objectives.
   - "Moment to revisit": Tension/confusion, connected to objectives.
   - 3 Strengths & 3 Improvements: Each MUST reference specific learning objectives and address the instructor as "you".
6. Tone: Collegial, respectful, professional. ALWAYS use "you" to address the instructor directly.
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
          { role: "system", content: SUMMARY_PROMPT },
          { role: "user", content: `Summarize this transcript:\n\n${transcriptText.substring(0, 50000)}...` }
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
