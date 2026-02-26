import React from 'react';
import './PrivacyPage.css';

export const PrivacyPage = ({ onBack }) => {
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('privacy-overlay')) onBack();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onBack();
  };

  return (
    <div
      className="privacy-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      ref={(el) => el?.focus()}
    >
      <div className="privacy-container">
        <button className="privacy-back-btn" onClick={onBack}>
          &larr; Back
        </button>

        <article className="privacy-content">
          <h1>Privacy</h1>

          <section>
            <h2>Your Data Stays on Your Device</h2>
            <p>
              Transcripts, analysis results, session history, and index cards are stored
              exclusively in your browser's localStorage. There is no cloud sync and no
              server-side database.
            </p>
            <p>
              Clearing your browser data or switching devices means this data is gone.
            </p>
          </section>

          <section>
            <h2>What Gets Sent to OpenAI</h2>
            <p>
              When you click Generate, your transcript text is sent directly from your
              browser to the OpenAI API. There is no intermediary server — the request
              goes straight from your browser to OpenAI.
            </p>
            <p>
              Requests are authenticated with your personal API key, which is stored
              only in your browser's localStorage. We never see or transmit your API key.
            </p>
            <p>
              <a href="https://openai.com/policies/api-data-usage-policies" target="_blank" rel="noreferrer">
                OpenAI's API data usage policies
              </a>
            </p>
          </section>

          <section>
            <h2>What We Collect</h2>
            <p>
              Nothing. There are no analytics, no telemetry, no error tracking, and no
              behavioral data collection. No cookies are used beyond Firebase Auth
              session management.
            </p>
          </section>

          <section>
            <h2>Google Sign-In</h2>
            <p>
              Google sign-in is used solely to gate access to the app. We receive your
              name, email address, and profile photo for display purposes only.
            </p>
            <p>
              This information is held in memory during your browser session via Firebase
              Auth. It is not saved to any server-side database.
            </p>
            <p>
              We do not request access to Google Drive, Gmail, contacts, or any other
              Google services.
            </p>
          </section>

          <section>
            <h2>Your API Key</h2>
            <p>
              Your OpenAI API key is stored in your browser's localStorage. It is never
              sent to our servers — it is only used for direct browser-to-OpenAI API
              calls.
            </p>
            <p>
              You can clear your API key at any time from Settings.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
};
