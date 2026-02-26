import React, { useState, useRef, useEffect } from 'react';
import { fetchWithTimeout } from '../utils/llmService';
import './FollowUpChat.css';

const DEFAULT_MODEL = 'gpt-5.2';

export const FollowUpChat = ({
  transcript,
  feedbackData,
  level = 1,
  focusArea = null,
  messages: externalMessages,
  onMessagesChange,
}) => {
  // Use external state if provided, otherwise local state
  const [localMessages, setLocalMessages] = useState([]);
  const messages = externalMessages || localMessages;
  const setMessages = onMessagesChange || setLocalMessages;

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [failedMessage, setFailedMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Auto-expand if we have restored messages
  useEffect(() => {
    if (messages.length > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  }, []);

  const buildSystemContext = () => {
    const feedbackSummary = level === 1
      ? `Level 1 Feedback given:
- Framing: ${feedbackData.framing || 'Not available'}
- What worked: ${feedbackData.whatWorked?.map(w => typeof w === 'string' ? w : w.observation).join('; ') || 'Not available'}
- Experiments: ${feedbackData.experiments?.map(e => typeof e === 'string' ? e : e.suggestion).join('; ') || 'Not available'}`
      : `Level 2 Deep Dive (${focusArea || feedbackData.focusArea}):
- Why it matters: ${feedbackData.whyItMatters}
- Strengths: ${feedbackData.currentApproach?.strengths}
- Opportunity: ${feedbackData.currentApproach?.opportunity}
- Experiment: ${feedbackData.experiment?.description}
- Watch for: ${feedbackData.watchFor}`;

    return `You are a formative teaching coach having a follow-up conversation with an instructor about their recent class session.

CONTEXT:
The instructor has already received feedback based on their class transcript. They are now asking follow-up questions to better understand or apply the feedback.

${feedbackSummary}

GUIDELINES:
- Be a thoughtful, supportive colleague — not evaluative
- Ground your responses in the transcript when possible
- Keep responses concise and practical
- If asked about something not visible in the transcript, say so honestly
- Use "you" to address the instructor directly
- Focus on actionable, transferable insights
- Avoid jargon and academic language
- When uncertain, acknowledge it

The transcript for reference is available but keep responses focused on what the instructor asks.`;
  };

  const handleSend = async (retryText = null) => {
    const userMessage = retryText || inputValue.trim();
    if (!userMessage || isLoading) return;

    const apiKey = localStorage.getItem('openai_key');
    if (!apiKey) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Please add your OpenAI API key in Settings to use the follow-up chat.'
      }]);
      return;
    }

    if (!retryText) {
      setInputValue('');
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    }
    setFailedMessage(null);
    setIsLoading(true);

    try {
      const model = localStorage.getItem('openai_model') || DEFAULT_MODEL;

      // Build conversation history for context
      const currentMessages = retryText ? messages : [...messages, { role: 'user', content: userMessage }];
      const conversationHistory = currentMessages.filter(m => !m.failed).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: buildSystemContext() },
            { role: 'user', content: `Here is the class transcript for reference:\n\n${transcript.substring(0, 30000)}` },
            ...conversationHistory.slice(-10), // Keep last 10 messages for context window
          ],
          temperature: 0.7,
          max_completion_tokens: 1000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message.content;

      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch {
      // Keep user message visible, show retry option
      setFailedMessage(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (failedMessage) {
      handleSend(failedMessage);
    }
  };

  const handleReset = () => {
    setFailedMessage(null);
    // Remove the last user message that failed
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
      setMessages(prev => prev.slice(0, -1));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = level === 1 ? [
    "Can you give me more examples of what worked well?",
    "How might I adapt the suggested experiment for a larger class?",
    "What should I avoid when trying the experiment?"
  ] : [
    `Why did you focus on "${focusArea || feedbackData.focusArea}" specifically?`,
    "Can you explain the watch-for signal in more detail?",
    "What if the experiment doesn't seem to work at first?"
  ];

  // Collapsed state - just show the button
  if (!isExpanded) {
    return (
      <div className="followup-chat-collapsed">
        <button
          className="btn-secondary"
          onClick={() => setIsExpanded(true)}
          aria-label="Open follow-up chat"
        >
          <span className="chat-icon" aria-hidden="true">💬</span>
          Ask a Follow-up Question
          {messages.length > 0 && <span className="chat-badge">{messages.length}</span>}
        </button>
      </div>
    );
  }

  // Expanded state - full chat interface
  return (
    <div className="followup-chat">
      <div className="chat-header">
        <h4>Follow-up Questions</h4>
        <button className="btn-secondary btn-sm" onClick={() => setIsExpanded(false)} aria-label="Minimize chat">
          Minimize
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !failedMessage && (
          <div className="chat-welcome">
            <p>Ask questions about the feedback you received. For example:</p>
            <div className="suggested-questions">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  className="suggested-question"
                  onClick={() => setInputValue(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}

        {isLoading && (
          <div className="chat-message assistant">
            <div className="message-content loading">
              <span className="typing-indicator">
                <span></span><span></span><span></span>
              </span>
            </div>
          </div>
        )}

        {failedMessage && !isLoading && (
          <div className="chat-error-state">
            <p className="chat-error-text">Failed to get a response. Check your connection and try again.</p>
            <div className="chat-error-actions">
              <button className="btn-primary btn-sm" onClick={handleRetry}>Retry</button>
              <button className="btn-secondary btn-sm" onClick={handleReset}>Dismiss</button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a follow-up question..."
          rows={2}
          disabled={isLoading}
        />
        <button
          className="btn-primary"
          onClick={() => handleSend()}
          disabled={!inputValue.trim() || isLoading}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );
};
