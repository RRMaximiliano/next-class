import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { getSessions } from './sessionHistory';
import { DEFAULT_OPENAI_MODEL } from './openaiModels';

const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdN3UDuhXhPBrRfl07BT9mg2QCFkU68S7FKPTHuHvyvVCnAaw/formResponse';
const FORM_FIELDS = {
  userId: 'entry.281719206',
  sessionId: 'entry.637613466',
  level: 'entry.1796005896',
  focusArea: 'entry.535155046',
  rating: 'entry.1403174100',
  comment: 'entry.624161609',
  model: 'entry.17707694',
  fileName: 'entry.1176793986',
  transcriptLength: 'entry.1082055767',
  sessionCount: 'entry.1356799132',
};

/**
 * Submit feedback to Firestore and Google Sheets (via Google Form).
 * Both calls are fire-and-forget and run in parallel - neither blocks the other.
 *
 * @param {Object} params
 * @param {string} params.sessionId - Local session ID
 * @param {'1'|'2'} params.level - Feedback level
 * @param {'positive'|'negative'} params.rating
 * @param {string|null} params.comment - Optional comment
 * @param {string|null} params.focusArea - Focus area ID (Level 2 only)
 * @param {string|null} params.fileName - Transcript file name
 * @param {number|null} params.transcriptLength - Length of raw transcript
 */
export const submitFeedback = ({ sessionId, level, rating, comment, focusArea, fileName, transcriptLength }) => {
  const user = auth.currentUser;
  const model = localStorage.getItem('openai_model') || DEFAULT_OPENAI_MODEL;
  let sessionCount = 0;
  try { sessionCount = getSessions().length; } catch { /* ignore */ }

  const payload = {
    userId: user?.uid || 'anonymous',
    sessionId: sessionId || null,
    level,
    rating,
    comment: comment || null,
    focusArea: focusArea || null,
    model,
    fileName: fileName || null,
    transcriptLength: transcriptLength || null,
    sessionCount,
  };

  // Write to Firestore (fire-and-forget)
  addDoc(collection(db, 'feedback'), {
    ...payload,
    createdAt: serverTimestamp(),
  }).catch(err => {
    console.error('Failed to submit feedback to Firestore:', err);
  });

  // Write to Google Sheet via Google Form (fire-and-forget)
  const formData = new URLSearchParams();
  formData.append(FORM_FIELDS.userId, payload.userId);
  formData.append(FORM_FIELDS.sessionId, payload.sessionId || '');
  formData.append(FORM_FIELDS.level, payload.level || '');
  formData.append(FORM_FIELDS.focusArea, payload.focusArea || '');
  formData.append(FORM_FIELDS.rating, payload.rating || '');
  formData.append(FORM_FIELDS.comment, payload.comment || '');
  formData.append(FORM_FIELDS.model, payload.model);
  formData.append(FORM_FIELDS.fileName, payload.fileName || '');
  formData.append(FORM_FIELDS.transcriptLength, payload.transcriptLength || '');
  formData.append(FORM_FIELDS.sessionCount, payload.sessionCount);

  fetch(GOOGLE_FORM_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  }).catch(err => {
    console.error('Failed to submit feedback to Google Sheet:', err);
  });
};
