/**
 * Service to handle communications with LLM providers (OpenAI/Gemini).
 */

// Default model - can be overridden via settings
const DEFAULT_MODEL = 'gpt-5.2';

// Default timeout for API calls (2 minutes)
const API_TIMEOUT_MS = 120000;

/**
 * Fetch with timeout wrapper
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
export const fetchWithTimeout = async (url, options, timeout = API_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. The server took too long to respond.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Validate LLM response has required fields
 * @param {object} response - Parsed JSON response
 * @param {string[]} requiredFields - Array of required field names
 * @param {string} context - Context for error message
 * @throws {Error} If validation fails
 */
const validateResponse = (response, requiredFields, context = 'LLM response') => {
  if (!response || typeof response !== 'object') {
    throw new Error(`Invalid ${context}: Expected an object but received ${typeof response}`);
  }

  const missingFields = requiredFields.filter(field => !(field in response));
  if (missingFields.length > 0) {
    throw new Error(`Invalid ${context}: Missing required fields: ${missingFields.join(', ')}`);
  }

  return true;
};

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
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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

Avoid feedback that merely describes common instructor verbal habits (summarizing, transitioning, signposting) unless these are unusually effective or notably absent.

## Priority
Do NOT over-index on transitions, recaps, or verbal connective tissue (e.g., "let me summarize," "as we discussed"). These are common instructor moves but rarely the most important feedback. Prioritize feedback about questioning, cognitive demand, and participation patterns over structural signaling.

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

// Maximum transcript length settings
// GPT-5.2 supports ~128k tokens, roughly 400k characters
// Default to 120k characters to leave room for system prompts and response
const DEFAULT_MAX_LENGTH = 120000;

// Get max length from settings or use default
const getMaxTranscriptLength = () => {
  const savedLimit = localStorage.getItem('transcript_max_length');
  return savedLimit ? parseInt(savedLimit, 10) : DEFAULT_MAX_LENGTH;
};

// For very long transcripts, we can use chunked analysis
const CHUNK_SIZE = 40000; // Characters per chunk
const CHUNK_OVERLAP = 2000; // Overlap to maintain context

/**
 * Split transcript into overlapping chunks for analysis
 * @param {string} text - Full transcript text
 * @param {number} chunkSize - Size of each chunk
 * @param {number} overlap - Overlap between chunks
 * @returns {string[]} Array of text chunks
 */
const splitIntoChunks = (text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) => {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start = end - overlap;
    if (start + overlap >= text.length) break;
  }

  return chunks;
};

/**
 * Summarize a single chunk of transcript
 * @param {string} chunkText - Transcript chunk
 * @param {number} chunkIndex - Index of this chunk
 * @param {number} totalChunks - Total number of chunks
 * @param {string} apiKey - OpenAI API key
 * @param {string} model - Model to use
 * @returns {Promise<Object>} Partial analysis
 */
const analyzeChunk = async (chunkText, chunkIndex, totalChunks, apiKey, model) => {
  const chunkPrompt = `You are analyzing part ${chunkIndex + 1} of ${totalChunks} of a class transcript.

Extract key observations for later synthesis:
1. Notable instructional moves or patterns
2. Any questions asked (with approximate context)
3. Participation patterns (if speaker labels present)
4. Strengths and opportunities visible in this section

Output JSON:
{
  "observations": ["observation 1", "observation 2"],
  "questions": ["question text 1", "question text 2"],
  "patterns": "Brief note on patterns",
  "section": "beginning|middle|end"
}`;

  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: chunkPrompt },
        { role: "user", content: `Analyze this transcript section:\n\n${chunkText}` }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Chunk analysis failed');
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
};

/**
 * Synthesize chunk analyses into final feedback
 * @param {Object[]} chunkAnalyses - Array of chunk analysis results
 * @param {string} apiKey - OpenAI API key
 * @param {string} model - Model to use
 * @returns {Promise<Object>} Final synthesized feedback
 */
const synthesizeChunkAnalyses = async (chunkAnalyses, apiKey, model) => {
  const synthesisPrompt = `${LEVEL1_PROMPT}

You are synthesizing observations from multiple sections of a long transcript that was analyzed in chunks.
Use the combined observations to provide Level 1 formative feedback.`;

  const combinedObservations = chunkAnalyses.map((chunk, i) =>
    `Section ${i + 1} (${chunk.section || 'unknown'}):\n- Observations: ${chunk.observations?.join('; ') || 'None'}\n- Patterns: ${chunk.patterns || 'None'}`
  ).join('\n\n');

  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: synthesisPrompt },
        { role: "user", content: `Synthesize Level 1 feedback from these observations across the full class:\n\n${combinedObservations}` }
      ],
      temperature: 0.5,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Synthesis failed');
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
};

export const generateLectureSummary = async (transcriptText, apiKey, model = null) => {
  const selectedModel = model || localStorage.getItem('openai_model') || DEFAULT_MODEL;
  const maxLength = getMaxTranscriptLength();
  const useChunking = transcriptText.length > maxLength;

  try {
    let result;

    if (useChunking) {
      // Use chunked analysis for very long transcripts
      console.log(`Transcript length (${transcriptText.length} chars) exceeds limit (${maxLength}). Using chunked analysis.`);

      const chunks = splitIntoChunks(transcriptText);
      console.log(`Split into ${chunks.length} chunks for analysis.`);

      // Analyze each chunk
      const chunkAnalyses = [];
      for (let i = 0; i < chunks.length; i++) {
        const analysis = await analyzeChunk(chunks[i], i, chunks.length, apiKey, selectedModel);
        chunkAnalyses.push(analysis);
      }

      // Synthesize into final feedback
      result = await synthesizeChunkAnalyses(chunkAnalyses, apiKey, selectedModel);

      // Add chunking metadata
      result._meta = {
        chunked: true,
        originalLength: transcriptText.length,
        chunkCount: chunks.length
      };
    } else {
      // Standard single-pass analysis
      const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: "system", content: LEVEL1_PROMPT },
            { role: "user", content: `Provide Level 1 formative feedback for this class transcript:\n\n${transcriptText}` }
          ],
          temperature: 0.4,
          seed: 42,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API Request Failed');
      }

      const data = await response.json();

      try {
        result = JSON.parse(data.choices[0].message.content);
      } catch (parseError) {
        throw new Error('Failed to parse AI response. The model returned invalid JSON.');
      }

      // Add metadata for full analysis
      result._meta = {
        chunked: false,
        analyzedLength: transcriptText.length
      };
    }

    // Validate required fields for Level 1 feedback
    validateResponse(result, ['framing', 'whatWorked', 'experiments'], 'Level 1 feedback');

    return result;

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
  "watchFor": "One observable signal that TRY is working — how would the instructor recognize success?"
}

CRITICAL CONSTRAINTS:
1. The ENTIRE card must be topic-neutral and usable verbatim in a different class on a different subject.
2. Avoid references to specific concepts, cases, actors, or examples from this session.
3. Focus on transferable instructional moves, not content-specific actions.
4. Keep each section extremely concise — this must fit on a 3×5 card.
5. The "say" field should be a generic but useful prompt/question applicable across topics.
6. The card supports execution in the next class, not reflection on this one.
7. WATCH FOR is specifically about recognizing whether TRY is working — what observable student behavior or classroom cue would indicate the experiment is succeeding?

Examples of GOOD (topic-neutral):
- KEEP: "Pausing after asking a question to give students time to think"
- TRY: "Ask one student to summarize the key point before moving on"
- SAY: "What's one thing that's still unclear about this?"
- WATCH FOR: "More students volunteer answers after the pause (signals they had time to formulate thoughts)"

Examples of BAD (too specific):
- KEEP: "Your explanation of supply and demand curves"
- TRY: "Use the GDP example again"
- SAY: "Who can explain marginal utility?"
- WATCH FOR: "Students understand the concept" (too vague, not observable)
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
  "watchFor": "One observable signal that the experiment is working — a concrete student behavior or classroom cue that would indicate success. Frame this as: 'If TRY is working, you might notice...'"
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
  "watchFor": "One observable signal that the experiment is working — a concrete student behavior or classroom cue that would indicate success. Frame this as: 'If TRY is working, you might notice...'"
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
  "watchFor": "One observable signal that the time experiment is working — a concrete cue during class that would indicate the reallocation is paying off. Frame this as: 'If TRY is working, you might notice...'"
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
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
    let result;

    try {
      result = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      throw new Error('Failed to parse AI response. The model returned invalid JSON.');
    }

    // Validate required fields for Index Card
    validateResponse(result, ['keep', 'try', 'say', 'watchFor'], 'Index Card');

    return result;

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
  const maxLength = getMaxTranscriptLength();

  if (!prompt) {
    throw new Error(`Unknown focus area: ${focusArea}`);
  }

  // For Level 2, we use the full transcript up to the limit (no chunking for now)
  // Level 2 analysis benefits from seeing the full context
  const analysisText = transcriptText.length > maxLength
    ? transcriptText.substring(0, maxLength)
    : transcriptText;
  const wasTruncated = transcriptText.length > maxLength;

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: `Provide a Level 2 deep dive analysis for this class transcript:\n\n${analysisText}` }
        ],
        temperature: 0.4,
        seed: 42,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API Request Failed');
    }

    const data = await response.json();
    let result;

    try {
      result = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      throw new Error('Failed to parse AI response. The model returned invalid JSON.');
    }

    // Check for error response (e.g., no timestamps for time analysis)
    if (!result.error) {
      // Validate required fields for Level 2 feedback
      validateResponse(result, ['focusArea', 'whyItMatters', 'currentApproach', 'experiment', 'watchFor'], 'Level 2 feedback');
    }

    // Add truncation metadata to response
    if (wasTruncated) {
      result._meta = {
        truncated: true,
        originalLength: transcriptText.length,
        analyzedLength: maxLength
      };
    }

    return result;

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
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
    let result;

    try {
      result = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      throw new Error('Failed to parse AI response. The model returned invalid JSON.');
    }

    // Validate required fields for Index Card
    validateResponse(result, ['keep', 'try', 'say', 'watchFor'], 'Level 2 Index Card');

    return result;

  } catch (err) {
    console.error("Level 2 Index Card Generation Error:", err);
    throw err;
  }
};

// Level 3 Coaching Conversation Prompt
const COACHING_SYSTEM_PROMPT = `
You are a reflective teaching coach engaging in a Socratic coaching conversation with an instructor about their recent class.

## Your Role
Instead of providing direct feedback, you help the instructor discover insights through guided reflection. Start by asking questions about their experience before offering observations.

## Conversation Flow
1. Begin by asking the instructor how they felt the class went
2. Follow up on their responses with probing questions
3. When appropriate, gently introduce observations from the transcript
4. Frame observations as questions rather than statements (e.g., "I noticed several questions were closed-ended. Was this a deliberate choice?")
5. Help the instructor identify their own experiments to try
6. After 3 exchanges, begin weaving in 1 concrete suggestion alongside your reflective question. Frame it as: "Based on what you've shared, one thing you might experiment with is [X]. What do you think about that?"

## Guidelines
- Be genuinely curious about the instructor's perspective
- Avoid evaluative language
- Use the transcript as a conversation reference, not a diagnostic tool
- If the instructor identifies something they want to change, help them think through how
- Keep responses conversational and concise (2-4 sentences typically)
- Ask at most one question per response. After every 2 exchanges, briefly summarize what you've heard before asking another question.
- Before asking a new question, briefly acknowledge what the instructor shared (1 sentence). Avoid generic praise — reflect back what they said.

## Tone
Write as a thoughtful faculty colleague. Be calm, respectful, and non-judgmental.
Avoid jargon, "best practices," and unwarranted certainty.
Address the instructor directly as "you."
When in doubt, say less rather than more.

You have access to the class transcript. Use it to ground your questions in specific moments, but always frame these as invitations for reflection rather than critiques.
`;

// Direct suggestions prompt (Sprint 2B)
const COACHING_DIRECT_PROMPT = `
You are a reflective teaching coach. The instructor has been having a Socratic coaching conversation about their recent class but has now asked for direct suggestions.

Based on the conversation so far and the transcript, provide 2-3 concrete, transferable experiments they could try in their next class. Frame as suggestions, not prescriptions.

For each suggestion:
1. Briefly connect it to something from the conversation or transcript
2. Make it immediately actionable (something they can do tomorrow)
3. Include one concrete phrase or move they could try

Keep the tone warm and collegial. End by inviting them to react to the suggestions or continue the conversation.
`;

/**
 * Send a message in the Level 3 coaching conversation
 * @param {Array} conversationHistory - Array of {role, content} messages
 * @param {string} userMessage - The instructor's message
 * @param {string} transcriptText - The class transcript for context
 * @param {string} apiKey - OpenAI API key
 * @param {string} model - Optional model override
 * @returns {Promise<string>} The coach's response
 */
export const sendCoachingMessage = async (conversationHistory, userMessage, transcriptText, apiKey, model = null, isDirectMode = false) => {
  const selectedModel = model || localStorage.getItem('openai_model') || DEFAULT_MODEL;
  const maxLength = getMaxTranscriptLength();

  // Truncate transcript if needed
  const truncatedTranscript = transcriptText.length > maxLength
    ? transcriptText.substring(0, maxLength) + '\n\n[Transcript truncated for length]'
    : transcriptText;

  // Use direct prompt if in direct mode
  const systemPrompt = isDirectMode ? COACHING_DIRECT_PROMPT : COACHING_SYSTEM_PROMPT;

  // Build messages array with system prompt, transcript context, and conversation history
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "system", content: `Here is the class transcript for reference:\n\n${truncatedTranscript}` },
    ...conversationHistory,
    { role: "user", content: userMessage }
  ];

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature: 0.7,
        max_completion_tokens: 600
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API Request Failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (err) {
    console.error("Coaching Message Error:", err);
    throw err;
  }
};

/**
 * Send a direct suggestions message (Sprint 2B escape hatch)
 */
export const sendDirectSuggestionsMessage = async (conversationHistory, transcriptText, apiKey, model = null) => {
  const selectedModel = model || localStorage.getItem('openai_model') || DEFAULT_MODEL;
  const maxLength = getMaxTranscriptLength();

  const truncatedTranscript = transcriptText.length > maxLength
    ? transcriptText.substring(0, maxLength) + '\n\n[Transcript truncated for length]'
    : transcriptText;

  const messages = [
    { role: "system", content: COACHING_DIRECT_PROMPT },
    { role: "system", content: `Here is the class transcript for reference:\n\n${truncatedTranscript}` },
    ...conversationHistory,
    { role: "user", content: "Please give me direct, concrete suggestions based on our conversation and the transcript." }
  ];

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature: 0.7,
        max_completion_tokens: 800
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API Request Failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (err) {
    console.error("Direct Suggestions Error:", err);
    throw err;
  }
};

/**
 * Generate a custom Level 2 deep dive analysis (Sprint 4D)
 * @param {string} transcriptText - The transcript to analyze
 * @param {string} userDescription - User's description of what to explore
 * @param {string} apiKey - OpenAI API key
 * @param {string} model - Optional model override
 */
export const generateCustomLevel2Analysis = async (transcriptText, userDescription, apiKey, model = null) => {
  const selectedModel = model || localStorage.getItem('openai_model') || DEFAULT_MODEL;
  const maxLength = getMaxTranscriptLength();

  const analysisText = transcriptText.length > maxLength
    ? transcriptText.substring(0, maxLength)
    : transcriptText;
  const wasTruncated = transcriptText.length > maxLength;

  const customPrompt = `You are a formative teaching coach providing a Level 2 guided deep dive on a custom focus area specified by the instructor.

## The instructor wants to explore:
"${userDescription}"

## Important Framing
This is NOT an evaluation. The goal is to surface transferable insights from this class that could inform future practice.

## Scope and Limits
- Focus specifically on what the instructor asked about
- Base observations only on evidence in the transcript
- Avoid claims about stable habits; use session-specific language
- When evidence is thin, say so

## Tone
Write as a thoughtful faculty colleague. Be calm, respectful, and non-judgmental.
Address the instructor directly as "you."
When in doubt, say less rather than more.

## Output Format (JSON)
{
  "focusArea": "A short title for the custom focus area",
  "whyItMatters": "2-3 sentences explaining why this area matters for teaching",
  "currentApproach": {
    "strengths": "What seemed to work well in this session related to the focus area (1 paragraph with transcript excerpts if available)",
    "opportunity": "One cautious refinement opportunity (1 paragraph)"
  },
  "experiment": {
    "description": "One concrete experiment to try next class",
    "examplePrompts": ["Example phrase 1", "Example phrase 2"]
  },
  "tradeoff": "1-2 sentences on what might need to be adjusted to make room for the experiment",
  "watchFor": "One observable signal the experiment is working"
}`;

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: customPrompt },
          { role: "user", content: `Provide a Level 2 deep dive analysis for this class transcript:\n\n${analysisText}` }
        ],
        temperature: 0.4,
        seed: 42,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API Request Failed');
    }

    const data = await response.json();
    let result;

    try {
      result = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      throw new Error('Failed to parse AI response. The model returned invalid JSON.');
    }

    validateResponse(result, ['focusArea', 'whyItMatters', 'currentApproach', 'experiment', 'watchFor'], 'Custom Level 2 feedback');

    if (wasTruncated) {
      result._meta = {
        truncated: true,
        originalLength: transcriptText.length,
        analyzedLength: maxLength
      };
    }

    return result;

  } catch (err) {
    console.error("Custom Level 2 Analysis Error:", err);
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
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
