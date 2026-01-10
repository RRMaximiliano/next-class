/**
 * Export utilities for generating downloadable reports
 */

/**
 * Convert summary/feedback data to Markdown format
 */
export const formatSummaryAsMarkdown = (summary, fileName) => {
  let md = `# Class Summary Report\n\n`;
  md += `**Session:** ${fileName || 'Untitled Session'}\n`;
  md += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;
  md += `---\n\n`;

  // Executive Summary
  if (summary.executiveSummary) {
    md += `## Overview\n\n${summary.executiveSummary}\n\n`;
  }

  // Learning Objectives
  if (summary.learningObjectives?.length > 0) {
    md += `## Learning Objectives\n\n`;
    summary.learningObjectives.forEach((obj, i) => {
      const text = typeof obj === 'string' ? obj : obj.objective;
      md += `${i + 1}. ${text}\n`;
      if (obj.evidenceOfProgress) {
        md += `   - *Evidence:* ${obj.evidenceOfProgress}\n`;
      }
    });
    md += `\n`;
  }

  // Activities
  if (summary.classActivities?.length > 0) {
    md += `## Class Activities\n\n`;
    md += `| Activity | Time | Description | Objective |\n`;
    md += `|----------|------|-------------|----------|\n`;
    summary.classActivities.forEach(act => {
      md += `| ${act.activity} | ${act.time} | ${act.description} | ${act.objectiveMapping} |\n`;
    });
    md += `\n`;
  }

  // Feedback
  if (summary.feedback) {
    md += `## Feedback Highlights\n\n`;

    if (summary.feedback.momentThatSang) {
      md += `### ✨ Standout Moment\n`;
      md += `> "${summary.feedback.momentThatSang.quote}"\n\n`;
      md += `*Time:* ${summary.feedback.momentThatSang.timestamp}\n\n`;
      md += `${summary.feedback.momentThatSang.explanation}\n\n`;
    }

    if (summary.feedback.momentToRevisit) {
      md += `### 🔄 Moment to Revisit\n`;
      md += `> "${summary.feedback.momentToRevisit.quote}"\n\n`;
      md += `*Time:* ${summary.feedback.momentToRevisit.timestamp}\n\n`;
      md += `${summary.feedback.momentToRevisit.explanation}\n\n`;
    }

    if (summary.feedback.strengths?.length > 0) {
      md += `### Strengths\n`;
      summary.feedback.strengths.forEach(s => {
        const text = typeof s === 'string' ? s : s.strength;
        md += `- ${text}\n`;
      });
      md += `\n`;
    }

    if (summary.feedback.improvements?.length > 0) {
      md += `### Areas for Improvement\n`;
      summary.feedback.improvements.forEach(s => {
        const text = typeof s === 'string' ? s : s.improvement;
        md += `- ${text}\n`;
      });
      md += `\n`;
    }
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
