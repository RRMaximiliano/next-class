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
          <h1>Privacy Policy</h1>
          <p className="privacy-subtitle">Last updated: March 11, 2026</p>

          <section>
            <h2>Who We Are</h2>
            <p>
              This tool is operated by the Next Class team. If you have questions
              about this policy or your data, please contact us at{' '}
              <a href="mailto:dan_levy@hks.harvard.edu">dan_levy@hks.harvard.edu</a>.
            </p>
          </section>

          <section>
            <h2>Your Data Stays on Your Device</h2>
            <p>
              Transcripts, analysis results, session history, and index cards are
              stored exclusively in your browser's localStorage. There is no cloud
              sync and no server-side database for this content.
            </p>
            <p>Important limitations of localStorage you should be aware of:</p>
            <ul>
              <li>
                Clearing your browser data or switching devices means this data is
                permanently gone.
              </li>
              <li>
                localStorage is not encrypted. It can be accessed by other scripts
                running on the same browser origin.
              </li>
              <li>
                It is not designed for storing highly sensitive institutional data.
                Please consider what information you include in transcripts before
                uploading.
              </li>
            </ul>
          </section>

          <section>
            <h2>A Note on Student Privacy</h2>
            <p>
              Course recordings and transcripts may contain personally identifiable
              information about students, including names, voices, questions, and
              discussions. Depending on where you are located, this may be subject
              to student privacy regulations such as FERPA (United States),
              FERPA-equivalent provincial laws (Canada), GDPR (European Union and
              UK), PDPA (various Asian jurisdictions), or your institution's own
              data governance policies.
            </p>
            <p>
              Regardless of jurisdiction, you are responsible for ensuring that any
              transcript you upload complies with applicable privacy laws and your
              institution's data handling requirements. When in doubt, consult your
              institution's data protection officer or equivalent.
            </p>
            <p>
              We strongly recommend anonymizing transcripts before uploading by
              removing or replacing any student names or other identifying details.
            </p>
          </section>

          <section>
            <h2>What Gets Sent to OpenAI</h2>
            <p>
              When you click Generate, your transcript text is sent directly from
              your browser to the OpenAI API. There is no intermediary server — the
              request goes straight from your browser to OpenAI.
            </p>
            <p>
              Requests are authenticated with your personal OpenAI API key, which is
              stored only in your browser's localStorage. We never see or transmit
              your API key.
            </p>
            <p>
              Regarding OpenAI's data practices: as of this writing, OpenAI does not
              use content submitted via the API to train its models by default.
              However, OpenAI's policies may change, and we encourage you to review
              their current{' '}
              <a
                href="https://openai.com/policies/api-data-usage-policies"
                target="_blank"
                rel="noreferrer"
              >
                API data usage policy
              </a>{' '}
              directly.
            </p>
            <p>
              If you are using an organizational or institutional API key, your
              usage may also be subject to your institution's OpenAI enterprise
              agreement. Please check with your IT or compliance team.
            </p>
          </section>

          <section>
            <h2>Google Sign-In and Firebase Auth</h2>
            <p>
              Google Sign-In is used solely to control access to the app. We receive
              your name, email address, and profile photo for display purposes only.
              We do not request access to Google Drive, Gmail, contacts, or any
              other Google services.
            </p>
            <p>
              Authentication is managed through Firebase Auth (a Google service).
              While your profile information is held in memory during your browser
              session, Firebase Auth does maintain server-side session state and
              authentication logs as part of how the service functions. These logs
              are governed by{' '}
              <a
                href="https://firebase.google.com/support/privacy"
                target="_blank"
                rel="noreferrer"
              >
                Google's Firebase privacy policy
              </a>.
            </p>
            <p>
              We do not store your name, email, or profile photo in any database we
              control.
            </p>
          </section>

          <section>
            <h2>Your OpenAI API Key</h2>
            <p>
              Your OpenAI API key is stored in your browser's localStorage. It is
              never sent to our servers and is only used for direct
              browser-to-OpenAI API calls. You can clear your API key at any time
              from Settings.
            </p>
          </section>

          <section>
            <h2>What We Collect</h2>
            <p>
              We do not operate any analytics, telemetry, error tracking, or
              behavioral data collection. No cookies are used beyond what Firebase
              Auth requires for session management.
            </p>
            <p>
              We do not maintain any server-side database of user content,
              transcripts, or feedback results.
            </p>
          </section>

          <section>
            <h2>Third-Party Services</h2>
            <p>This app uses the following third-party services:</p>
            <ul>
              <li>
                <strong>OpenAI API</strong> — processes transcript text to generate
                feedback. Governed by{' '}
                <a
                  href="https://openai.com/policies/privacy-policy"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenAI's privacy policy
                </a>{' '}
                and API usage terms.
              </li>
              <li>
                <strong>Firebase Auth (Google)</strong> — manages user
                authentication. Governed by{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google's privacy policy
                </a>.
              </li>
              <li>
                <strong>GitHub Pages (GitHub / Microsoft)</strong> — serves the app.
                May log standard request metadata such as IP addresses.
              </li>
            </ul>
            <p>
              None of these services receive your transcript content except OpenAI,
              which receives it only when you click Generate.
            </p>
          </section>

          <section>
            <h2>Account Deletion and Data Removal</h2>
            <p>
              Because we do not store your content on any server we control, there
              is nothing for us to delete on our end when you stop using the app.
              All transcript and session data lives in your browser's localStorage
              and can be cleared at any time through your browser settings or the
              app's Settings panel.
            </p>
            <p>
              To remove your Firebase Auth account, please contact us at{' '}
              <a href="mailto:dan_levy@hks.harvard.edu">dan_levy@hks.harvard.edu</a>{' '}
              and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2>Eligibility and Acceptable Use</h2>
            <p>
              This tool is intended for use by instructors and educational
              professionals. It is not designed for use by students or individuals
              under the age of 18. By using this app, you confirm that you are an
              adult using it in a professional capacity.
            </p>
            <p>
              Please do not upload recordings that include confidential student
              disclosures, disability accommodations, disciplinary matters, or other
              sensitive protected information.
            </p>
          </section>

          <section>
            <h2>Security and Breach Notification</h2>
            <p>
              We take reasonable steps to maintain the security of this application.
              In the event of a security incident that affects user data — including
              any compromise of Firebase Auth accounts — we will notify affected
              users promptly via the email address associated with their account.
            </p>
          </section>

          <section>
            <h2>Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. When we do, we will
              update the "Last updated" date at the top of this page. For
              significant changes, we will notify users via email or an in-app
              notice. We encourage you to review this policy periodically.
            </p>
            <p>
              Continued use of the app after changes are posted constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              If you have questions, concerns, or requests related to this privacy
              policy, please reach out at{' '}
              <a href="mailto:dan_levy@hks.harvard.edu">dan_levy@hks.harvard.edu</a>.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
};
