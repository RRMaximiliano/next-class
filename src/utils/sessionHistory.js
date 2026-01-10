/**
 * Session History Storage Utility
 * Manages session data persistence in localStorage
 */

const STORAGE_KEY = 'class_anatomy_sessions';

/**
 * Generate a unique session ID
 */
const generateId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Get all saved sessions from localStorage
 * @returns {Array} Array of session objects
 */
export const getSessions = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
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
  }
  return session;
};

/**
 * Clear all sessions (for testing)
 */
export const clearAllSessions = () => {
  localStorage.removeItem(STORAGE_KEY);
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
    return session;
  }
  return null;
};
