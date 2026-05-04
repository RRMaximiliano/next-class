import React, { useMemo, useRef, useState } from 'react';
import {
  anonymizeFileName,
  anonymizeTranscript,
  detectNames,
  normalizeDetectedName,
  parseRoster,
} from '../utils/transcriptAnonymizer';

const SOURCE_LABELS = {
  manual: 'manual',
  'full-name': 'full name',
  title: 'title',
  speaker: 'speaker label',
  'self-identification': 'self-introduction',
  'in-context': 'context',
  'roster-exact': 'roster',
  'roster-part': 'roster',
};

const sourceLabel = (source) => {
  if (source.startsWith('repeated-')) return source.replace('repeated-', 'repeated ');
  return SOURCE_LABELS[source] || source;
};

const NameOption = ({ detection, checked, onToggle }) => {
  const sourceLabels = [...new Set(detection.sources.map(sourceLabel))];

  return (
    <label className={`privacy-name-option ${checked ? 'is-selected' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(detection.name)}
      />
      <div className="privacy-name-main">
        <span className="privacy-name-text">{detection.name}</span>
        <span className={`privacy-confidence-pill privacy-confidence-${detection.bucket}`}>
          {detection.bucket === 'likely' ? 'likely' : detection.bucket === 'review' ? 'review' : 'lower confidence'}
        </span>
      </div>
      <span className="privacy-name-sources">
        {sourceLabels.map(label => (
          <span className="privacy-source-pill" key={label}>{label}</span>
        ))}
      </span>
    </label>
  );
};

const mergeSelectionWithNewLikely = (current, nextDetections, previousDetections, manualNames) => {
  const next = new Set(current);
  const previousNames = new Set(previousDetections.map(detection => normalizeDetectedName(detection.name)));

  nextDetections.forEach((detection) => {
    if (detection.bucket === 'likely' && !previousNames.has(normalizeDetectedName(detection.name))) {
      next.add(detection.name);
    }
  });

  manualNames.forEach(name => next.add(name));
  return next;
};

const filterSelectedNames = (current, targetNames, shouldSelect) => {
  const next = new Set(current);

  targetNames.forEach((name) => {
    if (shouldSelect) {
      next.add(name);
    } else {
      next.delete(name);
    }
  });

  return next;
};

const formatDeepScanResult = (count) => {
  if (count <= 0) return 'Deeper local scan found no additional matches.';
  return `Deeper local scan found ${count} additional match${count === 1 ? '' : 'es'}.`;
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
  const [rosterNames, setRosterNames] = useState([]);
  const [rosterLabel, setRosterLabel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualNames, setManualNames] = useState([]);
  const [showOptional, setShowOptional] = useState(false);
  const [scanMode, setScanMode] = useState('default');
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [deepScanResult, setDeepScanResult] = useState('');
  const fileInputRef = useRef(null);

  const detections = useMemo(
    () => detectNames(content, rosterNames, { mode: scanMode }),
    [content, rosterNames, scanMode]
  );

  const manualDetections = useMemo(
    () => manualNames.map(name => ({
      name,
      score: 999,
      bucket: 'likely',
      sources: ['manual'],
    })),
    [manualNames]
  );

  const combinedDetections = useMemo(() => {
    const merged = new Map();

    [...detections, ...manualDetections].forEach((detection) => {
      const key = normalizeDetectedName(detection.name).toLowerCase();
      if (!merged.has(key)) {
        merged.set(key, {
          ...detection,
          sources: [...detection.sources],
        });
        return;
      }

      const existing = merged.get(key);
      existing.score = Math.max(existing.score, detection.score);
      existing.bucket = existing.bucket === 'likely' || detection.bucket === 'likely'
        ? 'likely'
        : existing.bucket === 'review' || detection.bucket === 'review'
          ? 'review'
          : 'optional';
      existing.sources = [...new Set([...existing.sources, ...detection.sources])];
    });

    return [...merged.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }, [detections, manualDetections]);

  const [selectedNames, setSelectedNames] = useState(() => new Set(
    [...initialDetections, ...manualDetections]
      .filter(detection => detection.bucket === 'likely')
      .map(detection => detection.name)
  ));

  const filteredDetections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return combinedDetections;
    return combinedDetections.filter(detection => detection.name.toLowerCase().includes(query));
  }, [combinedDetections, searchQuery]);

  const likelyDetections = filteredDetections.filter(detection => detection.bucket === 'likely');
  const reviewDetections = filteredDetections.filter(detection => detection.bucket === 'review');
  const optionalDetections = filteredDetections.filter(detection => detection.bucket === 'optional');
  const strongerDetections = [...likelyDetections, ...reviewDetections];

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

  const selectStrongerMatches = () => {
    setSelectedNames((current) => filterSelectedNames(
      current,
      strongerDetections.map(detection => detection.name),
      true
    ));
  };

  const clearStrongerMatches = () => {
    setSelectedNames((current) => filterSelectedNames(
      current,
      strongerDetections.map(detection => detection.name),
      false
    ));
  };

  const selectOptionalMatches = () => {
    setSelectedNames((current) => filterSelectedNames(
      current,
      optionalDetections.map(detection => detection.name),
      true
    ));
  };

  const clearOptionalMatches = () => {
    setSelectedNames((current) => filterSelectedNames(
      current,
      optionalDetections.map(detection => detection.name),
      false
    ));
  };

  const handleRosterUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const rosterText = await file.text();
    const roster = parseRoster(rosterText);
    const nextDetections = detectNames(content, roster.variants, { mode: scanMode });

    setRosterNames(roster.variants);
    setRosterLabel(
      roster.studentCount > 0
        ? `${roster.studentCount} student${roster.studentCount === 1 ? '' : 's'} loaded`
        : 'No students found in roster'
    );
    setSelectedNames((current) => mergeSelectionWithNewLikely(current, nextDetections, detections, manualNames));
  };

  const handleRunDeepScan = () => {
    if (scanMode === 'deep' || isDeepScanning) return;
    setIsDeepScanning(true);

    window.setTimeout(() => {
      const nextDetections = detectNames(content, rosterNames, { mode: 'deep' });
      const previousNames = new Set(detections.map(detection => normalizeDetectedName(detection.name).toLowerCase()));
      const additionalCount = nextDetections.reduce((count, detection) => (
        previousNames.has(normalizeDetectedName(detection.name).toLowerCase()) ? count : count + 1
      ), 0);
      setSelectedNames((current) => mergeSelectionWithNewLikely(current, nextDetections, detections, manualNames));
      setScanMode('deep');
      setDeepScanResult(formatDeepScanResult(additionalCount));
      setIsDeepScanning(false);
    }, 0);
  };

  const handleAddManualName = () => {
    const normalized = normalizeDetectedName(manualName);
    if (!normalized || normalized.length < 2) return;

    const existing = combinedDetections.find(
      detection => normalizeDetectedName(detection.name).toLowerCase() === normalized.toLowerCase()
    );

    if (existing) {
      setSelectedNames((current) => new Set(current).add(existing.name));
      setManualName('');
      return;
    }

    setManualNames((current) => [...current, normalized]);
    setSelectedNames((current) => new Set(current).add(normalized));
    setManualName('');
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
            <p className="privacy-review-kicker">Local privacy review</p>
            <h2 id="privacy-review-title">Review possible names before analysis</h2>
            <p>
              Decide whether to anonymize before parsing, saving, and sending the transcript to OpenAI.
              This default scan stays local in your browser. A deeper local scan broadens the search and may find
              additional possible names. Either way, the review stays editable and you can add missing names manually.
            </p>
            <div className="privacy-review-banner-actions">
              <button
                type="button"
                className="btn-secondary btn-sm privacy-deep-scan-btn"
                onClick={handleRunDeepScan}
                disabled={isDeepScanning || scanMode === 'deep'}
              >
                {isDeepScanning
                  ? 'Running deeper local scan...'
                  : scanMode === 'deep'
                    ? 'Deeper local scan complete'
                    : 'Run deeper local scan'}
              </button>
              <span className="privacy-banner-helper">Broader local pass. No AI call or network request.</span>
            </div>
            {deepScanResult && (
              <p className="privacy-banner-status" role="status">
                {deepScanResult}
              </p>
            )}
          </div>
          <button className="btn-icon btn-close privacy-modal-close" onClick={onCancel} aria-label="Cancel upload">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>

        <div className="privacy-review-body">
          <div className="privacy-review-summary">
            <div className="privacy-summary-card">
              <span className="privacy-summary-number">{combinedDetections.filter(detection => detection.bucket === 'likely').length}</span>
              <span className="privacy-summary-label">likely matches</span>
            </div>
            <div className="privacy-summary-card">
              <span className="privacy-summary-number">{combinedDetections.filter(detection => detection.bucket === 'review').length}</span>
              <span className="privacy-summary-label">needs review</span>
            </div>
            <div className="privacy-summary-card">
              <span className="privacy-summary-number">{selectedNames.size}</span>
              <span className="privacy-summary-label">selected for anonymizing</span>
            </div>
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
          </div>

          <div className="privacy-review-search-row">
            <input
              type="search"
              value={searchQuery}
              placeholder="Search detected names"
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <span>
              Showing {filteredDetections.length} of {combinedDetections.length}
            </span>
          </div>

          <div className="privacy-manual-add">
            <input
              type="text"
              value={manualName}
              placeholder="Add a missing name manually"
              onChange={(event) => setManualName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddManualName();
                }
              }}
            />
            <button className="btn-secondary btn-sm" onClick={handleAddManualName} disabled={!manualName.trim()}>
              Add name
            </button>
          </div>

          {strongerDetections.length > 0 && (
            <div className="privacy-section-topline">
              <div className="privacy-section-heading">Stronger matches</div>
              <div className="privacy-section-actions">
                <button className="text-btn" onClick={selectStrongerMatches}>Select all stronger matches</button>
                <button className="text-btn" onClick={clearStrongerMatches}>Clear stronger matches</button>
              </div>
            </div>
          )}

          {likelyDetections.length > 0 && (
            <div className="privacy-section">
              <div className="privacy-section-heading">Likely matches</div>
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
            </div>
          )}

          {reviewDetections.length > 0 && (
            <div className="privacy-section">
              <div className="privacy-section-heading">Needs review</div>
              <div className="privacy-name-list" aria-label="Review names">
                {reviewDetections.map(detection => (
                  <NameOption
                    key={detection.name}
                    detection={detection}
                    checked={selectedNames.has(detection.name)}
                    onToggle={toggleName}
                  />
                ))}
              </div>
            </div>
          )}

          {(optionalDetections.length > 0 || searchQuery) && (
            <div className="privacy-optional-section">
              <div className="privacy-optional-header">
                <button
                  className="privacy-optional-toggle"
                  onClick={() => setShowOptional(value => !value)}
                  aria-expanded={showOptional}
                >
                  {showOptional ? 'Hide' : 'Review'} {optionalDetections.length} lower-confidence match{optionalDetections.length === 1 ? '' : 'es'}
                </button>
                {showOptional && optionalDetections.length > 0 && (
                  <div className="privacy-section-actions">
                    <button className="text-btn" onClick={selectOptionalMatches}>Select all lower-confidence</button>
                    <button className="text-btn" onClick={clearOptionalMatches}>Clear lower-confidence</button>
                  </div>
                )}
              </div>
              {showOptional && (
                <div className="privacy-name-list optional" aria-label="Optional names">
                  {optionalDetections.map(detection => (
                    <NameOption
                      key={`${detection.name}-${detection.sources.join('-')}`}
                      detection={detection}
                      checked={selectedNames.has(detection.name)}
                      onToggle={toggleName}
                    />
                  ))}
                  {optionalDetections.length === 0 && (
                    <p className="privacy-empty-search">No lower-confidence matches found for that search.</p>
                  )}
                </div>
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
