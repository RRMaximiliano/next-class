import React, { useState, useRef, useEffect } from 'react';
import { sendCoachingMessageStream, sendDirectSuggestionsMessageStream } from '../utils/llmService';
import { renderInlineMarkdown } from '../utils/renderMarkdown';
import { formatCoachingAsMarkdown, copyToClipboard, downloadAsFile } from '../utils/exportUtils';
import { ConfirmDialog } from './ConfirmDialog';
import './CoachingSession.css';

const INITIAL_COACH_MESSAGE = `Hello! I'm here to help you reflect on your recent class through conversation rather than direct feedback.

Before I share any observations, I'd love to hear from you first — **how do you feel the class went overall?** What moments stand out to you, whether they felt successful or challenging?`;

export const CoachingSession = ({ transcript, onShowToast, messages: externalMessages, onMessagesChange }) => {
  // Use external state if provided (lifted to SessionHub), otherwise local
  const [localMessages, setLocalMessages] = useState([
    { role: 'assistant', content: INITIAL_COACH_MESSAGE }
  ]);

  const messages = externalMessages || localMessages;
  const setMessages = onMessagesChange || setLocalMessages;

  // Initialize messages if external state is null (first mount)
  useEffect(() => {
    if (externalMessages === null && onMessagesChange) {
      onMessagesChange([{ role: 'assistant', content: INITIAL_COACH_MESSAGE }]);
    }
  }, []);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isDirectMode, setIsDirectMode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [streamingContent, setStreamingContent] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Detect if conversation has started from restored messages
  useEffect(() => {
    if (messages.length > 1) {
      setHasStarted(true);
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Scroll during streaming
  useEffect(() => {
    if (streamingContent !== null) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingContent]);

  // Focus input after loading completes
  useEffect(() => {
    if (!isLoading && hasStarted) {
      inputRef.current?.focus();
    }
  }, [isLoading, hasStarted]);

  // Abort streaming on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Count user exchanges for "Give me suggestions" visibility
  const userMessageCount = messages.filter(m => m.role === 'user').length;

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

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Build conversation history (excluding the initial assistant message for cleaner context)
      const historyForAPI = messages
        .filter((_, i) => i > 0) // Skip initial greeting for API
        .map(m => ({ role: m.role, content: m.content }));

      setStreamingContent('');

      const finalText = await sendCoachingMessageStream(
        historyForAPI,
        userMessage,
        transcript,
        apiKey,
        null,
        isDirectMode,
        {
          onChunk: (_delta, accumulated) => {
            setStreamingContent(accumulated);
          },
          signal: controller.signal,
        }
      );

      setStreamingContent(null);
      setMessages(prev => [...prev, { role: 'assistant', content: finalText }]);
    } catch (err) {
      setStreamingContent(null);
      if (err.name === 'AbortError') return;
      // If partial content was delivered, show it
      if (err.partialContent) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: err.partialContent + '\n\n*(Response was interrupted)*',
        }]);
      } else {
        const errorMessage = err.message?.includes('rate')
          ? 'Rate limit reached. Please wait a moment and try again.'
          : `Failed to send message: ${err.message}`;
        onShowToast?.(errorMessage, 'error');
        // Remove the user message if the API call failed
        setMessages(prev => prev.slice(0, -1));
        setInputValue(userMessage); // Restore the input
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleGiveSuggestions = async () => {
    const apiKey = localStorage.getItem('openai_key');
    if (!apiKey) {
      onShowToast?.('Please add your OpenAI API key in Settings.', 'error');
      return;
    }

    setIsDirectMode(true);
    setIsLoading(true);

    // Add a system-like user message to indicate the switch
    setMessages(prev => [...prev, { role: 'user', content: '(I\'d like direct suggestions now.)' }]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const historyForAPI = messages
        .filter((_, i) => i > 0)
        .map(m => ({ role: m.role, content: m.content }));

      setStreamingContent('');

      const finalText = await sendDirectSuggestionsMessageStream(
        historyForAPI,
        transcript,
        apiKey,
        null,
        {
          onChunk: (_delta, accumulated) => {
            setStreamingContent(accumulated);
          },
          signal: controller.signal,
        }
      );

      setStreamingContent(null);
      setMessages(prev => [...prev, { role: 'assistant', content: finalText }]);
    } catch (err) {
      setStreamingContent(null);
      if (err.name === 'AbortError') return;
      if (err.partialContent) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: err.partialContent + '\n\n*(Response was interrupted)*',
        }]);
      } else {
        onShowToast?.(`Failed to get suggestions: ${err.message}`, 'error');
        // Remove the placeholder message
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyConversation = async () => {
    const md = formatCoachingAsMarkdown(messages);
    const ok = await copyToClipboard(md);
    onShowToast?.(ok ? 'Conversation copied!' : 'Failed to copy', ok ? 'success' : 'error');
  };

  const handleDownloadConversation = () => {
    const md = formatCoachingAsMarkdown(messages);
    downloadAsFile(md, 'coaching-conversation.md');
    onShowToast?.('Conversation downloaded!', 'success');
  };

  const handleStartOver = () => {
    if (messages.length <= 1) {
      doStartOver();
    } else {
      setShowResetConfirm(true);
    }
  };

  const doStartOver = () => {
    setShowResetConfirm(false);
    setMessages([{ role: 'assistant', content: INITIAL_COACH_MESSAGE }]);
    setHasStarted(false);
    setIsDirectMode(false);
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
          <div className="coaching-header-actions">
            <button className="text-btn" onClick={handleCopyConversation} aria-label="Copy conversation">
              Copy
            </button>
            <button className="text-btn" onClick={handleDownloadConversation} aria-label="Download conversation">
              Download
            </button>
            <button className="text-btn" onClick={handleStartOver} aria-label="Start a new coaching conversation">
              Start Over
            </button>
          </div>
        )}
      </div>

      <div className="coaching-explainer">
        <p>
          Level 3 coaching uses a <strong>Socratic approach</strong> — instead of giving you direct feedback,
          your coach helps you discover insights through reflection and guided questions.
        </p>
      </div>

      <div className="coaching-messages" role="log" aria-live="polite">
        {!hasStarted && (
          <div className="coaching-tips-inline">
            <p><strong>Tips for a productive session:</strong></p>
            <ul>
              <li>Share honest reflections — there are no wrong answers</li>
              <li>Ask for specific observations from your transcript</li>
              <li>Discuss moments that felt uncertain or challenging</li>
            </ul>
          </div>
        )}
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
                  <p key={i}>{line ? renderInlineMarkdown(line) : <br />}</p>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator — shown until first token arrives */}
        {isLoading && streamingContent === null && (
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

        {/* Streaming content — shown as tokens arrive */}
        {streamingContent !== null && streamingContent.length > 0 && (
          <div className="coaching-message coach-message">
            <div className="message-avatar" aria-hidden="true">🎓</div>
            <div className="message-content">
              <div className="message-role">Coach</div>
              <div className="message-text">
                {streamingContent.split('\n').map((line, i) => (
                  <p key={i}>{line ? renderInlineMarkdown(line) : <br />}</p>
                ))}
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
          className="send-btn"
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

      {/* "Give me suggestions" escape hatch (Sprint 2B) */}
      {userMessageCount >= 2 && !isDirectMode && (
        <div className="coaching-escape-hatch">
          <button
            className="btn-secondary btn-sm"
            onClick={handleGiveSuggestions}
            disabled={isLoading}
          >
            Just give me suggestions
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Start over?"
        message="Start a new coaching conversation? Your current conversation will be lost."
        confirmLabel="Start Over"
        variant="danger"
        onConfirm={doStartOver}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};
