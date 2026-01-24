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
  } catch (err) {
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
