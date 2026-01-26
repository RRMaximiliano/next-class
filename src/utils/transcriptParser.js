/**
 * Parses raw transcript text into structured data.
 * Supports WebVTT style timestamps OR plain "Speaker: text" format.
 *
 * Output format:
 * {
 *   entries: [
 *     {
 *       id: number,
 *       startTime: number (seconds) or null,
 *       endTime: number (seconds) or null,
 *       speaker: string,
 *       text: string
 *     }
 *   ],
 *   hasTimestamps: boolean
 * }
 */

export const parseTranscript = (rawText) => {
    const lines = rawText.split(/\r?\n/);

    // First, detect if this is a WebVTT format with timestamps
    const hasTimestamps = lines.some(line => line.includes('-->'));

    if (hasTimestamps) {
        return parseWebVTT(rawText);
    } else {
        return parsePlainTranscript(rawText);
    }
};

/**
 * Parse WebVTT format with timestamps
 */
const parseWebVTT = (rawText) => {
    const lines = rawText.split(/\r?\n/);
    const entries = [];

    let currentEntry = null;
    let idCounter = 1;

    // Helper to convert timestamp string to seconds
    const parseTime = (timeStr) => {
        const parts = timeStr.trim().split(':');
        let seconds = 0;
        if (parts.length === 3) {
            seconds += parseInt(parts[0], 10) * 3600;
            seconds += parseInt(parts[1], 10) * 60;
            seconds += parseFloat(parts[2]);
        } else if (parts.length === 2) {
            seconds += parseInt(parts[0], 10) * 60;
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

    return { entries, hasTimestamps: true };
};

/**
 * Parse plain transcript format without timestamps (just "Speaker: text")
 */
const parsePlainTranscript = (rawText) => {
    const lines = rawText.split(/\r?\n/);
    const entries = [];
    let idCounter = 1;
    let currentSpeaker = null;
    let currentText = '';

    const pushEntry = () => {
        if (currentSpeaker && currentText.trim()) {
            entries.push({
                id: idCounter++,
                startTime: null,
                endTime: null,
                speaker: currentSpeaker,
                text: currentText.trim()
            });
        }
        currentText = '';
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Try to match "Speaker: text" pattern
        const speakerMatch = line.match(/^([A-Za-z][A-Za-z0-9\s._-]*): (.*)$/);

        if (speakerMatch) {
            // New speaker found - push previous entry if exists
            pushEntry();
            currentSpeaker = speakerMatch[1].trim();
            currentText = speakerMatch[2].trim();
        } else if (currentSpeaker) {
            // Continuation of previous speaker's text
            currentText += ' ' + line;
        }
    }

    // Push last entry
    pushEntry();

    return { entries, hasTimestamps: false };
};
