/**
 * Analyzes parsed transcript to generate "Class Anatomy"
 */

export const analyzeClass = (transcriptData) => {
    if (!transcriptData || transcriptData.length === 0) return null;

    let totalDuration = 0;
    const speakers = {};
    const timeline = []; // [{ time: 0, type: 'speaker', value: 'Name' }] for visualization

    // Calculate total duration (end of last entry)
    const lastEntry = transcriptData[transcriptData.length - 1];
    totalDuration = lastEntry.endTime;

    // Process entries
    transcriptData.forEach(entry => {
        const duration = entry.endTime - entry.startTime;
        const speaker = entry.speaker || 'Unknown';

        // Aggregate speaker stats
        if (!speakers[speaker]) {
            speakers[speaker] = {
                name: speaker,
                totalTime: 0,
                turns: 0,
                words: 0
            };
        }
        speakers[speaker].totalTime += duration;
        speakers[speaker].turns += 1;
        speakers[speaker].words += entry.text.split(' ').length;

        // Timeline data (simplified for chart)
        timeline.push({
            start: entry.startTime,
            end: entry.endTime,
            speaker: speaker
        });
    });

    // Calculate percentages
    Object.values(speakers).forEach(s => {
        s.percentage = (s.totalTime / totalDuration) * 100;
    });

    // Identify "Teacher" (Assumed: longest speaking time for now, or user can select)
    const sortedSpeakers = Object.values(speakers).sort((a, b) => b.totalTime - a.totalTime);
    const likelyTeacher = sortedSpeakers[0];

    // Interaction Density (Turns per minute)
    const totalMinutes = totalDuration / 60;
    const turnsPerMinute = transcriptData.length / (totalMinutes || 1);

    return {
        totalDuration,
        speakers: sortedSpeakers,
        timeline,
        metrics: {
            turnsPerMinute,
            totalWords: transcriptData.reduce((acc, curr) => acc + curr.text.split(' ').length, 0)
        }
    };
};
