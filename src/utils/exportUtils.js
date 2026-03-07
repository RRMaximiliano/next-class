/**
 * Export utilities for generating downloadable reports
 */

/**
 * Convert summary/feedback data to Markdown format
 */
export const formatSummaryAsMarkdown = (summary, fileName) => {
  let md = `# Main Feedback Report\n\n`;
  md += `**Session:** ${fileName || 'Untitled Session'}\n`;
  md += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;
  md += `---\n\n`;

  // Level 1 Format (new)
  if (summary.framing) {
    md += `## Overview\n\n${summary.framing}\n\n`;
  }

  // What Worked
  if (summary.whatWorked?.length > 0) {
    md += `## What Seemed to Work\n\n`;
    summary.whatWorked.forEach(item => {
      const text = typeof item === 'string' ? item : item.observation;
      md += `- ${text}\n`;
      if (item.evidence) {
        md += `  > "${item.evidence}"\n`;
      }
    });
    md += `\n`;
  }

  // Experiments
  if (summary.experiments?.length > 0) {
    md += `## Experiments to Try Next Class\n\n`;
    summary.experiments.forEach(item => {
      const text = typeof item === 'string' ? item : item.suggestion;
      md += `- ${text}\n`;
      if (item.tradeoff) {
        md += `  - *Tradeoff:* ${item.tradeoff}\n`;
      }
    });
    md += `\n`;
  }

  return md;
};

/**
 * Convert detailed feedback to Markdown format
 */
export const formatFeedbackAsMarkdown = (feedback, fileName) => {
  let md = `# Detailed Feedback Report\n\n`;
  md += `**Session:** ${fileName || 'Untitled Session'}\n`;
  md += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;
  md += `---\n\n`;

  // Teaching Style
  if (feedback.style) {
    md += `## Teaching Style: ${feedback.style}\n\n`;
    if (feedback.styleExplanation) {
      md += `${feedback.styleExplanation}\n\n`;
    }
  }

  // Strengths
  if (feedback.strengths?.length > 0) {
    md += `## Highlights & Strengths\n\n`;
    feedback.strengths.forEach((item, i) => {
      md += `### ${i + 1}. ${item.aspect}\n\n`;
      md += `${item.explanation}\n\n`;
      if (item.evidence?.length > 0) {
        md += `**Evidence:**\n`;
        item.evidence.forEach(ev => {
          const text = typeof ev === 'string' ? ev : ev.text;
          md += `- "${text}"\n`;
        });
        md += `\n`;
      }
    });
  }

  // Areas for Growth
  if (feedback.areasForGrowth?.length > 0) {
    md += `## Areas for Growth\n\n`;
    feedback.areasForGrowth.forEach((item, i) => {
      md += `### ${i + 1}. ${item.aspect}\n\n`;
      md += `${item.explanation}\n\n`;
      if (item.evidence?.length > 0) {
        md += `**Evidence:**\n`;
        item.evidence.forEach(ev => {
          const text = typeof ev === 'string' ? ev : ev.text;
          md += `- "${text}"\n`;
        });
        md += `\n`;
      }
    });
  }

  return md;
};

/**
 * Copy text to clipboard with fallback
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }
};

/**
 * Download content as a file
 */
export const downloadAsFile = (content, filename, mimeType = 'text/markdown') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Trigger print dialog (for PDF export via browser)
 */
export const printReport = () => {
  window.print();
};

/**
 * RFC 4180 CSV escape: wrap in quotes if value contains comma, quote, or newline
 */
const csvEscape = (value) => {
  const str = value == null ? '' : String(value);
  if (str === '') return '';
  if (/[,"\r\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

/**
 * Truncate string with ellipsis
 */
const truncate = (str, max = 200) => {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
};

/**
 * Format whatWorked array as numbered multiline string
 */
const formatWhatWorked = (items) => {
  if (!items?.length) return '';
  return items.map((item, i) => {
    const obs = typeof item === 'string' ? item : item.observation || '';
    const evidence = typeof item === 'string' ? '' : item.evidence;
    return `${i + 1}. ${obs}${evidence ? ` (Evidence: "${evidence}")` : ''}`;
  }).join('\n');
};

/**
 * Format experiments array as numbered multiline string
 */
const formatExperiments = (items) => {
  if (!items?.length) return '';
  return items.map((item, i) => {
    const sug = typeof item === 'string' ? item : item.suggestion || '';
    const tradeoff = typeof item === 'string' ? '' : item.tradeoff;
    return `${i + 1}. ${sug}${tradeoff ? ` [Tradeoff: ${tradeoff}]` : ''}`;
  }).join('\n');
};

/**
 * Pick primary index card: prefer Level 1, fall back to first card
 */
const pickPrimaryCard = (indexCards) => {
  if (!indexCards?.length) return null;
  return indexCards.find(c => c.level === '1' || c.level === 1) || indexCards[0];
};

/**
 * Format session data as CSV with AI feedback, index cards, and completion status
 * @param {Array} sessions - Array of session objects (enriched with indexCards)
 * @returns {string} CSV content with UTF-8 BOM
 */
export const formatSessionsAsCSV = (sessions) => {
  if (!sessions || sessions.length === 0) {
    return 'No sessions found';
  }

  const headers = [
    // A. Session Identity
    'Date', 'Session Name', 'Duration (min)', 'Tags', 'Saved At',
    // B. Class Metrics
    'Instructor Talk %', 'Student Talk %', 'Silence %', 'Questions Asked', 'Speaker Count',
    // C. Completion Status
    'Summary Complete', 'Deep Dive Complete', 'Coaching Complete',
    // D. Level 1 Feedback
    'Overview', 'What Worked', 'Experiments Suggested',
    // E. Index Card
    'Card: Keep', 'Card: Experiment', 'Card: Say', 'Card: Watch For',
    // F. Level 2 Deep Dives + Coaching
    'Questions: Strength', 'Questions: Experiment',
    'Sensemaking: Strength', 'Sensemaking: Experiment',
    'Time: Strength', 'Time: Experiment',
    'Coaching Exchanges'
  ];

  const rows = sessions.map(session => {
    const stats = session.stats || {};
    const ai = session.aiInteractions || {};
    const level1 = ai.level1 || {};
    const level2 = ai.level2 || {};
    const dataByFocus = level2.dataByFocus || {};
    const coaching = ai.coaching || [];
    const card = pickPrimaryCard(session.indexCards);

    const q = dataByFocus.questions || {};
    const sm = dataByFocus.sensemaking || {};
    const tm = dataByFocus.time || {};

    return [
      // A. Session Identity
      session.date || '',
      session.fileName || '',
      Math.round((stats.totalDuration || 0) / 60),
      (session.tags || []).join('; '),
      session.savedAt || '',
      // B. Class Metrics
      (stats.teacherTalkPercent || 0).toFixed(1),
      (stats.studentTalkPercent || 0).toFixed(1),
      (stats.silencePercent || 0).toFixed(1),
      stats.questionCount || 0,
      stats.speakerCount || 0,
      // C. Completion Status
      ai.level1 ? 'Yes' : '',
      Object.keys(dataByFocus).length > 0 ? 'Yes' : '',
      coaching.length > 0 ? 'Yes' : '',
      // D. Level 1 Feedback
      level1.framing || '',
      formatWhatWorked(level1.whatWorked),
      formatExperiments(level1.experiments),
      // E. Index Card
      card?.keep || '',
      Array.isArray(card?.try) ? card.try.join('; ') : (card?.try || ''),
      card?.say || '',
      card?.watchFor || '',
      // F. Level 2 Deep Dives
      truncate(q.currentApproach?.strengths),
      q.experiment?.description || '',
      truncate(sm.currentApproach?.strengths),
      sm.experiment?.description || '',
      truncate(tm.currentApproach?.strengths),
      tm.experiment?.description || '',
      // Coaching
      coaching.length > 0 ? Math.floor(coaching.length / 2) : ''
    ].map(csvEscape).join(',');
  });

  // UTF-8 BOM + header + rows
  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
};

/**
 * Format Level 2 analysis as Markdown
 * @param {Object} level2Data - Level 2 analysis data
 * @param {string} fileName - Session file name
 * @returns {string} Markdown content
 */
export const formatLevel2AsMarkdown = (level2Data, fileName) => {
  let md = `# Level 2 Deep Dive: ${level2Data.focusArea}\n\n`;
  md += `**Session:** ${fileName || 'Untitled Session'}\n`;
  md += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;
  md += `---\n\n`;

  // Why It Matters
  if (level2Data.whyItMatters) {
    md += `## Why This Matters\n\n${level2Data.whyItMatters}\n\n`;
  }

  // Current Approach
  if (level2Data.currentApproach) {
    md += `## Your Current Approach\n\n`;
    if (level2Data.currentApproach.strengths) {
      md += `### Strengths\n\n${level2Data.currentApproach.strengths}\n\n`;
    }
    if (level2Data.currentApproach.opportunity) {
      md += `### Opportunity\n\n${level2Data.currentApproach.opportunity}\n\n`;
    }
  }

  // Experiment
  if (level2Data.experiment) {
    md += `## Experiment to Try\n\n`;
    md += `${level2Data.experiment.description}\n\n`;
    if (level2Data.experiment.examplePrompts?.length > 0) {
      md += `**Example Prompts:**\n`;
      level2Data.experiment.examplePrompts.forEach(prompt => {
        md += `- "${prompt}"\n`;
      });
      md += `\n`;
    }
  }

  // Tradeoff
  if (level2Data.tradeoff) {
    md += `## Tradeoff\n\n${level2Data.tradeoff}\n\n`;
  }

  // Watch For
  if (level2Data.watchFor) {
    md += `## What to Watch For\n\n${level2Data.watchFor}\n\n`;
  }

  return md;
};

/**
 * Format coaching conversation as Markdown
 * @param {Array} messages - Array of { role, content } messages
 * @returns {string} Markdown content
 */
export const formatCoachingAsMarkdown = (messages) => {
  let md = `# Coaching Conversation\n\n`;
  md += `**Date:** ${new Date().toLocaleDateString()}\n\n`;
  md += `---\n\n`;

  for (const msg of messages) {
    const label = msg.role === 'user' ? '**You**' : '**Coach**';
    md += `${label}\n\n${msg.content}\n\n---\n\n`;
  }

  return md;
};

/**
 * Format Index Card as plain text for printing
 * @param {Object} cardData - Index card data
 * @param {string} level - '1' or '2'
 * @param {string} focusArea - Focus area for Level 2
 * @returns {string} Plain text content
 */
export const formatIndexCardAsText = (cardData, level = '1', focusArea = null) => {
  let text = `NEXT CLASS — INDEX CARD\n`;
  text += `Level ${level}${focusArea ? ` (${focusArea})` : ''}\n`;
  text += `${'─'.repeat(30)}\n\n`;

  text += `KEEP\n`;
  text += `${cardData.keep || 'Not specified'}\n\n`;

  text += `TRY (experiment)\n`;
  if (Array.isArray(cardData.try)) {
    cardData.try.forEach(item => {
      text += `• ${item}\n`;
    });
  } else {
    text += `• ${cardData.try || 'Not specified'}\n`;
  }
  text += `\n`;

  text += `SAY\n`;
  text += `"${cardData.say || 'Not specified'}"\n\n`;

  text += `WATCH FOR\n`;
  text += `${cardData.watchFor || 'Not specified'}\n`;

  return text;
};
