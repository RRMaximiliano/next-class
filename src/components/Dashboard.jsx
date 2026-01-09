import React, { useMemo, useState } from 'react';
import { classifyQuestions } from '../utils/llmService';
import './Dashboard.css';

const PRESET_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981'];


export const Dashboard = ({ analysis, onReset, apiKey }) => {
    const { totalDuration, speakers, timeline, metrics, insights } = analysis;

    // Question Anatomy State
    // Teacher Selection State
    const [selectedTeacher, setSelectedTeacher] = useState(() => {
        // Default to heuristic teacher (first in speakers list usually, or one with role 'Teacher')
        const heuristicTeacher = speakers.find(s => s.role === 'Teacher') || speakers[0];
        return heuristicTeacher ? heuristicTeacher.name : '';
    });

    // Question Anatomy State
    const [teacherClassifications, setTeacherClassifications] = useState({});
    const [studentClassifications, setStudentClassifications] = useState({});
    const [loadingTeacherClass, setLoadingTeacherClass] = useState(false);
    const [loadingStudentClass, setLoadingStudentClass] = useState(false);

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

    const handleClassify = async (type) => {
        if (!apiKey) {
            alert("Please enter an OpenAI API Key in Settings (⚙️) first.");
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
            alert("Classification failed.");
        } finally {
            if (type === 'teacher') setLoadingTeacherClass(false);
            else setLoadingStudentClass(false);
        }
    };

    // Assign colors to speakers
    const speakerColors = useMemo(() => {
        const map = {
            'Class Activity': '#94a3b8' // Gray for distinct activity blocks
        };
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
                <div className="dashboard-controls">
                    <div className="teacher-selector">
                        <label>Teacher:</label>
                        <select
                            value={selectedTeacher}
                            onChange={(e) => setSelectedTeacher(e.target.value)}
                            className="teacher-select"
                        >
                            {speakers.map(s => (
                                <option key={s.name} value={s.name}>{s.name} ({s.percentage.toFixed(0)}%)</option>
                            ))}
                        </select>
                    </div>
                    <button className="reset-btn" onClick={onReset}>Analyze Another</button>
                </div>
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
                                    backgroundColor: speakerColors[segment.speaker] || '#ccc'
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

                {/* Stats Cards Row 1 */}
                <section className="card stats-card">
                    <h3>Interaction Density</h3>
                    <div className="big-stat">
                        {metrics.turnsPerMinute.toFixed(1)}
                        <span>turns/min</span>
                    </div>
                    <p className="stat-desc">Higher values indicate more back-and-forth dialogue.</p>
                </section>

                <section className="card stats-card">
                    <h3>Avg Wait Time</h3>
                    <div className="big-stat">
                        {(insights?.avgWaitTime || 0).toFixed(1)}
                        <span>seconds</span>
                    </div>
                    <p className="stat-desc">Time between teacher question and student response.</p>
                </section>

                <section className="card stats-card">
                    <h3>Class Structure</h3>
                    <div className="mini-stat-row">
                        <div>Lecture: <strong>{formatTime(insights?.classModes?.lecture || 0)}</strong></div>
                        <div>Activity: <strong>{formatTime(insights?.classModes?.individualWork || 0)}</strong></div>
                    </div>
                </section>


                {/* NEW: Question Anatomy Tables */}
                <section className="card anatomy-tables-section" style={{ gridColumn: 'span 2' }}>
                    <h3>Question Anatomy: Question Analysis</h3>

                    {/* Teacher Questions */}
                    <div className="anatomy-block">
                        <div className="anatomy-header">
                            <h4>Teacher Questions ({teacherQs.length})</h4>
                            <button
                                className="primary-btn small-btn"
                                onClick={() => handleClassify('teacher')}
                                disabled={loadingTeacherClass || !teacherQs.length}
                            >
                                {loadingTeacherClass ? 'Analyzing...' : 'Classify with AI'}
                            </button>
                        </div>
                        {teacherQs.length > 0 ? (
                            <div className="table-container">
                                <table className="anatomy-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Question</th>
                                            <th>Category</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teacherQs.map((q) => (
                                            <tr key={q.id}>
                                                <td>{Math.floor(q.time / 60)}:{Math.floor(q.time % 60).toString().padStart(2, '0')}</td>
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
                            <p className="empty-msg">No teacher questions detected.</p>
                        )}
                    </div>

                    {/* Student Questions */}
                    <div className="anatomy-block" style={{ marginTop: '2rem' }}>
                        <div className="anatomy-header">
                            <h4>Student Questions ({studentQs.length})</h4>
                            <button
                                className="primary-btn small-btn"
                                onClick={() => handleClassify('student')}
                                disabled={loadingStudentClass || !studentQs.length}
                            >
                                {loadingStudentClass ? 'Analyzing...' : 'Classify with AI'}
                            </button>
                        </div>
                        {studentQs.length > 0 ? (
                            <div className="table-container">
                                <table className="anatomy-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Question</th>
                                            <th>Category</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentQs.map((q) => (
                                            <tr key={q.id}>
                                                <td>{Math.floor(q.time / 60)}:{Math.floor(q.time % 60).toString().padStart(2, '0')}</td>
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
                            <p className="empty-msg">No student questions detected.</p>
                        )}
                    </div>
                </section>

                {/* Speaker Breakdown */}
                <section className="card speakers-section" style={{ gridColumn: 'span 1' }}>
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
