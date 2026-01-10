/**
 * Analyzes parsed transcript to generate "Class Anatomy"
 * including Deep Analysis of questions, wait times, activities, and silence detection.
 */

const QA_PATTERNS = {
  open: /^(why|how|explain|describe|what do you think|tell me about)/i,
  closed: /^(is|are|do|does|can|could|will|would|which|who|where|when|what is|what are)/i,
  leading: /(right\?|isn't it\?|don't you think|correct\?|agree\?)$/i
};

// Minimum gap to consider as a "silence" period (in seconds)
const SILENCE_THRESHOLD = 3;
// Gap that might indicate an activity (in seconds)
const ACTIVITY_THRESHOLD = 10;

export const analyzeClass = (transcriptData) => {
  if (!transcriptData || transcriptData.length === 0) return null;

  let totalDuration = 0;
  const speakers = {};
  const timeline = [];
  const speakingSegments = []; // Granular speaking segments per speaker
  const silenceGaps = []; // All detected silence/gap periods

  const insights = {
    teacherQuestions: { open: [], closed: [], leading: [], total: 0 },
    questions: [],
    studentContributions: { questions: 0, responses: 0, comments: 0, total: 0 },
    rawTeacherQuestions: [],
    rawStudentQuestions: [],
    waitTime: { total: 0, count: 0, max: 0 },
    classModes: { lecture: 0, activity: 0, silence: 0 }
  };

  // 1. Identify Teacher (Heuristic: Speaker with most words)
  const tempSpeakerStat = {};
  transcriptData.forEach(entry => {
    const s = entry.speaker;
    if (!tempSpeakerStat[s]) tempSpeakerStat[s] = 0;
    tempSpeakerStat[s] += entry.text.length;
  });
  const sortedSpeakersByWords = Object.keys(tempSpeakerStat).sort((a, b) => tempSpeakerStat[b] - tempSpeakerStat[a]);
  const teacherName = sortedSpeakersByWords[0];

  // 2. Process Entries and Build Granular Segments
  let lastTeacherQuestionEndTime = null;

  for (let i = 0; i < transcriptData.length; i++) {
    const entry = transcriptData[i];
    const duration = entry.endTime - entry.startTime;
    const speaker = entry.speaker || 'Unknown';
    const text = entry.text.trim();
    const isTeacher = speaker === teacherName;

    // --- Speaking Segment ---
    speakingSegments.push({
      speaker: speaker,
      startTime: entry.startTime,
      endTime: entry.endTime,
      duration: duration,
      text: text,
      isTeacher: isTeacher
    });

    // --- Speaker Stats ---
    if (!speakers[speaker]) {
      speakers[speaker] = {
        name: speaker,
        totalTime: 0,
        turns: 0,
        words: 0,
        role: isTeacher ? 'Teacher' : 'Student',
        segments: [] // Track individual speaking segments
      };
    }
    speakers[speaker].totalTime += duration;
    speakers[speaker].turns += 1;
    speakers[speaker].words += text.split(/\s+/).length;
    speakers[speaker].segments.push({
      startTime: entry.startTime,
      endTime: entry.endTime,
      duration: duration
    });

    // --- Gap/Silence Detection ---
    if (i > 0) {
      const prevEnd = transcriptData[i - 1].endTime;
      const gap = entry.startTime - prevEnd;

      if (gap >= SILENCE_THRESHOLD) {
        const gapInfo = {
          startTime: prevEnd,
          endTime: entry.startTime,
          duration: gap,
          type: gap >= ACTIVITY_THRESHOLD ? 'activity' : 'silence',
          precedingSpeaker: transcriptData[i - 1].speaker,
          followingSpeaker: speaker,
          // Check if preceded by activity indicator
          precedingText: transcriptData[i - 1].text.trim()
        };

        silenceGaps.push(gapInfo);

        // Add to timeline
        const gapLabel = gap >= ACTIVITY_THRESHOLD ? 'Activity/Silence' : 'Brief Pause';

        if (!speakers[gapLabel]) {
          speakers[gapLabel] = {
            name: gapLabel,
            totalTime: 0,
            turns: 0,
            words: 0,
            role: 'System',
            segments: []
          };
        }
        speakers[gapLabel].totalTime += gap;
        speakers[gapLabel].turns += 1;
        speakers[gapLabel].segments.push({
          startTime: prevEnd,
          endTime: entry.startTime,
          duration: gap
        });

        timeline.push({
          start: prevEnd,
          end: entry.startTime,
          speaker: gapLabel,
          type: 'gap',
          gapType: gapInfo.type
        });

        if (gap >= ACTIVITY_THRESHOLD) {
          insights.classModes.activity += gap;
        } else {
          insights.classModes.silence += gap;
        }
      }
    }

    // --- Timeline Speech Entry ---
    timeline.push({
      start: entry.startTime,
      end: entry.endTime,
      speaker: speaker,
      type: 'speech'
    });

    // --- Question Extraction ---
    if (text.endsWith('?')) {
      const qObj = {
        id: `q-${i}`,
        text: text,
        time: entry.startTime,
        speaker: speaker,
        isTeacher: isTeacher
      };
      insights.questions.push(qObj);

      if (isTeacher) {
        insights.rawTeacherQuestions.push(qObj);
        insights.teacherQuestions.total++;

        if (QA_PATTERNS.leading.test(text)) insights.teacherQuestions.leading.push(qObj);
        else if (QA_PATTERNS.open.test(text)) insights.teacherQuestions.open.push(qObj);
        else insights.teacherQuestions.closed.push(qObj);

        lastTeacherQuestionEndTime = entry.endTime;
      } else {
        insights.studentContributions.questions++;
        insights.rawStudentQuestions.push(qObj);
      }
    } else {
      if (isTeacher) {
        lastTeacherQuestionEndTime = null;
      } else {
        insights.studentContributions.total++;
        if (lastTeacherQuestionEndTime && (entry.startTime - lastTeacherQuestionEndTime < 5)) {
          insights.studentContributions.responses++;
          const wait = entry.startTime - lastTeacherQuestionEndTime;
          if (wait > 0) {
            insights.waitTime.total += wait;
            insights.waitTime.count++;
            if (wait > insights.waitTime.max) insights.waitTime.max = wait;
          }
          lastTeacherQuestionEndTime = null;
        } else {
          insights.studentContributions.comments++;
        }
      }
    }
  }

  // Final Stats
  const lastEntry = transcriptData[transcriptData.length - 1];
  totalDuration = lastEntry.endTime;

  // Calculate percentages
  Object.values(speakers).forEach(s => {
    s.percentage = (s.totalTime / totalDuration) * 100;
  });

  const sortedSpeakers = Object.values(speakers).sort((a, b) => b.totalTime - a.totalTime);

  // Derive final modes
  if (teacherName && speakers[teacherName]) {
    insights.classModes.lecture = speakers[teacherName].totalTime;
  }

  return {
    totalDuration,
    speakers: sortedSpeakers,
    timeline,
    speakingSegments, // Granular segments for each utterance
    silenceGaps, // All detected gaps/silences
    teacherName,
    metrics: {
      turnsPerMinute: transcriptData.length / (totalDuration / 60 || 1),
      totalWords: transcriptData.reduce((acc, curr) => acc + curr.text.split(' ').length, 0),
      totalSilenceTime: silenceGaps.reduce((acc, g) => acc + g.duration, 0),
      silenceGapCount: silenceGaps.length,
      activityGapCount: silenceGaps.filter(g => g.type === 'activity').length,
      briefPauseCount: silenceGaps.filter(g => g.type === 'silence').length
    },
    insights: {
      ...insights,
      avgWaitTime: insights.waitTime.count > 0 ? (insights.waitTime.total / insights.waitTime.count) : 0,
      turnsPerMinute: transcriptData.length / (totalDuration / 60 || 1)
    }
  };
};
