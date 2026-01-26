/**
 * Parses raw transcript text into structured data.
 * Supports WebVTT style timestamps, plain "Speaker: text" format, or unstructured text.
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
 *   hasTimestamps: boolean,
 *   hasSpeakerLabels: boolean
 * }
 */

/**
 * Detect the format of the transcript text
 * @param {string} rawText - Raw transcript text
 * @returns {'webvtt' | 'structured' | 'unstructured'} - Detected format
 */
const detectTranscriptFormat = (rawText) => {
    const lines = rawText.split(/\r?\n/).filter(l => l.trim());

    // Check for WebVTT format (has timestamp arrows)
    if (lines.some(l => l.includes('-->'))) {
        return 'webvtt';
    }

    // Check for structured format (at least 10% of lines have speaker labels)
    const speakerPattern = /^[A-Za-z][A-Za-z0-9\s._-]*:/;
    const speakerLines = lines.filter(l => speakerPattern.test(l));

    return speakerLines.length >= lines.length * 0.1 ? 'structured' : 'unstructured';
};

export const parseTranscript = (rawText) => {
    const format = detectTranscriptFormat(rawText);

    switch (format) {
        case 'webvtt':
            return parseWebVTT(rawText);
        case 'structured':
            return parsePlainTranscript(rawText);
        case 'unstructured':
            return parseUnstructuredTranscript(rawText);
        default:
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

    return { entries, hasTimestamps: true, hasSpeakerLabels: true };
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

    return { entries, hasTimestamps: false, hasSpeakerLabels: true };
};

/**
 * Parse unstructured transcript format (no speaker labels, no timestamps)
 * e.g., auto-generated Zoom captions
 */
const parseUnstructuredTranscript = (rawText) => {
    // Split by paragraphs (double newlines or single newlines)
    const paragraphs = rawText
        .split(/\n\s*\n|\n/)
        .map(p => p.trim())
        .filter(p => {
            // Filter out noise/very short fragments and metadata
            if (!p) return false;
            if (p.length < 3) return false;
            // Skip common transcript metadata lines
            if (p.toLowerCase().startsWith('[auto-generated')) return false;
            if (p.toLowerCase().startsWith('webvtt')) return false;
            return true;
        });

    const entries = paragraphs.map((text, index) => ({
        id: index + 1,
        startTime: null,
        endTime: null,
        speaker: 'Unknown',
        text: text
    }));

    return {
        entries,
        hasTimestamps: false,
        hasSpeakerLabels: false
    };
};
