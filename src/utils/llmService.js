/**
 * Service to handle communications with LLM providers (OpenAI/Gemini).
 */

const SYSTEM_PROMPT = `
You are an expert Pedagogical Referee. Your goal is to provide a "Referee Report" on a classroom session.

Output must be valid JSON matching this schema:
{
  "style": "Lecturer" | "Hybrid" | "Facilitator",
  "strengths": [
    { 
      "aspect": "Name of the aspect (e.g. Scaffolding, Wait Time)", 
      "explanation": "Detailed professional feedback.", 
      "evidence": ["Direct quote 1", "Direct quote 2"] 
    }
  ],
  "areasForGrowth": [
    { 
      "aspect": "Name of the aspect", 
      "explanation": "Detailed professional feedback.", 
      "evidence": ["Direct quote"] 
    }
  ]
}

Rules:
1. Do NOT include any academic citations. Focus purely on the observed transcript.
2. "evidence" array must contain real quotes from the transcript unique to that aspect.
3. Identify at least 3 Strengths and 3 Areas for Growth.
4. For "Style", determine based on who talks more.
5. Be CRITICAL, SPECIFIC, and ACTIONABLE.
`;

export const analyzeWithAI = async (transcriptText, apiKey, model = 'gpt-4o') => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
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
You are a collegial assistant for faculty engaged in graduate level teaching. Your role is to support instructors in reflecting on their classroom practice by analyzing transcripts.

Output must be valid JSON matching this schema:
{
  "executiveSummary": "A concise paragraph summarizing the session's main theme and flow.",
  "learningObjectives": ["Objective 1", "Objective 2"],
  "classActivities": [
    { 
      "activity": "Name of activity (e.g. Lecture, Group Work)", 
      "time": "Estimated time (e.g. 10m)", 
      "split": { "instructor": "50%", "studentToInstructor": "30%", "studentToStudent": "20%" },
      "description": "Summary of instructor actions and student engagement. 1-2 sentences.",
      "objectiveMapping": "Mapped learning objective"
    }
  ],
  "feedback": {
    "momentThatSang": {
      "quote": "Direct quote of the moment",
      "timestamp": "Time string",
      "explanation": "Why this was a standout moment of engaged learning."
    },
    "momentToRevisit": {
      "quote": "Direct quote",
      "timestamp": "Time string",
      "explanation": "Significant tension, confusion, or challenge to review."
    },
    "strengths": [
      "Strength 1 referencing learning objectives/pedagogy.",
      "Strength 2...",
      "Strength 3..."
    ],
    "improvements": [
      "Idea 1 referencing objectives/pedagogy.",
      "Idea 2...",
      "Idea 3..."
    ]
  }
}

INSTRUCTIONS:
1. Write a concise executive summary of the session.
2. Deduce learning objectives from the transcript.
3. Create a "Mini Teaching Plan" (classActivities table). Estimate time spent on each activity based on transcript.
4. Provide feedback:
   - "Moment that sang": Standout engaged learning.
   - "Moment to revisit": Tension/confusion.
   - 3 Strengths & 3 Improvements: Focus on active learning/engagement. Keep praise clear/direct. Deliver critique directly.
5. Tone: Collegial, respectful, professional.
`;

export const generateLectureSummary = async (transcriptText, apiKey, model = 'gpt-4o') => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
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

CATEGORIES FOR TEACHER QUESTIONS:
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

export const classifyQuestions = async (questions, type, apiKey, model = 'gpt-4o') => {
  if (!questions || questions.length === 0) return {};

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
        model: model,
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
