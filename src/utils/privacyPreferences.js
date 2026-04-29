export const PRIVACY_UPLOAD_BEHAVIOR = {
  LIGHT_PROMPT: 'light-prompt',
  FULL_REVIEW: 'full-review',
  SKIP: 'skip',
};

export const DEFAULT_PRIVACY_UPLOAD_BEHAVIOR = PRIVACY_UPLOAD_BEHAVIOR.LIGHT_PROMPT;

const PRIVACY_UPLOAD_BEHAVIOR_KEY = 'privacy_upload_behavior';

export const getPrivacyUploadBehavior = () => {
  const stored = localStorage.getItem(PRIVACY_UPLOAD_BEHAVIOR_KEY);
  return Object.values(PRIVACY_UPLOAD_BEHAVIOR).includes(stored)
    ? stored
    : DEFAULT_PRIVACY_UPLOAD_BEHAVIOR;
};

export const setPrivacyUploadBehavior = (behavior) => {
  const nextBehavior = Object.values(PRIVACY_UPLOAD_BEHAVIOR).includes(behavior)
    ? behavior
    : DEFAULT_PRIVACY_UPLOAD_BEHAVIOR;
  localStorage.setItem(PRIVACY_UPLOAD_BEHAVIOR_KEY, nextBehavior);
  return nextBehavior;
};
