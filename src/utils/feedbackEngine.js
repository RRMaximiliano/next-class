/**
 * Generates structured, evidence-based feedback.
 * 
 * Input: analysis object
 * Output: {
 *   style: string,
 *   insights: Array<{
 *     type: 'strength' | 'improvement',
 *     title: string,
 *     value: string, // Main metric to display
 *     evidence: Array<{ text: string, time: number }>, // Quotes
 *     recommendation: string
 *   }>
 * }
 */

/**
 * Generates structured, evidence-based feedback.
 * 
 * Input: analysis object
 * Output: {
 *   style: string,
 *   insights: Array<{
 *     type: 'strength' | 'improvement',
 *     title: string,
 *     value: string, // Main metric to display
 *     evidence: Array<{ text: string, time: number }>, // Quotes
 *     recommendation: string
 *   }>
 * }
 */

export const generateFeedback = (analysis) => {
  if (!analysis) return null;

  const { speakers, insights, metrics, totalDuration } = analysis;
  const collectedInsights = [];

  // 1. Identify Teacher Stats
  const teacher = speakers.find(s => s.role === 'Teacher') || speakers[0];
  const teacherTimePct = teacher ? teacher.percentage : 0;
  const otherSpeakers = speakers.length - 1;

  // --- Teaching Style Classification ---
  let style = "Hybrid";
  if (teacherTimePct > 80) style = "Lecturer";
  else if (teacherTimePct < 40) style = "Facilitator";

  // --- Insight Generation ---

  // 1. DEEP Question Analysis (Open vs Closed vs Leading)
  const qTotal = insights.teacherQuestions.total;
  if (qTotal > 0) {
    const closedQs = insights.teacherQuestions.closed;
    const closedPct = (closedQs.length / qTotal) * 100;
    const openQs = insights.teacherQuestions.open;
    const openPct = (openQs.length / qTotal) * 100;

    // Insight: Questioning Depth
    if (closedPct > 60) {
      collectedInsights.push({
        type: 'improvement',
        title: 'Predominance of Closed Questions',
        value: `${closedPct.toFixed(0)}% Closed Questions`,
        evidence: closedQs.slice(0, 3),
        recommendation: 'Your questioning strategy relies heavily on binary (Yes/No) or recall questions. This limits cognitive depth. Try "reframing" specific closed questions into open inquiries (e.g., change "Is this correct?" to "What evidence supports this?").'
      });
    }

    if (openPct > 30) {
      collectedInsights.push({
        type: 'strength',
        title: 'Cultivating Critical Inquiry',
        value: `${openPct.toFixed(0)}% Open-Ended Questions`,
        evidence: openQs.slice(0, 3),
        recommendation: 'You effectively use open-ended prompts to check understanding. This aligns with high-impact instructional strategies for deep learning.'
      });
    } else if (openPct < 15) {
      collectedInsights.push({
        type: 'improvement',
        title: 'Missed Opportunities for Inquiry',
        value: `Only ${openPct.toFixed(0)}% Open Questions`,
        evidence: [],
        recommendation: 'The low ratio of open questions suggests a transmission-style delivery. Aim to ask at least one "How" or "Why" question for every three factual questions.'
      });
    }
  }

  // 2. Wait Time & Silence
  const avgWait = insights.avgWaitTime;
  if (avgWait < 1.5) {
    collectedInsights.push({
      type: 'improvement',
      title: 'Rapid Response Pace',
      value: `${avgWait.toFixed(1)}s Avg Wait Time`,
      evidence: [],
      recommendation: 'Your wait time is very short (< 1.5s), which often prevents "lower-processing" students from participating. Extending this silence to 3-5 seconds can increase the length and correctness of student responses.'
    });
  } else if (avgWait > 2.5) {
    collectedInsights.push({
      type: 'strength',
      title: 'Strategic Use of Silence',
      value: `${avgWait.toFixed(1)}s Avg Wait Time`,
      evidence: [],
      recommendation: 'Excellent pacing. You consistently allow silence after questions, creating a "thinking space" that invites more diverse participation.'
    });
  }

  // 3. Monologue / Lecture Blocks
  // Heuristic: If we have very long turns without a break
  if (metrics.longestTurnDuration > 300) { // 5 mins
    collectedInsights.push({
      type: 'improvement',
      title: 'Extended Monologue Detected',
      value: `${(metrics.longestTurnDuration / 60).toFixed(1)} min Continuous Speaking`,
      evidence: [{ text: "Consider breaking this block with a check-for-understanding.", time: 0 }],
      recommendation: 'We detected extended periods of uninterrupted speaking (> 5 mins). Attention spans drift after 10 minutes. Insert a "Turn-and-Talk" or quick poll to reset engagement.'
    });
  }

  // 4. Interaction Density (Turns per Minute)
  if (metrics.turnsPerMinute < 2.0 && style === 'Lecturer') {
    collectedInsights.push({
      type: 'improvement',
      title: 'Low Interaction Density',
      value: `${metrics.turnsPerMinute.toFixed(1)} turns/min`,
      evidence: [],
      recommendation: 'The dialogue is sparse. Low interaction density often correlates with passive learning. Aim to increase the "ping-pong" of dialogue by asking follow-up questions to student responses.'
    });
  } else if (metrics.turnsPerMinute > 6.0) {
    collectedInsights.push({
      type: 'strength',
      title: 'High-Velocity Dialogue',
      value: `${metrics.turnsPerMinute.toFixed(1)} turns/min`,
      evidence: [],
      recommendation: 'The session has high energy and frequent speaker switching, indicating an active, engaged classroom environment.'
    });
  }

  // 5. Student Reach (Speaker Count)
  if (totalDuration > 3600 && otherSpeakers < 3) { // > 1 hour, very few students
    collectedInsights.push({
      type: 'improvement',
      title: 'Limited Student Voice',
      value: `Only ${otherSpeakers} Active Students`,
      evidence: [],
      recommendation: 'For a class of this length, hearing from so few distinct voices suggests that engagement is concentrated among a few "frequent flyers." Use cold-calling (warmly) or randomized selection to broaden the conversation.'
    });
  }

  // 6. Feedback Loop (Teacher Response to Student)
  // Heuristic: If teacher turns > student turns * 1.5, it's a lot of "Validating"
  // (This is a simplified check)

  // 7. Chronological Segment Analysis (The "Play-by-Play")
  // Break interaction into 15 min chunks (900 seconds)
  const segmentSize = 900;
  const segmentCount = Math.ceil(totalDuration / segmentSize);

  // We already have 'timeline' in analysis? If not, we infer from timeline array data
  // Assuming analysis.timeline exists (it does from dashboard usage)
  const { timeline } = analysis;

  for (let i = 0; i < segmentCount; i++) {
    const segStart = i * segmentSize;
    const segEnd = (i + 1) * segmentSize;

    // Filter turns in this segment
    const segmentTurns = timeline.filter(t => t.start >= segStart && t.start < segEnd);

    // Calc turns/min for this segment (handle partial last segment)
    const actualDurationMins = (Math.min(segEnd, totalDuration) - segStart) / 60;
    if (actualDurationMins < 1) continue; // Skip tiny fragments

    const turnsPerMin = segmentTurns.length / actualDurationMins;

    // Start Minute Label
    const minLabel = `${Math.floor(segStart / 60)}-${Math.floor(Math.min(segEnd, totalDuration) / 60)} min`;

    // CATEGORIZE EVERY SEGMENT
    if (turnsPerMin > 4.0) {
      collectedInsights.push({
        type: 'strength',
        title: `Dynamic Exchange (${minLabel})`,
        value: `Peak Activity: ${turnsPerMin.toFixed(1)} turns/min`,
        evidence: [],
        recommendation: `This period was highly interactive. You successfully maintained a rapid-fire dialogue. Review the transcript here to see what sparked this engagement.`
      });
    } else if (turnsPerMin < 1.5) {
      collectedInsights.push({
        type: 'improvement',
        title: `Engagement Dip (${minLabel})`,
        value: `Low Activity: ${turnsPerMin.toFixed(1)} turns/min`,
        evidence: [],
        recommendation: `Engagement dropped during this block. Ideally, lecture segments should not exceed 10-15 minutes without a student interaction.`
      });
    } else {
      // Moderate / Instructional
      collectedInsights.push({
        type: 'strength', // Using strength (or could be neutral) to show it's "Okay"
        title: `Instructional Block (${minLabel})`,
        value: `Steady Flow: ${turnsPerMin.toFixed(1)} turns/min`,
        evidence: [],
        recommendation: `A balanced period of instruction and student response. You maintained a steady pace.`
      });
    }
  }

  return {
    style,
    insights: collectedInsights,
    styleDefinitions: {
      'Lecturer': 'Primarily instructor-led (>80% talk). Efficient for content but lower engagement.',
      'Hybrid': 'Balanced approach (40-80% talk). Mixes instruction with interaction.',
      'Facilitator': 'Student-centered (<40% talk). You guide rather than direct.'
    }
  };
};
