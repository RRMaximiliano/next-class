const EXCLUDED_PHRASES = new Set([
  'new york',
  'united states',
  'south america',
  'north america',
  'latin america',
  'middle east',
  'south asia',
  'east asia',
  'european union',
  'united kingdom',
  'united arab emirates',
  'new zealand',
  'south korea',
  'north korea',
  'saudi arabia',
  'costa rica',
  'south africa',
  'world bank',
  'united nations',
  'international monetary',
  'african union',
  'european commission',
  'world health',
  'world trade',
  'harvard university',
  'harvard kennedy',
  'kennedy school',
  'next class',
  'good morning',
  'good afternoon',
  'good evening',
  'thank you',
  'burkina faso',
  'prime minister',
  'secretary general',
  'public health',
  'public policy',
  'social security',
  'social media',
  'human rights',
  'civil society',
  'state department',
  'foreign policy',
]);

const EXCLUDED_WORDS = new Set([
  'i', 'a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'our', 'your', 'their',
  'he', 'she', 'we', 'you', 'they', 'it', 'me', 'him', 'her', 'us', 'them',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might',
  'and', 'but', 'or', 'nor', 'so', 'yet',
  'on', 'in', 'at', 'from', 'to', 'for', 'with', 'without', 'about', 'into',
  'onto', 'of', 'as', 'by', 'if', 'then', 'because', 'while', 'though',
  'although', 'since', 'once', 'before', 'after', 'during',
  "i'm", "i've", "i'll", "i'd", "we're", "we've", "we'll", "we'd",
  "you're", "you've", "you'll", "you'd", "they're", "they've", "they'll",
  "he'll", "she'll", "it'll", "let's", "here's", "there's", "that's", "it's",
  'said', 'asked', 'mentioned', 'replied', 'noted', 'explained', 'told', 'suggested',
  'added', 'stated', 'argued', 'responded', 'answered', 'raised', 'continued', 'shared',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
  'america', 'europe', 'africa', 'asia', 'australia', 'antarctica',
  'english', 'spanish', 'french', 'german', 'chinese', 'japanese', 'arabic',
  'portuguese', 'russian', 'hindi', 'swahili', 'korean', 'italian', 'dutch',
  'afghanistan', 'albania', 'algeria', 'argentina', 'austria', 'bangladesh',
  'belgium', 'brazil', 'canada', 'chile', 'china', 'colombia', 'denmark',
  'egypt', 'ethiopia', 'finland', 'france', 'germany', 'ghana', 'greece',
  'india', 'indonesia', 'iran', 'iraq', 'ireland', 'israel', 'italy',
  'japan', 'jordan', 'kenya', 'kuwait', 'lebanon', 'malaysia', 'mexico',
  'netherlands', 'nigeria', 'norway', 'pakistan', 'peru', 'philippines',
  'poland', 'portugal', 'romania', 'russia', 'singapore', 'spain', 'sweden',
  'switzerland', 'thailand', 'turkey', 'ukraine', 'vietnam',
  'harvard', 'stanford', 'yale', 'oxford', 'cambridge', 'princeton', 'mit',
  'mr', 'ms', 'mrs', 'mx', 'dr', 'prof', 'professor', 'doctor', 'minister',
  'director', 'president', 'chancellor', 'mister', 'madam', 'chair', 'dean',
  'secretary', 'instructor', 'teacher',
  'student', 'students', 'speaker', 'participant', 'moderator', 'unknown',
  'university', 'college', 'school', 'institute', 'department', 'foundation',
  'government', 'international', 'national', 'global', 'federal', 'regional',
  'local', 'municipal', 'american', 'european', 'african', 'asian', 'western',
  'eastern', 'southern', 'northern', 'central', 'new', 'old', 'first', 'second',
  'third', 'last', 'next', 'same', 'other', 'general', 'special', 'annual',
  'official', 'public', 'private', 'social', 'thank', 'thanks', 'cheers', 'sorry', 'please',
  'hi', 'hey', 'hello', 'okay', 'right', 'yeah', 'yes', 'no', 'well', 'now', 'just',
  'also', 'even', 'still', 'already', 'always', 'never', 'here', 'there',
  'where', 'when', 'what', 'which', 'who', 'how', 'why',
  'uh', 'um', 'oh', 'ah', 'huh',
  'all', 'good', 'go', 'not', 'any', 'big', 'come', 'know', 'really', 'tell',
  'problem', 'problems', 'great', 'put', 'test', 'thought', 'let',
  'excellent', 'morning', 'ready',
]);

const TITLES = ['Mr', 'Ms', 'Mrs', 'Mx', 'Dr', 'Prof', 'Professor', 'Doctor'];
const GREETINGS = ['Hi', 'Hello', 'Hey', 'Thanks', 'Thank you', 'Cheers'];

const NAME_TOKEN = String.raw`[\p{L}\p{M}]+(?:['\u2019.-][\p{L}\p{M}]+)*`;
const NAME_SPAN = String.raw`${NAME_TOKEN}(?:[ \t]+${NAME_TOKEN}){0,2}`;
const WORD_BOUNDARY_CHARS = String.raw`\p{L}\p{M}\p{N}'\u2019-`;
const LATIN_TOKEN_RE = /^[\p{Script=Latin}\p{M}'\u2019.-]+$/u;

const SOURCE_PRIORITIES = {
  manual: 0,
  'roster-exact': 1,
  title: 2,
  speaker: 3,
  'self-identification': 4,
  'full-name': 5,
  'roster-part': 6,
  'roster-fuzzy': 7,
  'in-context': 8,
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeLookup = (value) => value
  .replace(/\u2019/g, "'")
  .normalize('NFKD')
  .replace(/\p{M}+/gu, '')
  .toLowerCase();

export const normalizeDetectedName = (name) => name
  .trim()
  .replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}'\u2019.-]+$/gu, '')
  .replace(/\s+/g, ' ')
  .replace(/['\u2019]s$/iu, '');

const splitWords = (name) => normalizeDetectedName(name).split(/\s+/).filter(Boolean);

const hasLetters = (value) => /\p{L}/u.test(value);
const hasDigits = (value) => /\d/u.test(value);
const startsWithUppercase = (value) => /^\p{Lu}/u.test(value);
const isLatinToken = (value) => LATIN_TOKEN_RE.test(value);

const isExcludedWord = (word) => EXCLUDED_WORDS.has(normalizeLookup(word));

const isLikelyNameToken = (word, source) => {
  const cleaned = normalizeDetectedName(word);
  if (!cleaned || !hasLetters(cleaned) || hasDigits(cleaned)) return false;
  if (isExcludedWord(cleaned)) return false;

  if (isLatinToken(cleaned)) {
    if (cleaned.length < 2) return false;
    const compoundParts = cleaned.split(/['\u2019.-]/).filter(Boolean);
    if (compoundParts.length > 1) {
      const hasLowercaseCompoundPart = compoundParts.slice(1).some(part => !startsWithUppercase(part));
      if (hasLowercaseCompoundPart && !['manual', 'roster-exact', 'roster-part'].includes(source)) return false;
    }
    if (['speaker', 'title', 'manual', 'roster-exact', 'roster-part'].includes(source)) return true;
    return startsWithUppercase(cleaned);
  }

  return true;
};

const isValidName = (name, source) => {
  const normalized = normalizeDetectedName(name);
  if (!normalized || normalized.length < 2 || normalized.length > 60) return false;
  if (EXCLUDED_PHRASES.has(normalizeLookup(normalized))) return false;

  const words = splitWords(normalized);
  if (words.length === 0 || words.length > 3) return false;
  if (words.length > 1 && words.every(word => normalizeLookup(word) === normalizeLookup(words[0]))) return false;
  if (words.some(word => !isLikelyNameToken(word, source))) return false;

  if (source === 'full-name' && words.length < 2) return false;
  if (source === 'in-context' && words.length === 1 && isLatinToken(words[0]) && !startsWithUppercase(words[0])) return false;

  if (words.length > 1) {
    const latinWords = words.filter(isLatinToken);
    if (latinWords.length > 0 && latinWords.every(word => !startsWithUppercase(word))) return false;
  }

  return true;
};

const resolveValidName = (rawName, source) => {
  const normalized = normalizeDetectedName(rawName);
  if (isValidName(normalized, source)) return normalized;

  const words = splitWords(normalized);
  for (let length = Math.min(words.length, 3); length > 0; length -= 1) {
    const candidate = words.slice(0, length).join(' ');
    if (isValidName(candidate, source)) return candidate;
  }

  return '';
};

const createDetection = (name) => ({
  name,
  score: 0,
  sources: new Set(),
});

const addDetection = (detections, rawName, source, score) => {
  const name = resolveValidName(rawName, source);
  if (!name) return;

  const key = normalizeLookup(name);
  if (!detections.has(key)) {
    detections.set(key, createDetection(name));
  }

  const detection = detections.get(key);
  detection.name = detection.name.length >= name.length ? detection.name : name;
  detection.score += detection.sources.has(source) ? Math.max(4, Math.round(score / 4)) : score;
  detection.sources.add(source);
};

const countBoundedMatches = (text, searchValue) => {
  if (!text || !searchValue) return 0;
  const pattern = new RegExp(
    String.raw`(^|[^${WORD_BOUNDARY_CHARS}])(${escapeRegExp(searchValue)})(?=$|[^${WORD_BOUNDARY_CHARS}])`,
    'gu'
  );
  return [...text.matchAll(pattern)].length;
};

const addPatternMatches = (detections, text, pattern, source, score) => {
  let match;
  while ((match = pattern.exec(text)) !== null) {
    addDetection(detections, match[1], source, score);
  }
};

const addOccurrenceBoosts = (detections, shadowText) => {
  for (const detection of detections.values()) {
    const strongEvidence = [...detection.sources].some(source =>
      source === 'speaker' ||
      source === 'title' ||
      source === 'self-identification' ||
      source === 'full-name' ||
      source === 'roster-exact' ||
      source === 'roster-part'
    );
    if (!strongEvidence) continue;

    const count = countBoundedMatches(shadowText, normalizeLookup(detection.name));
    if (count >= 2) {
      addDetection(detections, detection.name, `repeated-${count}x`, Math.min(20, 8 + (count * 2)));
    }
  }
};

const limitedEditDistance = (a, b, maxDistance) => {
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    let minInRow = current[0];

    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost
      );
      minInRow = Math.min(minInRow, current[j]);
    }

    if (minInRow > maxDistance) return maxDistance + 1;

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
};

const isConservativeRosterFuzzyMatch = (candidate, rosterToken) => {
  if (!candidate || !rosterToken) return false;
  if (candidate === rosterToken) return true;
  if (candidate[0] !== rosterToken[0]) return false;
  if (candidate.length < 4 || rosterToken.length < 4) return false;

  const maxDistance = Math.max(candidate.length, rosterToken.length) >= 5 ? 2 : 1;
  const distance = limitedEditDistance(candidate, rosterToken, maxDistance);
  if (distance > maxDistance) return false;

  const sharedPrefixLength = [...candidate].findIndex((char, index) => char !== rosterToken[index]);
  const prefixLength = sharedPrefixLength === -1 ? Math.min(candidate.length, rosterToken.length) : sharedPrefixLength;
  return prefixLength >= 2;
};

const scoreBucket = (detection) => {
  if (detection.sources.has('manual') || detection.sources.has('roster-exact')) return 'likely';
  if (detection.sources.has('title') || detection.sources.has('speaker')) return 'likely';
  if (detection.score >= 80) return 'likely';
  if (detection.score >= 52) return 'review';
  return 'optional';
};

const sortSources = (sources) => [...sources].sort((a, b) => {
  const priorityA = SOURCE_PRIORITIES[a] ?? 99;
  const priorityB = SOURCE_PRIORITIES[b] ?? 99;
  return priorityA - priorityB || a.localeCompare(b);
});

const parseDelimitedLine = (line, delimiter) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values.map(value => value.replace(/^["']|["']$/g, '').trim());
};

const normalizeHeader = (value) => normalizeLookup(value).replace(/[^a-z0-9]+/g, ' ').trim();

const findHeaderIndex = (headers, matchers) => {
  for (let i = 0; i < headers.length; i += 1) {
    if (matchers.some(matcher => matcher(headers[i]))) return i;
  }
  return -1;
};

const addRosterCandidate = (names, rawName) => {
  const normalized = normalizeDetectedName(rawName);
  if (!normalized || !isValidName(normalized, 'roster-exact')) return;
  names.push(normalized);
};

const addRosterVariants = (names, { first = '', nickname = '', last = '', full = '' }) => {
  const uniquePreferred = [...new Set([first, nickname].map(normalizeDetectedName).filter(Boolean))];
  const normalizedLast = normalizeDetectedName(last);
  const normalizedFull = normalizeDetectedName(full);

  if (normalizedFull) addRosterCandidate(names, normalizedFull);

  uniquePreferred.forEach((preferred) => {
    addRosterCandidate(names, preferred);
    if (normalizedLast) addRosterCandidate(names, `${preferred} ${normalizedLast}`);
  });

  if (!uniquePreferred.length && normalizedLast) addRosterCandidate(names, normalizedLast);
};

const createRosterStudent = ({ first = '', nickname = '', last = '', full = '' }) => {
  const normalizedFirst = normalizeDetectedName(first);
  const normalizedNickname = normalizeDetectedName(nickname);
  const normalizedLast = normalizeDetectedName(last);
  const normalizedFull = normalizeDetectedName(full);
  const preferredNames = [...new Set([normalizedFirst, normalizedNickname].filter(Boolean))];

  const studentKey = [
    normalizedFull,
    ...preferredNames,
    normalizedLast,
  ].filter(Boolean).join('|').toLowerCase();

  if (!studentKey) return null;

  return {
    key: studentKey,
    first: normalizedFirst,
    nickname: normalizedNickname,
    last: normalizedLast,
    full: normalizedFull,
    preferredNames,
  };
};

const createRosterResult = (students, variants) => {
  const uniqueStudents = [];
  const seenStudents = new Set();

  students.forEach((student) => {
    if (!student || seenStudents.has(student.key)) return;
    seenStudents.add(student.key);
    uniqueStudents.push(student);
  });

  const uniqueVariants = [...new Set(variants.map(normalizeDetectedName).filter(Boolean))];

  return {
    students: uniqueStudents,
    variants: uniqueVariants,
    studentCount: uniqueStudents.length,
  };
};

export const parseRoster = (text) => {
  const names = [];
  const students = [];
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return createRosterResult([], []);

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const rows = lines.map(line => parseDelimitedLine(line.replace(/^[\uFEFF]+/, ''), delimiter));
  const headers = rows[0].map(normalizeHeader);

  const firstIndex = findHeaderIndex(headers, [
    header => header.includes('first name'),
    header => header === 'first',
    header => header === 'student first name',
  ]);
  const nicknameIndex = findHeaderIndex(headers, [
    header => header.includes('nickname'),
    header => header.includes('preferred name'),
    header => header.includes('preferred first'),
  ]);
  const lastIndex = findHeaderIndex(headers, [
    header => header.includes('last name'),
    header => header === 'last',
    header => header === 'surname',
    header => header === 'family name',
  ]);
  const fullNameIndex = findHeaderIndex(headers, [
    header => header.includes('full name'),
    header => header === 'name',
    header => header === 'student name',
  ]);

  const hasStructuredHeader = [firstIndex, nicknameIndex, lastIndex, fullNameIndex].some(index => index >= 0);

  if (hasStructuredHeader) {
    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const student = createRosterStudent({
        first: firstIndex >= 0 ? row[firstIndex] : '',
        nickname: nicknameIndex >= 0 ? row[nicknameIndex] : '',
        last: lastIndex >= 0 ? row[lastIndex] : '',
        full: fullNameIndex >= 0 ? row[fullNameIndex] : '',
      });

      if (!student) continue;
      students.push(student);
      addRosterVariants(names, student);
    }

    return createRosterResult(students, names);
  }

  const headerPattern = /^(first|last|name|student|full|email|id|#)/i;
  const startIndex = headerPattern.test(lines[0]) ? 1 : 0;

  const looksLikeRosterToken = (value) => {
    const normalized = normalizeDetectedName(value);
    return normalized && !hasDigits(normalized) && hasLetters(normalized) && normalized.length <= 40;
  };

  for (let i = startIndex; i < lines.length; i += 1) {
    let line = lines[i].replace(/^[\d#]+[.)]\s*/, '').trim();
    line = line.replace(/^["']|["']$/g, '').trim();

    const parts = line.includes('\t')
      ? line.split('\t').map(part => part.trim().replace(/^["']|["']$/g, ''))
      : line.split(',').map(part => part.trim().replace(/^["']|["']$/g, ''));

    if (parts.length === 1) {
      const normalized = normalizeDetectedName(parts[0]);
      if (isValidName(normalized, 'roster-exact')) {
        names.push(normalized);
        students.push(createRosterStudent({ full: normalized }));
      }
      continue;
    }

    const [first, second] = parts;
    if (looksLikeRosterToken(first) && looksLikeRosterToken(second)) {
      const student = createRosterStudent({ first: second, last: first });
      if (student) {
        students.push(student);
        addRosterVariants(names, student);
      }
      continue;
    }

    parts.forEach((part) => {
      const normalized = normalizeDetectedName(part);
      if (!isValidName(normalized, 'roster-exact')) return;
      names.push(normalized);
      students.push(createRosterStudent({ full: normalized }));
    });
  }

  return createRosterResult(students, names);
};

export const isRepeatOnlyDetection = (detection) =>
  detection.sources.length > 0 && detection.sources.every(source => source.startsWith('repeated-'));

export const detectNames = (text, rosterNames = [], options = {}) => {
  if (!text) return [];

  const detections = new Map();
  const titles = TITLES.join('|');
  const greetings = GREETINGS.map(escapeRegExp).join('|');
  const shadowText = normalizeLookup(text);

  addPatternMatches(
    detections,
    text,
    new RegExp(
      String.raw`(?:^|[^\p{L}\p{M}])(?:${titles})[.]?[ \t]+(${NAME_SPAN})(?=$|[^\p{L}\p{M}])`,
      'giu'
    ),
    'title',
    90
  );

  addPatternMatches(
    detections,
    text,
    new RegExp(String.raw`^\s*(${NAME_SPAN})[ \t]*:`, 'gmu'),
    'speaker',
    84
  );

  addPatternMatches(
    detections,
    text,
    new RegExp(String.raw`(?:^|[^\p{L}\p{M}])(${NAME_TOKEN}(?:[ \t]+${NAME_TOKEN}){1,2})(?=$|[^\p{L}\p{M}])`, 'gu'),
    'full-name',
    56
  );

  addPatternMatches(
    detections,
    text,
    new RegExp(String.raw`\b(?:thanks|thank you|sorry|welcome)\s+(${NAME_SPAN})(?=$|[^\p{L}\p{M}])`, 'giu'),
    'in-context',
    26
  );

  addPatternMatches(
    detections,
    text,
    new RegExp(String.raw`^\s*(${NAME_TOKEN})[.?!]\s+(?:(?:uh|um|yeah|yes|no|okay|all right|go ahead|good question|actually|i mean|sorry|thank|thanks|so)\b)`, 'gimu'),
    'in-context',
    52
  );

  addPatternMatches(
    detections,
    text,
    new RegExp(String.raw`\b(${NAME_TOKEN}),\s+(?:(?:are|did|do|can|could|would|will|what|why|when|where|who|how|i)\b)`, 'giu'),
    'in-context',
    52
  );

  addPatternMatches(
    detections,
    text,
    new RegExp(String.raw`(?:^|\n|\?)\s*(${NAME_TOKEN})[.?!](?=\s|$)`, 'gmu'),
    'in-context',
    30
  );

  addPatternMatches(
    detections,
    text,
    new RegExp(String.raw`\b(?:${greetings})\s+(${NAME_SPAN})(?=$|[^\p{L}\p{M}])`, 'giu'),
    'in-context',
    24
  );

  addPatternMatches(
    detections,
    text,
    new RegExp(String.raw`(?:^|[.!?]\s+|\n)\s*(?:my name is|i am|i['\u2019]m)\s+(${NAME_SPAN})(?=$|[^\p{L}\p{M}])`, 'giu'),
    'self-identification',
    64
  );

  addPatternMatches(
    detections,
    text,
    new RegExp(
      String.raw`(?:^|[^\p{L}\p{M}])(${NAME_SPAN})[,.]\s+(?:(?:uh|um)\b|i\b|we\b|are\b|is\b|do\b|did\b|can\b|could\b|would\b|so\b|actually|just|please|sorry|okay|right)`,
      'giu'
    ),
    'in-context',
    26
  );

  let pairMatch;
  const pairPattern = new RegExp(String.raw`\b(${NAME_TOKEN})\s+(?:and|&)\s+(${NAME_TOKEN})\b`, 'gu');
  while ((pairMatch = pairPattern.exec(text)) !== null) {
    const first = resolveValidName(pairMatch[1], 'in-context');
    const second = resolveValidName(pairMatch[2], 'in-context');
    if (!first || !second) continue;
    addDetection(detections, first, 'in-context', 56);
    addDetection(detections, second, 'in-context', 56);
  }

  if (options.mode === 'deep') {
    addPatternMatches(
      detections,
      text,
      new RegExp(
        String.raw`\b(?:question from|comment from|hearing from|called on|asked by|prompted by)\s+(${NAME_SPAN})(?=$|[^\p{L}\p{M}])`,
        'giu'
      ),
      'in-context',
      30
    );

    addPatternMatches(
      detections,
      text,
      new RegExp(String.raw`\b(?:with|alongside)\s+(${NAME_SPAN})(?=$|[^\p{L}\p{M}])`, 'giu'),
      'in-context',
      18
    );
  }

  rosterNames.forEach((rosterName) => {
    const normalized = normalizeDetectedName(rosterName);
    if (!isValidName(normalized, 'roster-exact')) return;

    const foldedName = normalizeLookup(normalized);
    const exactMatches = countBoundedMatches(shadowText, foldedName);
    if (exactMatches > 0) {
      addDetection(detections, normalized, 'roster-exact', 110);
      return;
    }

    splitWords(normalized).forEach((part) => {
      if (part.length < 3 || !isLikelyNameToken(part, 'roster-part')) return;
      const partMatches = countBoundedMatches(shadowText, normalizeLookup(part));
      if (partMatches > 0) addDetection(detections, part, 'roster-part', 34);
    });
  });

  const rosterTokens = [...new Set(
    rosterNames
      .flatMap(name => splitWords(name))
      .map(normalizeLookup)
      .filter(token => token.length >= 4)
  )];

  for (const detection of detections.values()) {
    const words = splitWords(detection.name);
    if (words.length !== 1) continue;
    if (detection.sources.has('roster-exact') || detection.sources.has('roster-part')) continue;

    const normalizedWord = normalizeLookup(words[0]);
    const fuzzyMatch = rosterTokens.find(token => isConservativeRosterFuzzyMatch(normalizedWord, token));
    if (fuzzyMatch && !detection.sources.has('roster-fuzzy')) {
      detection.sources.add('roster-fuzzy');
      detection.score += 42;
    }
  }

  addOccurrenceBoosts(detections, shadowText);

  return [...detections.values()]
    .map((detection) => ({
      name: detection.name,
      score: detection.score,
      bucket: scoreBucket(detection),
      sources: sortSources(detection.sources),
    }))
    .sort((a, b) => {
      const bucketOrder = { likely: 0, review: 1, optional: 2 };
      return bucketOrder[a.bucket] - bucketOrder[b.bucket] || b.score - a.score || a.name.localeCompare(b.name);
    });
};

export const detectOtherCapitalizedWords = () => [];

const createReplacementMap = (selectedNames) => {
  const uniqueNames = [...new Set(selectedNames.map(normalizeDetectedName).filter(Boolean))];
  const fullNames = uniqueNames.filter(name => name.includes(' ')).sort((a, b) => a.localeCompare(b));
  const singleNames = uniqueNames.filter(name => !name.includes(' ')).sort((a, b) => a.localeCompare(b));
  const orderedNames = [...fullNames, ...singleNames];
  const replacements = new Map();
  let studentIndex = 1;

  orderedNames.forEach((name) => {
    const lower = normalizeLookup(name);
    if (replacements.has(lower)) return;

    if (!name.includes(' ')) {
      const matchingFullName = fullNames.find(fullName =>
        splitWords(fullName).some(part => normalizeLookup(part) === lower)
      );
      if (matchingFullName && replacements.has(normalizeLookup(matchingFullName))) {
        replacements.set(lower, replacements.get(normalizeLookup(matchingFullName)));
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
  const names = [...new Set(selectedNames.map(normalizeDetectedName).filter(Boolean))]
    .sort((a, b) => b.length - a.length);
  if (names.length === 0) return { text, replacements: [] };

  const pattern = new RegExp(
    String.raw`(^|[^${WORD_BOUNDARY_CHARS}])(${names.map(escapeRegExp).join('|')})(?=$|[^${WORD_BOUNDARY_CHARS}])`,
    'giu'
  );

  const anonymizedText = text.replace(pattern, (match, prefix, name) => {
    const replacement = replacements.get(normalizeLookup(name));
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
