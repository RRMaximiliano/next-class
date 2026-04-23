const EXCLUDED_PHRASES = new Set([
  'New York',
  'United States',
  'South America',
  'North America',
  'Latin America',
  'Middle East',
  'South Asia',
  'East Asia',
  'European Union',
  'United Kingdom',
  'United Arab Emirates',
  'New Zealand',
  'South Korea',
  'North Korea',
  'Saudi Arabia',
  'Costa Rica',
  'South Africa',
  'World Bank',
  'United Nations',
  'International Monetary',
  'African Union',
  'European Commission',
  'World Health',
  'World Trade',
  'Harvard University',
  'Harvard Kennedy',
  'Kennedy School',
  'Next Class',
  'Good Morning',
  'Good Afternoon',
  'Good Evening',
  'Thank You',
  'Prime Minister',
  'Secretary General',
  'Public Health',
  'Public Policy',
  'Social Security',
  'Social Media',
  'Human Rights',
  'Civil Society',
  'State Department',
  'Foreign Policy',
]);

const EXCLUDED_WORDS = new Set([
  'I', 'A', 'An', 'The', 'This', 'That', 'These', 'Those', 'My', 'Our', 'Your', 'Their',
  'He', 'She', 'We', 'You', 'They', 'It', 'Me', 'Him', 'Her', 'Us', 'Them',
  'Is', 'Are', 'Was', 'Were', 'Be', 'Been', 'Being', 'Have', 'Has', 'Had',
  'Do', 'Does', 'Did', 'Will', 'Would', 'Should', 'Could', 'Can', 'May', 'Might',
  'And', 'But', 'Or', 'Nor', 'So', 'Yet',
  'On', 'In', 'At', 'From', 'To', 'For', 'With', 'Without', 'About', 'Into',
  'Onto', 'Of', 'As', 'By', 'If', 'Then', 'Because', 'While', 'Though',
  'Although', 'Since', 'Once', 'Before', 'After', 'During',
  "I'm", "I've", "I'll", "I'd", "We're", "We've", "We'll", "We'd",
  "You're", "You've", "You'll", "You'd", "They're", "They've", "They'll",
  "He'll", "She'll", "It'll", "Let's", "Here's", "There's", "That's", "It's",
  'Said', 'Asked', 'Mentioned', 'Replied', 'Noted', 'Explained', 'Told', 'Suggested',
  'Added', 'Stated', 'Argued', 'Responded', 'Answered', 'Raised',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
  'America', 'Europe', 'Africa', 'Asia', 'Australia', 'Antarctica',
  'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic',
  'Portuguese', 'Russian', 'Hindi', 'Swahili', 'Korean', 'Italian', 'Dutch',
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Austria', 'Bangladesh',
  'Belgium', 'Brazil', 'Canada', 'Chile', 'China', 'Colombia', 'Denmark',
  'Egypt', 'Ethiopia', 'Finland', 'France', 'Germany', 'Ghana', 'Greece',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Japan', 'Jordan', 'Kenya', 'Kuwait', 'Lebanon', 'Malaysia', 'Mexico',
  'Netherlands', 'Nigeria', 'Norway', 'Pakistan', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Romania', 'Russia', 'Singapore', 'Spain', 'Sweden',
  'Switzerland', 'Thailand', 'Turkey', 'Ukraine', 'Vietnam',
  'Harvard', 'Stanford', 'Yale', 'Oxford', 'Cambridge', 'Princeton', 'MIT',
  'Mr', 'Ms', 'Mrs', 'Mx', 'Dr', 'Prof', 'Professor', 'Doctor', 'Minister',
  'Director', 'President', 'Chancellor', 'Mister', 'Madam', 'Chair', 'Dean',
  'Secretary', 'Instructor', 'Teacher',
  'Student', 'Students', 'Speaker', 'Participant', 'Moderator', 'Unknown',
  'University', 'College', 'School', 'Institute', 'Department', 'Foundation',
  'Government', 'International', 'National', 'Global', 'Federal', 'Regional',
  'Local', 'Municipal', 'American', 'European', 'African', 'Asian', 'Western',
  'Eastern', 'Southern', 'Northern', 'Central', 'New', 'Old', 'First', 'Second',
  'Third', 'Last', 'Next', 'Same', 'Other', 'General', 'Special', 'Annual',
  'Official', 'Public', 'Private', 'Social', 'Thank', 'Thanks', 'Cheers', 'Sorry', 'Please',
  'Hi', 'Hey', 'Hello', 'Okay', 'Right', 'Yeah', 'Yes', 'No', 'Well', 'Now', 'Just',
  'Also', 'Even', 'Still', 'Already', 'Always', 'Never', 'Here', 'There',
  'Where', 'When', 'What', 'Which', 'Who', 'How', 'Why',
]);

const NAME_CHAR = String.raw`[\p{L}'\u2019-]`;
const NAME_WORD = String.raw`\p{Lu}${NAME_CHAR}{1,}`;
const WORD_BOUNDARY_CHARS = String.raw`\p{L}\p{N}'\u2019-`;

const normalizeName = (name) =>
  name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/['\u2019]s$/i, '');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeLookupWord = (word) => word.replace(/\u2019/g, "'");

const isExcludedWord = (word) => EXCLUDED_WORDS.has(normalizeLookupWord(word));

const isValidName = (name) => {
  const normalized = normalizeName(name);
  if (!normalized || normalized.length < 2) return false;
  if (EXCLUDED_PHRASES.has(normalized)) return false;

  const words = normalized.split(/\s+/);
  if (words.some(isExcludedWord)) return false;
  if (words.length > 1 && words.every(word => word.toLowerCase() === words[0].toLowerCase())) return false;
  if (words.length === 1 && normalized === normalized.toUpperCase() && normalized.length <= 4) return false;
  if (!/^\p{Lu}/u.test(normalized)) return false;
  return true;
};

const addDetection = (detections, rawName, source) => {
  const name = normalizeName(rawName);
  if (!isValidName(name)) return;

  const key = name.toLowerCase();
  if (!detections.has(key)) {
    detections.set(key, { name, sources: new Set() });
  }
  detections.get(key).sources.add(source);
};

export const parseRoster = (text) => {
  const names = [];
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const headerPattern = /^(first|last|name|student|full|email|id|#)/i;
  const startIndex = headerPattern.test(lines[0]) ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    let line = lines[i].replace(/^[\d#]+[.)]\s*/, '').trim();
    line = line.replace(/^["']|["']$/g, '').trim();

    const parts = line.includes('\t')
      ? line.split('\t').map(part => part.trim().replace(/^["']|["']$/g, ''))
      : line.split(',').map(part => part.trim().replace(/^["']|["']$/g, ''));

    if (parts.length === 1) {
      if (isValidName(parts[0])) names.push(normalizeName(parts[0]));
      continue;
    }

    const [first, second] = parts;
    const looksLikeSingleName = (value) => !/\s/.test(value) && /^\p{Lu}/u.test(value) && !/\d/.test(value);
    if (looksLikeSingleName(first) && looksLikeSingleName(second)) {
      names.push(normalizeName(`${second} ${first}`));
      continue;
    }

    parts.forEach(part => {
      if (isValidName(part)) names.push(normalizeName(part));
    });
  }

  return [...new Set(names)];
};

export const isRepeatOnlyDetection = (detection) =>
  detection.sources.length > 0 && detection.sources.every(source => source.startsWith('repeated-'));

export const detectNames = (text, rosterNames = []) => {
  const detections = new Map();
  let match;

  const titlePattern = new RegExp(
    String.raw`\b(?:Mr|Ms|Mrs|Mx|Dr|Prof|Professor|Doctor)[.]?[ \t]+(${NAME_WORD}(?:[ \t]+${NAME_WORD}){0,2})\b`,
    'gu'
  );
  while ((match = titlePattern.exec(text)) !== null) {
    addDetection(detections, match[1], 'title');
  }

  const fullNamePattern = new RegExp(String.raw`\b(${NAME_WORD}(?:[ \t]+${NAME_WORD})+)\b`, 'gu');
  while ((match = fullNamePattern.exec(text)) !== null) {
    addDetection(detections, match[1], 'full-name');
  }

  const speakerPattern = new RegExp(String.raw`^(${NAME_WORD}(?:\s+${NAME_WORD}){0,2})[ \t]*:`, 'gmu');
  while ((match = speakerPattern.exec(text)) !== null) {
    addDetection(detections, match[1], 'speaker');
  }

  const verbs = '(?:said|asked|mentioned|replied|noted|explained|told|suggested|added|stated|argued|responded|answered|raised|pointed|wondered|continued|agreed|disagreed|clarified|confirmed|shared|presented|commented)';
  const verbNamePattern = new RegExp(String.raw`\b${verbs}\s+(${NAME_WORD})\b`, 'giu');
  while ((match = verbNamePattern.exec(text)) !== null) {
    addDetection(detections, match[1], 'in-context');
  }

  const nameVerbPattern = new RegExp(String.raw`\b(${NAME_WORD})\s+${verbs}\b`, 'giu');
  while ((match = nameVerbPattern.exec(text)) !== null) {
    addDetection(detections, match[1], 'in-context');
  }

  const directAddressPattern = new RegExp(
    String.raw`\b(${NAME_WORD})[,.]\s+(?:uh|um|I\b|we\b|are\b|is\b|do\b|did\b|can\b|could\b|would\b|so\b|actually|just|the\b|it\b|if\b|please|sorry|okay|right)`,
    'giu'
  );
  while ((match = directAddressPattern.exec(text)) !== null) {
    addDetection(detections, match[1], 'in-context');
  }

  const greetingPattern = new RegExp(String.raw`\b(?:Hi|Hello|Hey|Thanks|Thank you|Thank|Cheers)\s+(${NAME_WORD})\b`, 'gu');
  while ((match = greetingPattern.exec(text)) !== null) {
    addDetection(detections, match[1], 'in-context');
  }

  const possessivePattern = new RegExp(String.raw`\b(${NAME_WORD})['\u2019]s\b`, 'gu');
  while ((match = possessivePattern.exec(text)) !== null) {
    addDetection(detections, match[1], 'in-context');
  }

  const apostropheNamePattern = /\b(\p{Lu}[\p{L}]*['\u2019]\p{Lu}[\p{L}]+)\b/gu;
  while ((match = apostropheNamePattern.exec(text)) !== null) {
    addDetection(detections, match[1], 'full-name');
  }

  const singleCounts = new Map();
  const singleNamePattern = new RegExp(String.raw`\b(${NAME_WORD})\b`, 'gu');
  while ((match = singleNamePattern.exec(text)) !== null) {
    const name = normalizeName(match[1]);
    if (isValidName(name)) singleCounts.set(name, (singleCounts.get(name) || 0) + 1);
  }
  for (const [name, count] of singleCounts) {
    if (count >= 2) addDetection(detections, name, `repeated-${count}x`);
  }

  rosterNames.forEach(rosterName => {
    const name = normalizeName(rosterName);
    if (!isValidName(name)) return;

    const exactPattern = new RegExp(String.raw`(^|[^\p{L}\p{N}'\u2019-])(${escapeRegExp(name)})(?=$|[^\p{L}\p{N}'\u2019-])`, 'giu');
    const exactMatches = [...text.matchAll(exactPattern)];
    if (exactMatches.length > 0) {
      addDetection(detections, name, `roster-${exactMatches.length}x`);
      return;
    }

    name.split(/\s+/).forEach(part => {
      if (part.length < 4 || !isValidName(part)) return;
      const partPattern = new RegExp(String.raw`(^|[^\p{L}\p{N}'\u2019-])(${escapeRegExp(part)})(?=$|[^\p{L}\p{N}'\u2019-])`, 'iu');
      if (partPattern.test(text)) addDetection(detections, part, 'roster');
    });
  });

  const fullNames = [...detections.values()].filter(detection => detection.name.includes(' '));
  fullNames.forEach(({ name }) => {
    const firstName = name.split(/\s+/)[0];
    if (firstName.length >= 3) addDetection(detections, firstName, 'first-name');
  });

  const priority = (detection) => {
    if (detection.sources.some(source => source.startsWith('roster'))) return 0;
    if (detection.sources.includes('full-name')) return 1;
    if (detection.sources.includes('title')) return 2;
    if (detection.sources.includes('speaker')) return 3;
    if (detection.sources.includes('in-context')) return 4;
    return 5;
  };

  return [...detections.values()]
    .map(detection => ({ name: detection.name, sources: [...detection.sources] }))
    .sort((a, b) => priority(a) - priority(b) || a.name.localeCompare(b.name));
};

export const detectOtherCapitalizedWords = (text, detectedNames = []) => {
  const detected = new Set(detectedNames.map(name => name.toLowerCase()));
  const detectedParts = new Set();
  detectedNames.forEach(name => {
    name.split(/\s+/).forEach(part => detectedParts.add(part.toLowerCase()));
  });

  const words = new Map();
  const pattern = new RegExp(String.raw`\b(${NAME_WORD})\b`, 'gu');
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const word = normalizeName(match[1]);
    const lower = word.toLowerCase();
    if (!isValidName(word) || detected.has(lower) || detectedParts.has(lower)) continue;
    words.set(word, (words.get(word) || 0) + 1);
  }

  return [...words.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([word, count]) => ({ name: word, sources: [`capitalized-${count}x`] }));
};

const createReplacementMap = (selectedNames) => {
  const uniqueNames = [...new Set(selectedNames.map(normalizeName).filter(Boolean))];
  const fullNames = uniqueNames.filter(name => name.includes(' ')).sort((a, b) => a.localeCompare(b));
  const singleNames = uniqueNames.filter(name => !name.includes(' ')).sort((a, b) => a.localeCompare(b));
  const orderedNames = [...fullNames, ...singleNames];
  const replacements = new Map();
  let studentIndex = 1;

  orderedNames.forEach(name => {
    const lower = name.toLowerCase();
    if (replacements.has(lower)) return;

    if (!name.includes(' ')) {
      const matchingFullName = fullNames.find(fullName =>
        fullName.split(/\s+/).some(part => part.toLowerCase() === lower)
      );
      if (matchingFullName && replacements.has(matchingFullName.toLowerCase())) {
        replacements.set(lower, replacements.get(matchingFullName.toLowerCase()));
        return;
      }
    }

    replacements.set(lower, `Student ${studentIndex}`);
    studentIndex += 1;
  });

  return replacements;
};

export const anonymizeTranscript = (text, selectedNames) => {
  const replacements = createReplacementMap(selectedNames);
  const names = [...replacements.keys()].sort((a, b) => b.length - a.length);
  if (names.length === 0) return { text, replacements: [] };

  const pattern = new RegExp(
    String.raw`(^|[^${WORD_BOUNDARY_CHARS}])(${names.map(escapeRegExp).join('|')})(?=$|[^${WORD_BOUNDARY_CHARS}])`,
    'giu'
  );

  const anonymizedText = text.replace(pattern, (match, prefix, name) => {
    const replacement = replacements.get(normalizeName(name).toLowerCase());
    return replacement ? `${prefix}${replacement}` : match;
  });

  return {
    text: anonymizedText,
    replacements: [...replacements.entries()].map(([name, replacement]) => ({ name, replacement })),
  };
};

export const anonymizeFileName = (fileName, replacements) => {
  if (!fileName || replacements.length === 0) return fileName;

  let nextName = fileName;
  replacements.forEach(({ name, replacement }) => {
    nextName = nextName.replace(new RegExp(escapeRegExp(name), 'gi'), replacement);
  });

  return nextName.replace(/(\.[^.]+)?$/, (extension) => `_anonymized${extension || '.txt'}`);
};
