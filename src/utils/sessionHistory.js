/**
 * Session History Storage Utility
 * Manages session data persistence in localStorage
 */

const STORAGE_KEY = 'class_anatomy_sessions';

// In-memory cache to avoid repeated localStorage parsing
let sessionsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5000; // Cache valid for 5 seconds

/**
 * Generate a unique session ID
 */
const generateId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Invalidate the sessions cache
 */
const invalidateCache = () => {
  sessionsCache = null;
  cacheTimestamp = 0;
};

/**
 * Get all saved sessions from localStorage (with caching)
 * @param {boolean} forceRefresh - Force bypass cache
 * @returns {Array} Array of session objects
 */
export const getSessions = (forceRefresh = false) => {
  const now = Date.now();

  // Return cached data if valid
  if (!forceRefresh && sessionsCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return sessionsCache;
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    sessionsCache = data ? JSON.parse(data) : [];
    cacheTimestamp = now;
    return sessionsCache;
  } catch (e) {
    console.error('Error reading sessions:', e);
    return [];
  }
};

/**
 * Save a new session or update existing one
 * @param {Object} sessionData - Session data to save
 * @returns {Object} The saved session with ID
 */
export const saveSession = (sessionData) => {
  const sessions = getSessions();

  const session = {
    id: sessionData.id || generateId(),
    fileName: sessionData.fileName,
    date: sessionData.date || new Date().toISOString().split('T')[0],
    savedAt: new Date().toISOString(),
    // Key stats for progress tracking
    stats: {
      totalDuration: sessionData.stats?.totalDuration || 0,
      teacherTalkPercent: sessionData.stats?.teacherTalkPercent || 0,
      studentTalkPercent: sessionData.stats?.studentTalkPercent || 0,
      questionCount: sessionData.stats?.questionCount || 0,
      silencePercent: sessionData.stats?.silencePercent || 0,
      speakerCount: sessionData.stats?.speakerCount || 0,
    },
    // Session tags for organization
    tags: sessionData.tags || [],
    // Store raw transcript for re-analysis
    rawTranscript: sessionData.rawTranscript || '',
  };

  // Check if updating existing session
  const existingIndex = sessions.findIndex(s => s.id === session.id);
  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.push(session);
  }

  // Sort by date, newest first
  sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  invalidateCache();
  return session;
};

/**
 * Delete a session by ID
 * @param {string} sessionId - ID of session to delete
 * @returns {boolean} Success status
 */
export const deleteSession = (sessionId) => {
  const sessions = getSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  invalidateCache();
  return filtered.length < sessions.length;
};

/**
 * Get a single session by ID
 * @param {string} sessionId - ID of session to get
 * @returns {Object|null} Session object or null
 */
export const getSession = (sessionId) => {
  const sessions = getSessions();
  return sessions.find(s => s.id === sessionId) || null;
};

/**
 * Calculate averages across all sessions
 * @returns {Object} Average stats
 */
export const getAverages = () => {
  const sessions = getSessions();
  if (sessions.length === 0) {
    return null;
  }

  const totals = sessions.reduce((acc, s) => ({
    teacherTalkPercent: acc.teacherTalkPercent + (s.stats?.teacherTalkPercent || 0),
    studentTalkPercent: acc.studentTalkPercent + (s.stats?.studentTalkPercent || 0),
    questionCount: acc.questionCount + (s.stats?.questionCount || 0),
    silencePercent: acc.silencePercent + (s.stats?.silencePercent || 0),
  }), { teacherTalkPercent: 0, studentTalkPercent: 0, questionCount: 0, silencePercent: 0 });

  const count = sessions.length;
  return {
    teacherTalkPercent: Math.round(totals.teacherTalkPercent / count),
    studentTalkPercent: Math.round(totals.studentTalkPercent / count),
    questionCount: Math.round(totals.questionCount / count * 10) / 10,
    silencePercent: Math.round(totals.silencePercent / count),
    sessionCount: count,
  };
};

/**
 * Update session date
 * @param {string} sessionId - ID of session
 * @param {string} newDate - New date in YYYY-MM-DD format
 */
export const updateSessionDate = (sessionId, newDate) => {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (session) {
    session.date = newDate;
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    invalidateCache();
  }
  return session;
};

/**
 * Clear all sessions (for testing)
 */
export const clearAllSessions = () => {
  localStorage.removeItem(STORAGE_KEY);
  invalidateCache();
};

/**
 * Update session stats (e.g., when teacher selection changes)
 * @param {string} sessionId - ID of session to update
 * @param {Object} newStats - New stats object
 */
export const updateSessionStats = (sessionId, newStats) => {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (session) {
    session.stats = { ...session.stats, ...newStats };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    invalidateCache();
    return session;
  }
  return null;
};

/**
 * Save index card to a session (supports multiple cards per session)
 * @param {string} sessionId - ID of session to update
 * @param {Object} indexCard - Index card data (keep, try, say, watchFor, level, focusArea)
 */
export const saveIndexCard = (sessionId, indexCard) => {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (session) {
    // Initialize indexCards array if it doesn't exist
    if (!session.indexCards) {
      session.indexCards = [];
      // Migrate legacy single indexCard if exists
      if (session.indexCard) {
        session.indexCards.push(session.indexCard);
      }
    }

    const cardWithMeta = {
      ...indexCard,
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      savedAt: new Date().toISOString()
    };

    // Check if a card with same level+focusArea exists, replace it
    const existingIdx = session.indexCards.findIndex(c =>
      c.level === indexCard.level &&
      (c.focusArea || null) === (indexCard.focusArea || null)
    );

    if (existingIdx >= 0) {
      session.indexCards[existingIdx] = cardWithMeta;
    } else {
      session.indexCards.push(cardWithMeta);
    }

    // Also keep legacy indexCard for backwards compatibility (use most recent)
    session.indexCard = cardWithMeta;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    invalidateCache();
    return session;
  }
  return null;
};

/**
 * Get all index cards for a session
 * @param {string} sessionId - ID of session
 * @returns {Array} Array of index card data
 */
export const getIndexCards = (sessionId) => {
  const session = getSession(sessionId);
  if (!session) return [];

  // Return indexCards array, or wrap legacy single card in array
  if (session.indexCards && session.indexCards.length > 0) {
    return session.indexCards;
  }
  if (session.indexCard) {
    return [session.indexCard];
  }
  return [];
};

/**
 * Get index card for a session (legacy - returns first/most recent card)
 * @param {string} sessionId - ID of session
 * @returns {Object|null} Index card data or null
 */
export const getIndexCard = (sessionId) => {
  const cards = getIndexCards(sessionId);
  return cards.length > 0 ? cards[cards.length - 1] : null;
};

/**
 * Update session tags
 * @param {string} sessionId - ID of session to update
 * @param {Array} tags - New tags array
 * @returns {Object|null} Updated session or null
 */
export const updateSessionTags = (sessionId, tags) => {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (session) {
    session.tags = tags;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    invalidateCache();
    return session;
  }
  return null;
};

/**
 * Add a tag to a session
 * @param {string} sessionId - ID of session
 * @param {string} tag - Tag to add
 * @returns {Object|null} Updated session or null
 */
export const addSessionTag = (sessionId, tag) => {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (session) {
    if (!session.tags) session.tags = [];
    const normalizedTag = tag.trim().toLowerCase();
    if (!session.tags.includes(normalizedTag)) {
      session.tags.push(normalizedTag);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      invalidateCache();
    }
    return session;
  }
  return null;
};

/**
 * Remove a tag from a session
 * @param {string} sessionId - ID of session
 * @param {string} tag - Tag to remove
 * @returns {Object|null} Updated session or null
 */
export const removeSessionTag = (sessionId, tag) => {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (session && session.tags) {
    const normalizedTag = tag.trim().toLowerCase();
    session.tags = session.tags.filter(t => t !== normalizedTag);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    invalidateCache();
    return session;
  }
  return null;
};

/**
 * Get all unique tags across all sessions
 * @returns {Array} Array of unique tag strings
 */
export const getAllTags = () => {
  const sessions = getSessions();
  const tagSet = new Set();
  sessions.forEach(s => {
    (s.tags || []).forEach(tag => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
};

/**
 * Get sessions filtered by tag
 * @param {string} tag - Tag to filter by
 * @returns {Array} Filtered sessions
 */
export const getSessionsByTag = (tag) => {
  const sessions = getSessions();
  const normalizedTag = tag.trim().toLowerCase();
  return sessions.filter(s => (s.tags || []).includes(normalizedTag));
};

/**
 * Save an AI interaction to a session
 * @param {string} sessionId - ID of session
 * @param {string} type - 'level1' | 'level2' | 'coaching' | 'followUpL1' | 'followUpL2'
 * @param {*} data - The interaction data to save
 * @returns {Object|null} Updated session or null
 */
export const saveAiInteraction = (sessionId, type, data) => {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return null;

  if (!session.aiInteractions) {
    session.aiInteractions = {
      level1: null,
      level2: null,
      coaching: [],
      followUpL1: [],
      followUpL2: [],
    };
  }

  switch (type) {
    case 'level1':
      session.aiInteractions.level1 = data;
      break;
    case 'level2':
      session.aiInteractions.level2 = data;
      break;
    case 'coaching':
      session.aiInteractions.coaching = data;
      break;
    case 'followUpL1':
      session.aiInteractions.followUpL1 = data;
      break;
    case 'followUpL2':
      session.aiInteractions.followUpL2 = data;
      break;
    default:
      return null;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  invalidateCache();
  return session;
};

/**
 * Get AI interactions for a session
 * @param {string} sessionId - ID of session
 * @returns {Object|null} AI interactions object or null
 */
export const getAiInteractions = (sessionId) => {
  const session = getSession(sessionId);
  return session?.aiInteractions || null;
};
