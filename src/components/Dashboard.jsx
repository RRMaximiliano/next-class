import React, { useMemo, useState, useEffect, useCallback, memo } from 'react';
import { classifyQuestions } from '../utils/llmService';
import { calculateWaitTime } from '../utils/classAnatomy';
import './Dashboard.css';

const PRESET_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981'];

// Memoized timeline segment for performance with long transcripts
// data-role attribute enables colorblind-accessible CSS patterns
const TimelineSegment = memo(({ segment, idx, totalDuration, groupColor, groupLabel, isHovered, onHover, onLeave, formatTime }) => (
  <div
    className={`timeline-segment ${isHovered ? 'hovered' : ''}`}
    data-role={groupLabel === 'Instructor' ? 'Teacher' : groupLabel === 'Student' ? 'Student' : 'Silence'}
    style={{
      left: `${(segment.start / totalDuration) * 100}%`,
      width: `${((segment.end - segment.start) / totalDuration) * 100}%`,
      backgroundColor: groupColor
    }}
    onMouseEnter={() => onHover(idx)}
    onMouseLeave={onLeave}
    role="img"
    aria-label={`${groupLabel}: ${segment.speaker}, ${formatTime(segment.start)} to ${formatTime(segment.end)}`}
  >
    {isHovered && (
      <div className="timeline-tooltip" role="tooltip">
        <strong style={{ color: groupColor }}>{groupLabel}: {segment.speaker}</strong>
        <span>{formatTime(segment.start)} – {formatTime(segment.end)}</span>
        <span className="tooltip-duration">{formatTime(segment.end - segment.start)}</span>
      </div>
    )}
  </div>
));


export const Dashboard = ({ analysis, onReset, apiKey, onTeacherChange, initialTeacher, onShowToast }) => {
  const { totalDuration, speakers, timeline, metrics, insights, silenceGaps, rawTranscriptData, hasTimestamps, hasSpeakerLabels } = analysis;

  // Question Anatomy State
  // Teacher Selection State
  const [selectedTeacher, setSelectedTeacher] = useState(() => {
    // Use initialTeacher if provided, otherwise use heuristic
    if (initialTeacher) {
      return initialTeacher;
    }
    // Default to heuristic teacher (first in speakers list usually, or one with role 'Teacher')
    const heuristicTeacher = speakers.find(s => s.role === 'Teacher') || speakers[0];
    return heuristicTeacher ? heuristicTeacher.name : '';
  });

  // Question Anatomy State
  const [teacherClassifications, setTeacherClassifications] = useState({});
  const [studentClassifications, setStudentClassifications] = useState({});
  const [loadingTeacherClass, setLoadingTeacherClass] = useState(false);
  const [loadingStudentClass, setLoadingStudentClass] = useState(false);

  // Timeline hover tooltip state
  const [hoveredSegment, setHoveredSegment] = useState(null);

  // Dynamic wait time state (recalculated when teacher changes)
  const [dynamicWaitTime, setDynamicWaitTime] = useState(null);

  // Collapsed/expanded state for pauses grouped by speaker
  const [expandedPauseSpeakers, setExpandedPauseSpeakers] = useState({});

  // Recalculate wait time when selectedTeacher changes
  useEffect(() => {
    if (rawTranscriptData && selectedTeacher) {
      const waitTimeMetrics = calculateWaitTime(rawTranscriptData, selectedTeacher);
      setDynamicWaitTime(waitTimeMetrics);
    }
  }, [rawTranscriptData, selectedTeacher]);

  // Derived Questions based on Selected Teacher
  const { teacherQs, studentQs } = useMemo(() => {
    const allQuestions = insights.questions || []; // New unified array

    // Fallback for backward compatibility if insights.questions undefined
    if (!insights.questions) {
      return {
        teacherQs: insights.rawTeacherQuestions || [],
        studentQs: insights.rawStudentQuestions || []
      };
    }

    return {
      teacherQs: allQuestions.filter(q => q.speaker === selectedTeacher),
      studentQs: allQuestions.filter(q => q.speaker !== selectedTeacher)
    };
  }, [insights, selectedTeacher]);

  // Group silence gaps by preceding speaker for collapsible display
  const groupedGaps = useMemo(() => {
    if (!silenceGaps) return {};
    return silenceGaps.reduce((acc, gap) => {
      const key = gap.precedingSpeaker;
      if (!acc[key]) acc[key] = [];
      acc[key].push(gap);
      return acc;
    }, {});
  }, [silenceGaps]);

  const handleClassify = async (type) => {
    if (!apiKey) {
      onShowToast?.("Please enter an OpenAI API Key in Settings first.", 'error');
      return;
    }

    const qList = type === 'teacher' ? teacherQs : studentQs;

    if (!qList || qList.length === 0) return;

    if (type === 'teacher') setLoadingTeacherClass(true);
    else setLoadingStudentClass(true);

    try {
      const results = await classifyQuestions(qList, type, apiKey);
      if (type === 'teacher') setTeacherClassifications(results);
      else setStudentClassifications(results);
    } catch (error) {
      console.error(error);
      onShowToast?.("Classification failed. Please try again.", 'error');
    } finally {
      if (type === 'teacher') setLoadingTeacherClass(false);
      else setLoadingStudentClass(false);
    }
  };

  // Individual speaker colors (for detailed views like Speaking Time breakdown)
  const speakerColors = useMemo(() => {
    const map = {
      'Activity/Silence': '#e5e7eb', // Light gray for activity/silence
      'Brief Pause': '#f3f4f6' // Very light gray for brief pauses
    };
    speakers.forEach((s, i) => {
      if (s.role !== 'System') {
        map[s.name] = PRESET_COLORS[i % PRESET_COLORS.length];
      }
    });
    return map;
  }, [speakers]);

  // Grouped timeline colors (Instructor, Students, Activity/Silence)
  const timelineGroupColors = useMemo(() => ({
    instructor: '#6366f1',      // Indigo for instructor
    students: '#14b8a6',        // Teal for all students
    activity: '#e5e7eb'         // Light gray for activity/silence
  }), []);

  // Get timeline color based on speaker group
  const getTimelineColor = (speakerName) => {
    if (speakerName === 'Activity/Silence' || speakerName === 'Brief Pause') {
      return timelineGroupColors.activity;
    }
    if (speakerName === selectedTeacher) {
      return timelineGroupColors.instructor;
    }
    return timelineGroupColors.students;
  };

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  }, []);

  // Memoized hover handlers for timeline
  const handleSegmentHover = useCallback((idx) => setHoveredSegment(idx), []);
  const handleSegmentLeave = useCallback(() => setHoveredSegment(null), []);

  // Memoize processed timeline data for performance
  const processedTimeline = useMemo(() => {
    return timeline.map((segment) => ({
      ...segment,
      groupColor: getTimelineColor(segment.speaker),
      groupLabel: segment.speaker === selectedTeacher ? 'Instructor'
        : (segment.speaker === 'Activity/Silence' || segment.speaker === 'Brief Pause') ? 'Activity/Silence'
        : 'Student'
    }));
  }, [timeline, selectedTeacher, getTimelineColor]);

  return (
    <div className="dashboard fade-in">
      <div className="dashboard-header">
        <div>
          <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>Session Data</h3>
          <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.875rem' }}>
            Analysis of {speakers.filter(s => s.role !== 'System').length} speakers
            {hasTimestamps !== false ? ` over ${formatTime(totalDuration)}` : ` • ${metrics.totalWords.toLocaleString()} words`}
          </p>
          {hasTimestamps === false && hasSpeakerLabels !== false && (
            <p style={{ color: 'var(--color-warning-dark, #92400e)', margin: '0.5rem 0 0 0', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>⚠️</span> Transcript has no timestamps. Some timing metrics are unavailable.
            </p>
          )}
          {hasSpeakerLabels === false && (
            <p style={{ color: 'var(--color-info-dark, #1e40af)', margin: '0.5rem 0 0 0', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>ℹ️</span> Transcript has no speaker labels. Speaker analytics are unavailable, but AI feedback works normally.
            </p>
          )}
        </div>
        {hasSpeakerLabels !== false && (
          <div className="dashboard-controls">
            <div className="teacher-selector">
              <label>Instructor:</label>
              <select
                value={selectedTeacher}
                onChange={(e) => {
                  setSelectedTeacher(e.target.value);
                  // Notify parent about teacher change
                  if (onTeacherChange) {
                    onTeacherChange(e.target.value, speakers);
                  }
                }}
                className="teacher-select"
              >
                {speakers.filter(s => s.role !== 'System').map(s => (
                  <option key={s.name} value={s.name}>{s.name} ({s.percentage.toFixed(0)}%)</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Prominent Talk Time Stats - Dynamic based on selected instructor (only with speaker labels) */}
      {hasSpeakerLabels !== false && (() => {
        const instructorSpeaker = speakers.find(s => s.name === selectedTeacher);
        const studentSpeakers = speakers.filter(s => s.name !== selectedTeacher && s.role !== 'System');
        const studentTotalPercent = studentSpeakers.reduce((sum, s) => sum + (s.percentage || 0), 0);
        const studentTotalTime = studentSpeakers.reduce((sum, s) => sum + (s.totalTime || 0), 0);
        const studentTotalWords = studentSpeakers.reduce((sum, s) => sum + (s.words || 0), 0);
        const silenceSpeaker = speakers.find(s => s.role === 'System');

        return (
          <div className="talk-time-hero">
            <div className="talk-stat" style={{ borderLeftColor: timelineGroupColors.instructor }}>
              <span className="talk-stat-label">Instructor ({selectedTeacher})</span>
              <span className="talk-stat-value">{instructorSpeaker?.percentage?.toFixed(0) || 0}%</span>
              <span className="talk-stat-time">
                {hasTimestamps !== false
                  ? formatTime(instructorSpeaker?.totalTime || 0)
                  : `${(instructorSpeaker?.words || 0).toLocaleString()} words`}
              </span>
            </div>
            <div className="talk-stat" style={{ borderLeftColor: timelineGroupColors.students }}>
              <span className="talk-stat-label">Students ({studentSpeakers.length})</span>
              <span className="talk-stat-value">{studentTotalPercent.toFixed(0)}%</span>
              <span className="talk-stat-time">
                {hasTimestamps !== false
                  ? formatTime(studentTotalTime)
                  : `${studentTotalWords.toLocaleString()} words`}
              </span>
            </div>
            {hasTimestamps !== false && silenceSpeaker && silenceSpeaker.percentage > 0 && (
              <div className="talk-stat" style={{ borderLeftColor: timelineGroupColors.activity }}>
                <span className="talk-stat-label">Activity/Silence</span>
                <span className="talk-stat-value">{silenceSpeaker.percentage.toFixed(0)}%</span>
                <span className="talk-stat-time">{formatTime(silenceSpeaker.totalTime)}</span>
              </div>
            )}
          </div>
        );
      })()}

      <div className="grid-layout">
        {/* Main Timeline - The "Anatomy" (only with timestamps) */}
        {hasTimestamps !== false && (
          <section className="panel timeline-section">
            <h3>Interaction Timeline</h3>
            <div className="timeline-container">
              {processedTimeline.map((segment, idx) => (
                <TimelineSegment
                  key={idx}
                  segment={segment}
                  idx={idx}
                  totalDuration={totalDuration}
                  groupColor={segment.groupColor}
                  groupLabel={segment.groupLabel}
                  isHovered={hoveredSegment === idx}
                  onHover={handleSegmentHover}
                  onLeave={handleSegmentLeave}
                  formatTime={formatTime}
                />
              ))}
            </div>
            <div className="timeline-labels">
              <span>0m</span>
              <span>{formatTime(totalDuration / 2)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
            {/* Timeline Legend - Grouped */}
            <div className="timeline-legend">
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: timelineGroupColors.instructor }}></span>
                <span className="legend-label">Instructor</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: timelineGroupColors.students }}></span>
                <span className="legend-label">Students</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: timelineGroupColors.activity }}></span>
                <span className="legend-label">Activity/Silence</span>
              </div>
            </div>
          </section>
        )}

        {/* Stats Cards Row 1 (only with timestamps) */}
        {hasTimestamps !== false && (
          <>
            <section className="panel stats-card" title="Interaction Density = Total speaker turns ÷ Session duration in minutes. Measures how frequently the conversation switches between speakers.">
              <h3>Interaction Density</h3>
              <div className="big-stat">
                {metrics.turnsPerMinute?.toFixed(1) || 'N/A'}
                <span>turns/min</span>
              </div>
              <p className="stat-desc">Total turns ÷ minutes. Higher = more dialogue.</p>
            </section>

            <section className="panel stats-card" title="Average time between when you ask a question and when a student begins responding. Research suggests 3-5 seconds leads to better student responses.">
              <h3>Avg Wait Time</h3>
              <div className="big-stat">
                {(dynamicWaitTime?.avgWaitTime ?? insights?.avgWaitTime ?? 0).toFixed(1)}
                <span>seconds</span>
              </div>
              <p className="stat-desc">Time between {selectedTeacher}'s questions and student response.</p>
            </section>

            <section className="panel stats-card" title="Speaking: Total time with active speech. Gaps/Activity: Periods of 3+ seconds without speech (may indicate individual work, group activities, or transitions).">
              <h3>Class Structure</h3>
              <div className="mini-stat-row">
                <div>Speaking: <strong>{formatTime(insights?.classModes?.lecture || 0)}</strong></div>
                <div>Gaps/Activity: <strong>{formatTime((insights?.classModes?.activity || 0) + (insights?.classModes?.silence || 0))}</strong></div>
              </div>
              <div className="mini-stat-row" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                <div title="Gaps of 10+ seconds, likely indicating group work or individual activities">Activity periods: <strong>{metrics?.activityGapCount || 0}</strong></div>
                <div title="Gaps of 3-10 seconds, likely transitions or thinking time">Brief pauses: <strong>{metrics?.briefPauseCount || 0}</strong></div>
              </div>
            </section>
          </>
        )}

        {/* Total Turns stat for non-timestamp mode (but with speaker labels) */}
        {hasTimestamps === false && hasSpeakerLabels !== false && (
          <section className="panel stats-card" style={{ gridColumn: 'span 3' }}>
            <h3>Conversation Stats</h3>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div className="big-stat">
                {rawTranscriptData?.length || 0}
                <span>total turns</span>
              </div>
              <div className="big-stat">
                {metrics.totalWords?.toLocaleString() || 0}
                <span>total words</span>
              </div>
            </div>
            <p className="stat-desc">Upload a transcript with timestamps for detailed timing analysis.</p>
          </section>
        )}

        {/* Stats for unstructured transcripts (no speaker labels) */}
        {hasSpeakerLabels === false && (
          <section className="panel stats-card" style={{ gridColumn: 'span 3' }}>
            <h3>Transcript Overview</h3>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div className="big-stat">
                {rawTranscriptData?.length || 0}
                <span>paragraphs</span>
              </div>
              <div className="big-stat">
                {metrics.totalWords?.toLocaleString() || 0}
                <span>total words</span>
              </div>
            </div>
            <p className="stat-desc" style={{ marginTop: '1rem' }}>
              This transcript has no speaker labels. Speaker breakdown and question attribution are unavailable.
              <br />
              <strong>AI feedback is fully functional</strong> – use the Main Feedback, Go Deeper, or Coaching tabs for analysis.
            </p>
          </section>
        )}


        {/* Question Anatomy Tables (only with speaker labels) */}
        {hasSpeakerLabels !== false && (
          <section className="panel anatomy-tables-section" style={{ gridColumn: 'span 2' }}>
            <h3>Question Analysis</h3>

            {/* Teacher Questions */}
            <div className="anatomy-block">
              <div className="anatomy-header">
                <h4>Instructor Questions ({teacherQs.length})</h4>
                <button
                  className={`btn-primary btn-sm ${loadingTeacherClass ? 'btn-loading' : ''}`}
                  onClick={() => handleClassify('teacher')}
                  disabled={loadingTeacherClass || !teacherQs.length}
                  aria-label="Classify instructor questions with AI"
                >
                  {loadingTeacherClass ? (
                    <>
                      <span className="btn-spinner" aria-hidden="true"></span>
                      Analyzing...
                    </>
                  ) : 'Classify with AI'}
                </button>
              </div>
              {teacherQs.length > 0 ? (
                <div className="table-container">
                  <table className="anatomy-table">
                    <thead>
                      <tr>
                        {hasTimestamps !== false && <th>Time</th>}
                        <th>#</th>
                        <th>Question</th>
                        <th>Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherQs.map((q, idx) => (
                        <tr key={q.id}>
                          {hasTimestamps !== false && (
                            <td>{Math.floor(q.time / 60)}:{Math.floor(q.time % 60).toString().padStart(2, '0')}</td>
                          )}
                          <td>{idx + 1}</td>
                          <td>{q.text}</td>
                          <td>
                            <span className={`tag ${teacherClassifications[q.id] || 'pending'}`}>
                              {teacherClassifications[q.id] || '...'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-msg">No instructor questions detected. This may indicate a lecture-focused session.</p>
              )}
            </div>

            {/* Student Questions */}
            <div className="anatomy-block" style={{ marginTop: '2rem' }}>
              <div className="anatomy-header">
                <h4>Student Questions ({studentQs.length})</h4>
                <button
                  className={`btn-primary btn-sm ${loadingStudentClass ? 'btn-loading' : ''}`}
                  onClick={() => handleClassify('student')}
                  disabled={loadingStudentClass || !studentQs.length}
                  aria-label="Classify student questions with AI"
                >
                  {loadingStudentClass ? (
                    <>
                      <span className="btn-spinner" aria-hidden="true"></span>
                      Analyzing...
                    </>
                  ) : 'Classify with AI'}
                </button>
              </div>
              {studentQs.length > 0 ? (
                <div className="table-container">
                  <table className="anatomy-table">
                    <thead>
                      <tr>
                        {hasTimestamps !== false && <th>Time</th>}
                        <th>#</th>
                        <th>Question</th>
                        <th>Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentQs.map((q, idx) => (
                        <tr key={q.id}>
                          {hasTimestamps !== false && (
                            <td>{Math.floor(q.time / 60)}:{Math.floor(q.time % 60).toString().padStart(2, '0')}</td>
                          )}
                          <td>{idx + 1}</td>
                          <td>{q.text}</td>
                          <td>
                            <span className={`tag ${studentClassifications[q.id] || 'pending'}`}>
                              {studentClassifications[q.id] || '...'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-msg">No student questions detected. Consider encouraging more student inquiries.</p>
              )}
            </div>
          </section>
        )}

        {/* Speaker Breakdown (only with speaker labels) */}
        {hasSpeakerLabels !== false && (
          <section className="panel speakers-section" style={{ gridColumn: 'span 1' }}>
            <h3>{hasTimestamps !== false ? 'Speaking Time' : 'Word Count'}</h3>
            <div className="speakers-list">
              {speakers.filter(s => hasTimestamps !== false || s.role !== 'System').map((s) => (
                <div key={s.name} className="speaker-row">
                  <div className="speaker-info">
                    <span className="speaker-name" style={{ color: speakerColors[s.name] }}>{s.name}</span>
                    <span className="speaker-time">
                      {hasTimestamps !== false
                        ? `${formatTime(s.totalTime)} (${s.percentage.toFixed(1)}%)`
                        : `${s.words.toLocaleString()} words (${s.percentage.toFixed(1)}%)`}
                    </span>
                  </div>
                  <div className="progress-bg">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${s.percentage}%`,
                        backgroundColor: speakerColors[s.name]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Silence/Activity Gaps - Grouped by Preceding Speaker (only with timestamps and speaker labels) */}
        {hasTimestamps !== false && hasSpeakerLabels !== false && silenceGaps && silenceGaps.length > 0 && (
          <section className="panel" style={{ gridColumn: 'span 3' }}>
            <h3>Non-Speaking Periods ({silenceGaps.length})</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Gaps of 3+ seconds detected, grouped by preceding speaker. Click to expand.
            </p>
            <div className="table-container">
              <table className="anatomy-table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>After Speaker</th>
                    <th>Count</th>
                    <th>Total Duration</th>
                    <th>Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedGaps).map(([speaker, gaps]) => {
                    const isExpanded = expandedPauseSpeakers[speaker];
                    const totalDur = gaps.reduce((sum, g) => sum + g.duration, 0);
                    const avgDur = totalDur / gaps.length;

                    return (
                      <React.Fragment key={speaker}>
                        <tr
                          className="speaker-group-header"
                          onClick={() => setExpandedPauseSpeakers(prev => ({
                            ...prev,
                            [speaker]: !prev[speaker]
                          }))}
                          style={{ cursor: 'pointer', backgroundColor: 'var(--color-bg-subtle)' }}
                        >
                          <td>
                            <span style={{ marginRight: '0.5rem' }}>{isExpanded ? '▼' : '▶'}</span>
                            <span style={{ color: speakerColors[speaker] || 'inherit' }}>{speaker}</span>
                          </td>
                          <td>{gaps.length}</td>
                          <td>{totalDur.toFixed(1)}s</td>
                          <td>{avgDur.toFixed(1)}s</td>
                        </tr>
                        {isExpanded && gaps.map((gap, idx) => (
                          <tr key={`${speaker}-${idx}`} style={{ backgroundColor: 'var(--color-bg)' }}>
                            <td style={{ paddingLeft: '2rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              {Math.floor(gap.startTime / 60)}:{Math.floor(gap.startTime % 60).toString().padStart(2, '0')} → {gap.followingSpeaker}
                            </td>
                            <td>
                              <span className={`tag ${gap.type === 'activity' ? 'Open' : 'Uncategorized'}`}>
                                {gap.type === 'activity' ? 'Activity' : 'Pause'}
                              </span>
                            </td>
                            <td>{gap.duration.toFixed(1)}s</td>
                            <td></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
