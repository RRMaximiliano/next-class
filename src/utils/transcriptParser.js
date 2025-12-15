/**
 * Parses raw transcript text into structured data.
 * Supports WebVTT style timestamps.
 * 
 * Output format:
 * [
 *   {
 *     id: number,
 *     startTime: number (seconds),
 *     endTime: number (seconds),
 *     speaker: string,
 *     text: string
 *   }
 * ]
 */

export const parseTranscript = (rawText) => {
    const lines = rawText.split(/\r?\n/);
    const entries = [];

    let currentEntry = null;
    let idCounter = 1;

    // Regex for WebVTT timestamp: 00:00:00.000 or 00:00.000
    const timeRegex = /(\d{2}:)?(\d{2}):(\d{2})\.(\d{3})/;

    // Helper to convert timestamp string to seconds
    const parseTime = (timeStr) => {
        const parts = timeStr.trim().split(':');
        let seconds = 0;
        if (parts.length === 3) {
            seconds += parseInt(parts[0]) * 3600;
            seconds += parseInt(parts[1]) * 60;
            seconds += parseFloat(parts[2]);
        } else if (parts.length === 2) {
            seconds += parseInt(parts[0]) * 60;
            seconds += parseFloat(parts[1]);
        }
        return seconds;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line === 'WEBVTT') continue;

        // Check if line is a timestamp range "00:00:10.500 --> 00:00:13.000"
        if (line.includes('-->')) {
            const times = line.split('-->');
            if (times.length === 2) {
                if (currentEntry) {
                    entries.push(currentEntry);
                }
                currentEntry = {
                    id: idCounter++,
                    startTime: parseTime(times[0]),
                    endTime: parseTime(times[1]),
                    speaker: 'Unknown',
                    text: ''
                };
                continue;
            }
        }

        // Check if line is just a number (sequence id in VTT)
        if (/^\d+$/.test(line)) {
            continue;
        }

        // Capture text content
        if (currentEntry) {
            // Try to extract speaker "Name: Text"
            // But only if we haven't set a speaker yet or if it's the first line of text
            const speakerMatch = line.match(/^([^:]+): (.+)$/);
            if (speakerMatch && currentEntry.text === '') {
                currentEntry.speaker = speakerMatch[1].trim();
                currentEntry.text = speakerMatch[2].trim();
            } else {
                if (currentEntry.text) currentEntry.text += ' ' + line;
                else currentEntry.text = line;
            }
        }
    }

    // Push last entry
    if (currentEntry) {
        entries.push(currentEntry);
    }

    return entries;
};
