import React, { useRef, useState } from 'react';
import './IndexCard.css';

export const IndexCard = ({ data, onSave, isSaved = false, inline = false }) => {
  const cardRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState(isSaved ? 'saved' : null);

  const handlePrint = () => {
    const printContent = cardRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Next Class - Index Card</title>
          <style>
            @page {
              size: 5in 3in;
              margin: 0.25in;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 11px;
              line-height: 1.4;
              margin: 0;
              padding: 0.25in;
              box-sizing: border-box;
              width: 5in;
              height: 3in;
            }
            .card-title {
              font-size: 12px;
              font-weight: 700;
              text-align: center;
              margin-bottom: 0.15in;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .card-section {
              margin-bottom: 0.1in;
            }
            .section-label {
              font-weight: 700;
              text-transform: uppercase;
              font-size: 10px;
              margin-bottom: 2px;
            }
            .section-content {
              margin-left: 0;
            }
            .try-item {
              margin-left: 0.1in;
            }
            .try-item:before {
              content: "• ";
            }
            .say-quote {
              font-style: italic;
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
    const text = `NEXT CLASS — INDEX CARD

KEEP
${data.keep}

TRY (experiment)
${Array.isArray(data.try) ? data.try.map(t => `• ${t}`).join('\n') : `• ${data.try}`}

SAY
"${data.say}"

WATCH FOR
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

  const cardContent = (
    <>
      <div className="index-card-header">
        <h4>Your Next Class Index Card</h4>
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
      </div>

      <div className="index-card" ref={cardRef}>
        <div className="card-title">Next Class — Index Card</div>

        <div className="card-section">
          <div className="section-label">KEEP</div>
          <div className="section-content">{data.keep}</div>
        </div>

        <div className="card-section">
          <div className="section-label">TRY (experiment)</div>
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

        <div className="card-section">
          <div className="section-label">SAY</div>
          <div className="section-content say-quote">"{data.say}"</div>
        </div>

        <div className="card-section">
          <div className="section-label">WATCH FOR</div>
          <div className="section-content">{data.watchFor}</div>
        </div>
      </div>
    </>
  );

  // Inline mode - display directly in the page
  if (inline) {
    return (
      <div className="index-card-inline">
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
