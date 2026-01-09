/**
 * Analyzes parsed transcript to generate "Class Anatomy"
 */

/**
 * Analyzes parsed transcript to generate "Class Anatomy"
 * including Deep Analysis of questions, wait times, and activities.
 */

const QA_PATTERNS = {
    open: /^(why|how|explain|describe|what do you think|tell me about)/i,
    closed: /^(is|are|do|does|can|could|will|would|which|who|where|when|what is|what are)/i,
    leading: /(right\?|isn't it\?|don't you think|correct\?|agree\?)$/i
};

export const analyzeClass = (transcriptData) => {
    if (!transcriptData || transcriptData.length === 0) return null;

    let totalDuration = 0;
    const speakers = {};
    const timeline = [];
    const insights = {
        teacherQuestions: { open: [], closed: [], leading: [], total: 0 }, // Simplified legacy
        questions: [], // Unified list: { id, text, time, speaker, isTeacher }
        studentContributions: { questions: 0, responses: 0, comments: 0, total: 0 },
        // Legacy arrays for backward compat (will be populated based on initial heuristic)
        rawTeacherQuestions: [],
        rawStudentQuestions: [],
        waitTime: { total: 0, count: 0, max: 0 },
        classModes: { lecture: 0, groupWork: 0, individualWork: 0 }
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

    // 2. Process Entries
    let lastTeacherQuestionEndTime = null;
    const ACTIVITY_THRESHOLD = 10; // Lowered to 10s as requested

    for (let i = 0; i < transcriptData.length; i++) {
        const entry = transcriptData[i];
        const duration = entry.endTime - entry.startTime;
        const speaker = entry.speaker || 'Unknown';
        const text = entry.text.trim();
        const isTeacher = speaker === teacherName;

        // --- Speaker Stats ---
        if (!speakers[speaker]) {
            speakers[speaker] = { name: speaker, totalTime: 0, turns: 0, words: 0, role: isTeacher ? 'Teacher' : 'Student' };
        }
        speakers[speaker].totalTime += duration;
        speakers[speaker].turns += 1;
        speakers[speaker].words += text.split(/\s+/).length;

        // --- Timeline ---
        if (i > 0) {
            const prevEnd = transcriptData[i - 1].endTime;
            const gap = entry.startTime - prevEnd;
            if (gap > ACTIVITY_THRESHOLD) {
                const activityName = 'Silence / Activity';

                // Add explicit "Silence" speaker stat
                if (!speakers[activityName]) {
                    speakers[activityName] = { name: activityName, totalTime: 0, turns: 0, words: 0, role: 'System' };
                }
                speakers[activityName].totalTime += gap;

                timeline.push({
                    start: prevEnd,
                    end: entry.startTime,
                    speaker: activityName,
                    type: 'activity'
                });
                insights.classModes.individualWork += gap;
            }
        }

        timeline.push({
            start: entry.startTime,
            end: entry.endTime,
            speaker: speaker,
            type: 'speech'
        });

        // --- Question Extraction (Unified) ---
        if (text.endsWith('?')) {
            const qObj = {
                id: `q-${i}`,
                text: text,
                time: entry.startTime,
                speaker: speaker,
                // These defaults are for the initial load, can be overridden by UI selection
                isTeacher: isTeacher
            };
            insights.questions.push(qObj);

            // Populate legacy/helper arrays for initial view
            if (isTeacher) {
                insights.rawTeacherQuestions.push(qObj);
                insights.teacherQuestions.total++;

                // Legacy Regex Classification (preserved for chart if needed, though tables supersede)
                if (QA_PATTERNS.leading.test(text)) insights.teacherQuestions.leading.push(qObj);
                else if (QA_PATTERNS.open.test(text)) insights.teacherQuestions.open.push(qObj);
                else insights.teacherQuestions.closed.push(qObj);

                lastTeacherQuestionEndTime = entry.endTime;
            } else {
                insights.studentContributions.questions++;
                insights.rawStudentQuestions.push(qObj);
            }
        } else {
            // Not a question
            if (isTeacher) {
                lastTeacherQuestionEndTime = null;
            } else {
                // Student contribution logic
                insights.studentContributions.total++;
                // Check if response
                if (lastTeacherQuestionEndTime && (entry.startTime - lastTeacherQuestionEndTime < 5)) {
                    insights.studentContributions.responses++;
                    // Calculate Wait Time
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
        metrics: {
            turnsPerMinute: transcriptData.length / (totalDuration / 60 || 1),
            totalWords: transcriptData.reduce((acc, curr) => acc + curr.text.split(' ').length, 0)
        },
        insights: {
            ...insights,
            avgWaitTime: insights.waitTime.count > 0 ? (insights.waitTime.total / insights.waitTime.count) : 0,
            turnsPerMinute: transcriptData.length / (totalDuration / 60 || 1)
        }
    };
};
