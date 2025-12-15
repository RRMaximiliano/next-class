import React, { useMemo } from 'react';
import './Dashboard.css';

const PRESET_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981'];

export const Dashboard = ({ analysis, onReset }) => {
    const { totalDuration, speakers, timeline, metrics } = analysis;

    // Assign colors to speakers
    const speakerColors = useMemo(() => {
        const map = {};
        speakers.forEach((s, i) => {
            map[s.name] = PRESET_COLORS[i % PRESET_COLORS.length];
        });
        return map;
    }, [speakers]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="dashboard fade-in">
            <div className="dashboard-header">
                <div>
                    <h2>Class Anatomy</h2>
                    <p>Analysis of {speakers.length} speakers over {formatTime(totalDuration)}</p>
                </div>
                <button className="reset-btn" onClick={onReset}>Analyze Another</button>
            </div>

            <div className="grid-layout">
                {/* Main Timeline - The "Anatomy" */}
                <section className="card timeline-section">
                    <h3>Interaction Timeline</h3>
                    <div className="timeline-container">
                        {timeline.map((segment, idx) => (
                            <div
                                key={idx}
                                className="timeline-segment"
                                style={{
                                    left: `${(segment.start / totalDuration) * 100}%`,
                                    width: `${((segment.end - segment.start) / totalDuration) * 100}%`,
                                    backgroundColor: speakerColors[segment.speaker]
                                }}
                                title={`${segment.speaker}: ${formatTime(segment.start)} - ${formatTime(segment.end)}`}
                            />
                        ))}
                    </div>
                    <div className="timeline-labels">
                        <span>0m</span>
                        <span>{formatTime(totalDuration / 2)}</span>
                        <span>{formatTime(totalDuration)}</span>
                    </div>
                </section>

                {/* Stats Cards */}
                <section className="card stats-card">
                    <h3>Interaction Density</h3>
                    <div className="big-stat">
                        {metrics.turnsPerMinute.toFixed(1)}
                        <span>turns/min</span>
                    </div>
                    <p className="stat-desc">Higher values indicate more back-and-forth dialogue.</p>
                </section>

                <section className="card stats-card">
                    <h3>Total Words</h3>
                    <div className="big-stat">
                        {metrics.totalWords.toLocaleString()}
                        <span>words</span>
                    </div>
                </section>

                {/* Speaker Breakdown */}
                <section className="card speakers-section">
                    <h3>Speaking Time</h3>
                    <div className="speakers-list">
                        {speakers.map((s) => (
                            <div key={s.name} className="speaker-row">
                                <div className="speaker-info">
                                    <span className="speaker-name" style={{ color: speakerColors[s.name] }}>{s.name}</span>
                                    <span className="speaker-time">{formatTime(s.totalTime)} ({s.percentage.toFixed(1)}%)</span>
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
            </div>
        </div>
    );
};
