import React, { useRef, useState } from 'react';
import './IndexCard.css';

export const IndexCard = ({ data, onSave, isSaved = false, inline = false, level, focusArea }) => {
  const cardRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState(isSaved ? 'saved' : null);

  // Build level label
  const getLevelLabel = () => {
    if (!level) return null;
    if (level === '1' || level === 1) return 'Level 1';
    if (level === '2' || level === 2) {
      return focusArea ? `Level 2: ${focusArea}` : 'Level 2';
    }
    return null;
  };

  const handlePrint = () => {
    const printContent = cardRef.current.innerHTML;
    const levelLabel = getLevelLabel();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Next Class - Index Card</title>
          <style>
            @page {
              size: 5in 4in; /* Slightly taller to accommodate more content */
              margin: 0.2in;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              font-size: 9px;
              line-height: 1.35;
              margin: 0;
              padding: 0;
              width: 4.6in;
              background: #ffffff;
            }
            .card-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
              padding-bottom: 6px;
              border-bottom: 1px solid #E6E6E6;
            }
            .card-title {
              font-size: 11px;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #2E2E2E;
              margin: 0;
            }
            .card-level-label {
              font-size: 10px;
              font-weight: 500;
              color: #555555;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .card-content {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            .card-section {
              display: flex;
              flex-direction: column;
              gap: 2px;
              page-break-inside: avoid;
            }
            .section-header {
              display: flex;
              align-items: center;
              gap: 3px;
            }
            .section-icon {
              font-size: 9px;
              width: 12px;
            }
            .section-label {
              font-weight: 700;
              text-transform: uppercase;
              font-size: 9px;
              letter-spacing: 0.3px;
            }
            .section-keep .section-label { color: #1F6F3D; }
            .section-try .section-label,
            .section-experiment .section-label { color: #1F4FD8; }
            .section-say .section-label { color: #555555; }
            .section-watch .section-label { color: #8A6D1D; }
            .section-hint {
              font-size: 7px;
              font-weight: 400;
              color: #888888;
              font-style: italic;
              margin-left: 4px;
            }
            .section-content {
              font-size: 8.5px;
              line-height: 1.35;
              color: #2E2E2E;
              margin-left: 15px;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .try-item {
              margin-left: 6px;
            }
            .try-item:before {
              content: "\\2022 ";
              color: #1F4FD8;
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleCopy = async () => {
    const levelLabel = getLevelLabel();

    // HTML format for Word - preserves formatting when pasted
    const tryItems = Array.isArray(data.try)
      ? data.try.map(t => `<li>${t}</li>`).join('')
      : `<li>${data.try}</li>`;

    const html = `
<div style="font-family: Calibri, Arial, sans-serif; max-width: 500px; padding: 16px; border: 1px solid #ccc;">
  <div style="border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 12px;">
    <strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Next Class — Index Card</strong>
    ${levelLabel ? `<span style="float: right; font-size: 11px; color: #666;">${levelLabel}</span>` : ''}
  </div>

  <div style="margin-bottom: 12px;">
    <div style="color: #1F6F3D; font-weight: bold; font-size: 11px; margin-bottom: 4px;">✓ KEEP DOING</div>
    <div style="margin-left: 16px; font-size: 11px;">${data.keep}</div>
  </div>

  <div style="margin-bottom: 12px;">
    <div style="color: #1F4FD8; font-weight: bold; font-size: 11px; margin-bottom: 4px;">⟳ EXPERIMENT</div>
    <ul style="margin: 0; margin-left: 16px; padding-left: 16px; font-size: 11px;">${tryItems}</ul>
  </div>

  <div style="margin-bottom: 12px;">
    <div style="color: #555; font-weight: bold; font-size: 11px; margin-bottom: 4px;">💬 SAY THIS</div>
    <div style="margin-left: 16px; font-size: 11px; font-style: italic;">"${data.say}"</div>
  </div>

  <div>
    <div style="color: #8A6D1D; font-weight: bold; font-size: 11px; margin-bottom: 4px;">👀 WATCH FOR <span style="font-weight: normal; font-style: italic; color: #888;">(signs it's working)</span></div>
    <div style="margin-left: 16px; font-size: 11px;">${data.watchFor}</div>
  </div>
</div>`;

    // Plain text fallback
    const plainText = `NEXT CLASS — INDEX CARD${levelLabel ? ` (${levelLabel})` : ''}

KEEP DOING
${data.keep}

EXPERIMENT
${Array.isArray(data.try) ? data.try.map(t => `• ${t}`).join('\n') : `• ${data.try}`}

SAY THIS
"${data.say}"

WATCH FOR (signs it's working)
${data.watchFor}`;

    try {
      // Try to copy both HTML and plain text for best compatibility
      const blob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': textBlob
        })
      ]);

      setSaveStatus('copied');
      setTimeout(() => setSaveStatus(isSaved ? 'saved' : null), 2000);
    } catch (err) {
      // Fallback to plain text if ClipboardItem not supported
      console.warn('HTML copy failed, falling back to plain text:', err);
      try {
        await navigator.clipboard.writeText(plainText);
        setSaveStatus('copied');
        setTimeout(() => setSaveStatus(isSaved ? 'saved' : null), 2000);
      } catch (fallbackErr) {
        console.error('Failed to copy:', fallbackErr);
      }
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(data);
      setSaveStatus('saved');
    }
  };

  if (!data) return null;

  const levelLabel = getLevelLabel();

  const cardContent = (
    <>
      <div className="index-card" ref={cardRef}>
        <div className="card-header">
          <div className="card-title">Next Class — Index Card</div>
          {levelLabel && <div className="card-level-label">{levelLabel}</div>}
        </div>

        <div className="card-content">
          <div className="card-section section-keep">
            <div className="section-header">
              <span className="section-icon">✓</span>
              <span className="section-label">KEEP</span>
              <span className="section-hint">Continue this practice</span>
            </div>
            <div className="section-content">{data.keep}</div>
          </div>

          <div className="card-section section-try">
            <div className="section-header">
              <span className="section-icon">⟳</span>
              <span className="section-label">EXPERIMENT</span>
              <span className="section-hint">Try this in your next class</span>
            </div>
            <div className="section-content">
              {Array.isArray(data.try) ? (
                data.try.map((item, i) => (
                  <div key={i} className="try-item">{item}</div>
                ))
              ) : (
                <div className="try-item">{data.try}</div>
              )}
            </div>
          </div>

          <div className="card-section section-say">
            <div className="section-header">
              <span className="section-icon">💬</span>
              <span className="section-label">SAY</span>
              <span className="section-hint">A phrase you can use verbatim</span>
            </div>
            <div className="section-content say-quote">"{data.say}"</div>
          </div>

          <div className="card-section section-watch">
            <div className="section-header">
              <span className="section-icon">👀</span>
              <span className="section-label">WATCH FOR</span>
              <span className="section-hint">How to know it's working</span>
            </div>
            <div className="section-content">{data.watchFor}</div>
          </div>
        </div>
      </div>

      {/* Actions moved outside the card */}
      <div className="index-card-actions">
        {!isSaved && onSave && (
          <button
            className="btn-success"
            onClick={handleSave}
            disabled={saveStatus === 'saved'}
            aria-label="Save index card to session"
          >
            {saveStatus === 'saved' ? 'Saved!' : 'Save to Session'}
          </button>
        )}
        {isSaved && (
          <span className="saved-badge" aria-label="Card already saved">Saved</span>
        )}
        <button
          className="btn-export"
          onClick={handleCopy}
          aria-label="Copy card as plain text for Word"
          title="Copy as plain text (works in Word)"
        >
          {saveStatus === 'copied' ? 'Copied!' : 'Copy for Word'}
        </button>
        <button className="btn-export" onClick={handlePrint} aria-label="Print index card">Print</button>
      </div>
    </>
  );

  // Inline mode - display directly in the page
  if (inline) {
    return (
      <div className="index-card-inline">
        <div className="index-card-header">
          <h4>Your Next Class Index Card</h4>
        </div>
        {cardContent}
      </div>
    );
  }

  // Modal mode (legacy support)
  return (
    <div className="index-card-overlay">
      <div className="index-card-modal">
        {cardContent}
      </div>
    </div>
  );
};
