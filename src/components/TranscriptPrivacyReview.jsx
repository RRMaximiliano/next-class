import React, { useMemo, useRef, useState } from 'react';
import {
  anonymizeFileName,
  anonymizeTranscript,
  detectNames,
  detectOtherCapitalizedWords,
  isRepeatOnlyDetection,
  parseRoster,
} from '../utils/transcriptAnonymizer';

const SOURCE_LABELS = {
  'full-name': 'full name',
  title: 'title',
  speaker: 'speaker label',
  'in-context': 'context',
  'first-name': 'first name',
};

const sourceLabel = (source) => {
  if (source.startsWith('roster')) return 'roster';
  if (source.startsWith('repeated')) return source.replace('repeated-', 'repeated ');
  if (source.startsWith('capitalized')) return source.replace('capitalized-', 'capitalized ');
  return SOURCE_LABELS[source] || source;
};

const NameOption = ({ detection, checked, onToggle }) => {
  const sourceLabels = [...new Set(detection.sources.map(sourceLabel))];

  return (
    <label className="privacy-name-option">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(detection.name)}
      />
      <span className="privacy-name-text">{detection.name}</span>
      <span className="privacy-name-sources">
        {sourceLabels.map(label => (
          <span className="privacy-source-pill" key={label}>{label}</span>
        ))}
      </span>
    </label>
  );
};

export function TranscriptPrivacyReview({
  isOpen,
  fileName,
  content,
  initialDetections,
  onCancel,
  onUseOriginal,
  onUseAnonymized,
}) {
  const initialSelectedNames = useMemo(
    () => initialDetections
      .filter(detection => !isRepeatOnlyDetection(detection))
      .map(detection => detection.name),
    [initialDetections]
  );
  const [rosterNames, setRosterNames] = useState([]);
  const [rosterLabel, setRosterLabel] = useState('');
  const [selectedNames, setSelectedNames] = useState(() => new Set(initialSelectedNames));
  const [showOptional, setShowOptional] = useState(false);
  const [optionalSearch, setOptionalSearch] = useState('');
  const fileInputRef = useRef(null);

  const detections = useMemo(() => {
    if (!content) return [];
    return rosterNames.length > 0 ? detectNames(content, rosterNames) : initialDetections;
  }, [content, initialDetections, rosterNames]);

  const likelyDetections = useMemo(
    () => detections.filter(detection => !isRepeatOnlyDetection(detection)),
    [detections]
  );

  const optionalDetections = useMemo(() => {
    const repeatedOnly = detections.filter(isRepeatOnlyDetection);
    const otherCapitalized = detectOtherCapitalizedWords(content, detections.map(detection => detection.name));
    return [...repeatedOnly, ...otherCapitalized].sort((a, b) => a.name.localeCompare(b.name));
  }, [content, detections]);

  const filteredOptionalDetections = useMemo(() => {
    const query = optionalSearch.trim().toLowerCase();
    if (!query) return optionalDetections;
    return optionalDetections.filter(detection => detection.name.toLowerCase().includes(query));
  }, [optionalDetections, optionalSearch]);

  if (!isOpen) return null;

  const toggleName = (name) => {
    setSelectedNames((current) => {
      const next = new Set(current);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedNames(new Set([...likelyDetections, ...optionalDetections].map(detection => detection.name)));
  };

  const clearAll = () => {
    setSelectedNames(new Set());
  };

  const handleRosterUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const rosterText = await file.text();
    const names = parseRoster(rosterText);
    const nextDetections = names.length > 0 ? detectNames(content, names) : initialDetections;
    setRosterNames(names);
    setRosterLabel(names.length > 0 ? `${names.length} roster name${names.length === 1 ? '' : 's'} loaded` : 'No roster names found');
    setSelectedNames(new Set(nextDetections.filter(detection => !isRepeatOnlyDetection(detection)).map(detection => detection.name)));
  };

  const handleUseAnonymized = () => {
    const result = anonymizeTranscript(content, [...selectedNames]);
    const anonymizedFileName = anonymizeFileName(fileName, result.replacements);
    onUseAnonymized({
      content: result.text,
      fileName: anonymizedFileName,
      replacements: result.replacements,
      selectedCount: selectedNames.size,
    });
  };

  return (
    <div className="privacy-review-overlay" role="dialog" aria-modal="true" aria-labelledby="privacy-review-title">
      <section className="privacy-review-modal">
        <header className="privacy-review-header">
          <div>
            <p className="privacy-review-kicker">Local privacy check</p>
            <h2 id="privacy-review-title">Possible student names found</h2>
            <p>
              Review these matches before analysis. If you anonymize, the cleaned transcript is what gets parsed,
              saved, and sent to OpenAI.
            </p>
          </div>
          <button className="btn-icon btn-close" onClick={onCancel} aria-label="Cancel upload">x</button>
        </header>

        <div className="privacy-review-body">
          <div className="privacy-review-summary">
            <div>
              <span className="privacy-summary-number">{likelyDetections.length}</span>
              <span className="privacy-summary-label">likely matches</span>
            </div>
            <div>
              <span className="privacy-summary-number">{selectedNames.size}</span>
              <span className="privacy-summary-label">selected for anonymizing</span>
            </div>
          </div>

          <div className="privacy-review-note">
            This detector runs only in your browser and does not use AI. It can miss names or flag non-names,
            so this review step is intentionally editable.
          </div>

          <div className="privacy-roster-box">
            <div>
              <strong className="privacy-roster-title">Optional roster file</strong>
              <p>Upload a CSV/TXT roster to improve matching before the transcript is analyzed.</p>
              <p className="privacy-roster-examples">
                Supported formats include <span>Last, First</span>, <span>First Last</span>, or separate columns
                such as <span>First Name, Last Name</span>.
              </p>
              {rosterLabel && <span className="privacy-roster-status">{rosterLabel}</span>}
            </div>
            <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
              Add roster
            </button>
            <input
              ref={fileInputRef}
              className="privacy-roster-input"
              type="file"
              accept=".csv,.txt,.tsv"
              onChange={handleRosterUpload}
            />
          </div>

          <div className="privacy-review-controls">
            <span>{fileName}</span>
            <div>
              <button className="text-btn" onClick={selectAll}>Select all</button>
              <button className="text-btn" onClick={clearAll}>Clear</button>
            </div>
          </div>

          <div className="privacy-name-list" aria-label="Likely names">
            {likelyDetections.map(detection => (
              <NameOption
                key={detection.name}
                detection={detection}
                checked={selectedNames.has(detection.name)}
                onToggle={toggleName}
              />
            ))}
          </div>

          {optionalDetections.length > 0 && (
            <div className="privacy-optional-section">
              <button
                className="privacy-optional-toggle"
                onClick={() => setShowOptional(value => !value)}
                aria-expanded={showOptional}
              >
                {showOptional ? 'Hide' : 'Review'} {optionalDetections.length} lower-confidence capitalized word{optionalDetections.length === 1 ? '' : 's'}
              </button>
              {showOptional && (
                <>
                  <div className="privacy-optional-search">
                    <input
                      type="search"
                      value={optionalSearch}
                      placeholder="Search lower-confidence names"
                      onChange={(event) => setOptionalSearch(event.target.value)}
                    />
                    <span>
                      Showing {filteredOptionalDetections.length} of {optionalDetections.length}
                    </span>
                  </div>
                  <div className="privacy-name-list optional" aria-label="Optional capitalized words">
                    {filteredOptionalDetections.map(detection => (
                      <NameOption
                        key={`${detection.name}-${detection.sources.join('-')}`}
                        detection={detection}
                        checked={selectedNames.has(detection.name)}
                        onToggle={toggleName}
                      />
                    ))}
                    {filteredOptionalDetections.length === 0 && (
                      <p className="privacy-empty-search">No lower-confidence matches found for that search.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <footer className="privacy-review-footer">
          <button className="btn-secondary" onClick={onCancel}>Cancel upload</button>
          <div className="privacy-review-actions">
            <button className="btn-danger-outline" onClick={onUseOriginal}>
              Continue with original
            </button>
            <button className="btn-primary" onClick={handleUseAnonymized} disabled={selectedNames.size === 0}>
              Use anonymized transcript
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
