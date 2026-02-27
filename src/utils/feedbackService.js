import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';

/**
 * Submit feedback to Firestore.
 * Fires and forgets — errors are logged but don't block the UI.
 *
 * @param {Object} params
 * @param {string} params.sessionId - Local session ID
 * @param {'1'|'2'} params.level - Feedback level
 * @param {'positive'|'negative'} params.rating
 * @param {string|null} params.comment - Optional comment (thumbs down only)
 * @param {string|null} params.focusArea - Focus area ID (Level 2 only)
 */
export const submitFeedback = async ({ sessionId, level, rating, comment, focusArea }) => {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, 'feedback'), {
      userId: user?.uid || 'anonymous',
      sessionId: sessionId || null,
      level,
      rating,
      comment: comment || null,
      focusArea: focusArea || null,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Don't block the user — just log
    console.error('Failed to submit feedback to Firestore:', err);
  }
};
