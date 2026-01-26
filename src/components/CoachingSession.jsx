import React, { useState, useRef, useEffect } from 'react';
import { sendCoachingMessage } from '../utils/llmService';
import './CoachingSession.css';

const INITIAL_COACH_MESSAGE = `Hello! I'm here to help you reflect on your recent class through conversation rather than direct feedback.

Before I share any observations, I'd love to hear from you first — **how do you feel the class went overall?** What moments stand out to you, whether they felt successful or challenging?`;

export const CoachingSession = ({ transcript, onShowToast }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: INITIAL_COACH_MESSAGE }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input after loading completes
  useEffect(() => {
    if (!isLoading && hasStarted) {
      inputRef.current?.focus();
    }
  }, [isLoading, hasStarted]);

  const handleSendMessage = async () => {
    const apiKey = localStorage.getItem('openai_key');
    if (!apiKey) {
      onShowToast?.('Please add your OpenAI API key in Settings.', 'error');
      return;
    }

    const userMessage = inputValue.trim();
    if (!userMessage) return;

    setHasStarted(true);
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Build conversation history (excluding the initial assistant message for cleaner context)
      const historyForAPI = messages
        .filter((_, i) => i > 0) // Skip initial greeting for API
        .map(m => ({ role: m.role, content: m.content }));

      const response = await sendCoachingMessage(
        historyForAPI,
        userMessage,
        transcript,
        apiKey
      );

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      const errorMessage = err.message.includes('rate')
        ? 'Rate limit reached. Please wait a moment and try again.'
        : `Failed to send message: ${err.message}`;
      onShowToast?.(errorMessage, 'error');
      // Remove the user message if the API call failed
      setMessages(prev => prev.slice(0, -1));
      setInputValue(userMessage); // Restore the input
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartOver = () => {
    setMessages([{ role: 'assistant', content: INITIAL_COACH_MESSAGE }]);
    setHasStarted(false);
    setInputValue('');
  };

  return (
    <div className="coaching-session">
      <div className="coaching-header">
        <div className="coaching-title">
          <span className="coaching-icon" aria-hidden="true">💬</span>
          <div>
            <h3>Coaching Conversation</h3>
            <p className="coaching-subtitle">Reflect on your teaching through guided dialogue</p>
          </div>
        </div>
        {hasStarted && (
          <button
            className="text-btn"
            onClick={handleStartOver}
            aria-label="Start a new coaching conversation"
          >
            Start Over
          </button>
        )}
      </div>

      <div className="coaching-explainer">
        <p>
          Level 3 coaching uses a <strong>Socratic approach</strong> — instead of giving you direct feedback,
          your coach helps you discover insights through reflection and guided questions.
        </p>
      </div>

      <div className="coaching-messages" role="log" aria-live="polite">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`coaching-message ${msg.role === 'user' ? 'user-message' : 'coach-message'}`}
          >
            {msg.role === 'assistant' && (
              <div className="message-avatar" aria-hidden="true">🎓</div>
            )}
            <div className="message-content">
              <div className="message-role">
                {msg.role === 'user' ? 'You' : 'Coach'}
              </div>
              <div className="message-text">
                {msg.content.split('\n').map((line, i) => (
                  <p key={i}>{line || <br />}</p>
                ))}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="coaching-message coach-message">
            <div className="message-avatar" aria-hidden="true">🎓</div>
            <div className="message-content">
              <div className="message-role">Coach</div>
              <div className="message-text typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="coaching-input-area">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Share your thoughts or respond to the coach..."
          disabled={isLoading}
          rows={2}
          aria-label="Your message to the coach"
        />
        <button
          className="btn-primary send-btn"
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
          aria-label="Send message"
        >
          {isLoading ? (
            <span className="loading-spinner" aria-hidden="true"></span>
          ) : (
            <span aria-hidden="true">→</span>
          )}
        </button>
      </div>

      <div className="coaching-tips">
        <p><strong>Tips for a productive session:</strong></p>
        <ul>
          <li>Share honest reflections — there are no wrong answers</li>
          <li>Ask for specific observations from your transcript</li>
          <li>Discuss moments that felt uncertain or challenging</li>
        </ul>
      </div>
    </div>
  );
};
