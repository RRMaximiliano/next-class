/**
 * Analyzes parsed transcript to generate "Class Anatomy"
 * including Deep Analysis of questions, wait times, activities, and silence detection.
 */

/**
 * Calculate wait time metrics for a given teacher
 * @param {Array} transcriptData - Raw transcript entries
 * @param {string} teacherName - Name of the teacher to calculate wait time for
 * @returns {Object} Wait time metrics { avgWaitTime, maxWaitTime, responseCount }
 */
export const calculateWaitTime = (transcriptData, teacherName) => {
  let waitTime = { total: 0, count: 0, max: 0 };
  let lastTeacherQuestionEndTime = null;

  for (let i = 0; i < transcriptData.length; i++) {
    const entry = transcriptData[i];
    const isTeacher = entry.speaker === teacherName;
    const text = entry.text.trim();

    if (text.endsWith('?') && isTeacher) {
      lastTeacherQuestionEndTime = entry.endTime;
    } else if (!isTeacher && lastTeacherQuestionEndTime) {
      if (entry.startTime - lastTeacherQuestionEndTime < 5) {
        const wait = entry.startTime - lastTeacherQuestionEndTime;
        if (wait > 0) {
          waitTime.total += wait;
          waitTime.count++;
          if (wait > waitTime.max) waitTime.max = wait;
        }
      }
      lastTeacherQuestionEndTime = null;
    } else if (isTeacher && !text.endsWith('?')) {
      lastTeacherQuestionEndTime = null;
    }
  }

  return {
    avgWaitTime: waitTime.count > 0 ? waitTime.total / waitTime.count : 0,
    maxWaitTime: waitTime.max,
    responseCount: waitTime.count
  };
};

const QA_PATTERNS = {
  open: /^(why|how|explain|describe|what do you think|tell me about)/i,
  closed: /^(is|are|do|does|can|could|will|would|which|who|where|when|what is|what are)/i,
  leading: /(right\?|isn't it\?|don't you think|correct\?|agree\?)$/i
};

// Minimum gap to consider as a "silence" period (in seconds)
const SILENCE_THRESHOLD = 3;
// Gap that might indicate an activity (in seconds)
const ACTIVITY_THRESHOLD = 10;

export const analyzeClass = (transcriptData, hasTimestamps = true, hasSpeakerLabels = true) => {
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
  let lastTeacherQuestionIndex = null; // For non-timestamp mode

  for (let i = 0; i < transcriptData.length; i++) {
    const entry = transcriptData[i];
    const speaker = entry.speaker || 'Unknown';
    const text = entry.text.trim();
    const isTeacher = speaker === teacherName;

    // Duration handling - only calculate if we have timestamps
    const duration = hasTimestamps ? (entry.endTime - entry.startTime) : 0;

    // --- Speaking Segment (only meaningful with timestamps) ---
    if (hasTimestamps) {
      speakingSegments.push({
        speaker: speaker,
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: duration,
        text: text,
        isTeacher: isTeacher
      });
    }

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
    if (hasTimestamps) {
      speakers[speaker].totalTime += duration;
      speakers[speaker].segments.push({
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: duration
      });
    }
    speakers[speaker].turns += 1;
    speakers[speaker].words += text.split(/\s+/).length;

    // --- Gap/Silence Detection (only with timestamps) ---
    if (hasTimestamps && i > 0) {
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

    // --- Timeline Speech Entry (only with timestamps) ---
    if (hasTimestamps) {
      timeline.push({
        start: entry.startTime,
        end: entry.endTime,
        speaker: speaker,
        type: 'speech'
      });
    }

    // --- Question Extraction ---
    if (text.endsWith('?')) {
      const qObj = {
        id: `q-${i}`,
        text: text,
        time: hasTimestamps ? entry.startTime : null,
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

        lastTeacherQuestionEndTime = hasTimestamps ? entry.endTime : null;
        lastTeacherQuestionIndex = i;
      } else {
        insights.studentContributions.questions++;
        insights.rawStudentQuestions.push(qObj);
      }
    } else {
      if (isTeacher) {
        lastTeacherQuestionEndTime = null;
        lastTeacherQuestionIndex = null;
      } else {
        insights.studentContributions.total++;

        // Response detection - with or without timestamps
        const isResponseToQuestion = hasTimestamps
          ? (lastTeacherQuestionEndTime && (entry.startTime - lastTeacherQuestionEndTime < 5))
          : (lastTeacherQuestionIndex !== null && (i - lastTeacherQuestionIndex <= 2));

        if (isResponseToQuestion) {
          insights.studentContributions.responses++;
          if (hasTimestamps && lastTeacherQuestionEndTime) {
            const wait = entry.startTime - lastTeacherQuestionEndTime;
            if (wait > 0) {
              insights.waitTime.total += wait;
              insights.waitTime.count++;
              if (wait > insights.waitTime.max) insights.waitTime.max = wait;
            }
          }
          lastTeacherQuestionEndTime = null;
          lastTeacherQuestionIndex = null;
        } else {
          insights.studentContributions.comments++;
        }
      }
    }
  }

  // Calculate longest continuous speaking turn (only with timestamps)
  let longestTurnDuration = 0;
  let longestTurnSpeaker = null;
  if (hasTimestamps) {
    speakingSegments.forEach(seg => {
      if (seg.duration > longestTurnDuration) {
        longestTurnDuration = seg.duration;
        longestTurnSpeaker = seg.speaker;
      }
    });
  }

  // Final Stats
  if (hasTimestamps) {
    const lastEntry = transcriptData[transcriptData.length - 1];
    totalDuration = lastEntry.endTime;

    // Calculate percentages
    Object.values(speakers).forEach(s => {
      s.percentage = (s.totalTime / totalDuration) * 100;
    });
  } else {
    // Without timestamps, use word count for relative percentages
    const totalWords = Object.values(speakers).reduce((acc, s) => acc + s.words, 0);
    Object.values(speakers).forEach(s => {
      s.percentage = totalWords > 0 ? (s.words / totalWords) * 100 : 0;
    });
  }

  const sortedSpeakers = Object.values(speakers).sort((a, b) =>
    hasTimestamps ? b.totalTime - a.totalTime : b.words - a.words
  );

  // Derive final modes (only with timestamps)
  if (hasTimestamps && teacherName && speakers[teacherName]) {
    insights.classModes.lecture = speakers[teacherName].totalTime;
  }

  return {
    totalDuration: hasTimestamps ? totalDuration : null,
    hasTimestamps,
    hasSpeakerLabels,
    speakers: sortedSpeakers,
    timeline: hasTimestamps ? timeline : [],
    speakingSegments: hasTimestamps ? speakingSegments : [],
    silenceGaps: hasTimestamps ? silenceGaps : [],
    teacherName: hasSpeakerLabels ? teacherName : null,
    rawTranscriptData: transcriptData, // Store for dynamic recalculations
    metrics: {
      turnsPerMinute: hasTimestamps ? transcriptData.length / (totalDuration / 60 || 1) : null,
      totalWords: transcriptData.reduce((acc, curr) => acc + curr.text.split(' ').length, 0),
      totalSilenceTime: hasTimestamps ? silenceGaps.reduce((acc, g) => acc + g.duration, 0) : null,
      silenceGapCount: hasTimestamps ? silenceGaps.length : null,
      activityGapCount: hasTimestamps ? silenceGaps.filter(g => g.type === 'activity').length : null,
      briefPauseCount: hasTimestamps ? silenceGaps.filter(g => g.type === 'silence').length : null,
      longestTurnDuration: hasTimestamps ? longestTurnDuration : null,
      longestTurnSpeaker: hasTimestamps ? longestTurnSpeaker : null
    },
    insights: {
      ...insights,
      avgWaitTime: hasTimestamps && insights.waitTime.count > 0 ? (insights.waitTime.total / insights.waitTime.count) : null,
      turnsPerMinute: hasTimestamps ? transcriptData.length / (totalDuration / 60 || 1) : null
    }
  };
};
