import React, { useState, useRef, useEffect } from 'react';

/**
 * Verdi AI Assistant - Floating Chatbot Widget
 * Similar to Razorpay's RAY assistant for fintech/underwriting guidance.
 */
export default function VerdiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'verdi',
      text: 'Hi there! 👋 I am Verdi, your AI underwriting & lending assistant. How can I help you today?',
      time: 'Just now'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const QUICK_QUESTIONS = [
    { label: '📊 How does risk scoring work?', query: 'How does the risk scoring work?' },
    { label: '📁 What documents do I need?', query: 'What documents do I need to upload?' },
    { label: '⏱️ How long does approval take?', query: 'How long does approval take?' },
    { label: '🏦 What is multi-tenant lending?', query: 'How do finance companies use this platform?' },
    { label: '💬 Something else...', query: 'focus_input' }
  ];

  const KNOWLEDGE_RESPONSES = {
    'How does the risk scoring work?':
      'Verdika uses a 6-agent autonomous pipeline (DataAgent, RiskAgent, AdversarialAgent, etc.) that assesses revenue velocity, refund volatility, and category benchmarks to compute a 0-100% risk score with confidence intervals.',
    'What documents do I need to upload?':
      'You need 3 core KYC documents: 1. GST Registration Certificate (.pdf/.png), 2. PAN Card (.pdf/.png, min 600px width), and 3. Bank Statement for the last 6 months (.pdf). Plus bank account number and valid IFSC.',
    'How long does approval take?':
      'Our autonomous multi-agent pipeline processes and evaluates standard applications in under 3 seconds! Applications routed to human review are typically evaluated by underwriters within 2-4 business hours.',
    'How do finance companies use this platform?':
      'Finance institutions can register for their own tenant account, get a dedicated public application link (/apply/your-company), and review submissions in an isolated private underwriter dashboard.'
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, messages]);

  const handleSend = (textToSend = null) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    if (text === 'focus_input') {
      inputRef.current?.focus();
      return;
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      time: nowTime
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      let botReply = "I understand you're asking about: " + text + ". Verdika's multi-agent AI pipeline continuously audits risk, document quality, and transaction integrity for fast and fair loan decisions.";

      // Match canned queries
      for (const [q, ans] of Object.entries(KNOWLEDGE_RESPONSES)) {
        if (text.toLowerCase().includes(q.toLowerCase().slice(0, 15)) || q.toLowerCase().includes(text.toLowerCase())) {
          botReply = ans;
          break;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'verdi',
          text: botReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsTyping(false);
    }, 650);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="verdi-widget-container">
      {/* Floating Chat Panel */}
      {isOpen && (
        <div className="verdi-chat-panel animate-slide-up">
          {/* Header */}
          <div className="verdi-chat-header">
            <div className="verdi-header-left">
              <div className="verdi-avatar-box">
                <span className="verdi-v-logo">V</span>
                <span className="verdi-online-dot"></span>
              </div>
              <div className="verdi-header-titles">
                <div className="verdi-name-row">
                  <span className="verdi-name">Verdi</span>
                  <span className="verdi-ai-pill">AI Assistant</span>
                </div>
                <span className="verdi-subtitle">Your underwriting & lending copilot</span>
              </div>
            </div>

            <button
              type="button"
              className="verdi-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close Verdi Chat"
              title="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Chat Body / Messages */}
          <div className="verdi-chat-body">
            <div className="verdi-messages-list">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`verdi-msg-row ${msg.sender === 'user' ? 'msg-user' : 'msg-bot'}`}
                >
                  {msg.sender === 'verdi' && (
                    <div className="verdi-msg-avatar">
                      <span>V</span>
                    </div>
                  )}
                  <div className="verdi-msg-bubble">
                    <p className="verdi-msg-text">{msg.text}</p>
                    <span className="verdi-msg-time">{msg.time}</span>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="verdi-msg-row msg-bot">
                  <div className="verdi-msg-avatar"><span>V</span></div>
                  <div className="verdi-typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Pills */}
            <div className="verdi-quick-suggestions">
              <div className="verdi-suggestions-title">Suggested questions:</div>
              <div className="verdi-pills-wrap">
                {QUICK_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="verdi-suggestion-pill"
                    onClick={() => handleSend(q.query)}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer / Input */}
          <div className="verdi-chat-footer">
            <div className="verdi-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="verdi-chat-input"
                placeholder="Ask Verdi anything about loans & underwriting..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                className="verdi-send-btn"
                onClick={() => handleSend()}
                disabled={!inputValue.trim()}
                title="Send Message"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
            <div className="verdi-footer-tagline">
              ⚡ Powered by Verdika Multi-Agent AI
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        className={`verdi-floating-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? 'Close Verdi' : 'Ask Verdi AI Assistant'}
        aria-label="Ask Verdi AI Assistant"
      >
        <div className="verdi-btn-icon-wrapper">
          <span className="verdi-sparkle-icon">✨</span>
          <span className="verdi-btn-badge-logo">V</span>
        </div>
        <span className="verdi-btn-label">Ask Verdi</span>
      </button>
    </div>
  );
}
