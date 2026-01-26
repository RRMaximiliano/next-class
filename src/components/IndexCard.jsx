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
              size: 5in 3in landscape;
              margin: 0.15in;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              font-size: 9px;
              line-height: 1.3;
              margin: 0;
              padding: 0;
              width: 5in;
              height: 3in;
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
              gap: 6px;
            }
            .card-section {
              display: flex;
              flex-direction: column;
              gap: 1px;
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
            .section-try .section-label { color: #1F4FD8; }
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
              font-size: 8px;
              line-height: 1.25;
              color: #2E2E2E;
              margin-left: 15px;
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
    const text = `NEXT CLASS — INDEX CARD${levelLabel ? ` (${levelLabel})` : ''}

KEEP
${data.keep}

TRY (experiment)
${Array.isArray(data.try) ? data.try.map(t => `• ${t}`).join('\n') : `• ${data.try}`}

SAY
"${data.say}"

WATCH FOR (signs it's working)
${data.watchFor}`;

    try {
      await navigator.clipboard.writeText(text);
      setSaveStatus('copied');
      setTimeout(() => setSaveStatus(isSaved ? 'saved' : null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
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
            </div>
            <div className="section-content">{data.keep}</div>
          </div>

          <div className="card-section section-try">
            <div className="section-header">
              <span className="section-icon">⟳</span>
              <span className="section-label">TRY (experiment)</span>
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
            </div>
            <div className="section-content say-quote">"{data.say}"</div>
          </div>

          <div className="card-section section-watch">
            <div className="section-header">
              <span className="section-icon">👀</span>
              <span className="section-label">WATCH FOR</span>
              <span className="section-hint">signs it's working</span>
            </div>
            <div className="section-content">{data.watchFor}</div>
          </div>
        </div>
      </div>

      {/* Actions moved outside the card */}
      <div className="index-card-actions">
        {!isSaved && onSave && (
          <button
            className="btn-save-card"
            onClick={handleSave}
            disabled={saveStatus === 'saved'}
          >
            {saveStatus === 'saved' ? 'Saved!' : 'Save to Session'}
          </button>
        )}
        {isSaved && (
          <span className="saved-badge">Saved</span>
        )}
        <button className="btn-export" onClick={handleCopy}>
          {saveStatus === 'copied' ? 'Copied!' : 'Copy'}
        </button>
        <button className="btn-export" onClick={handlePrint}>Print</button>
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
