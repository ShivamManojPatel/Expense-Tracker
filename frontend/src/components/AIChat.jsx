import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';

export default function AIChat() {
  const [messages, setMessages] = useState([]); // { role: 'user' | 'assistant', content }
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setError('');
    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const res = await api.post('/ai/chat', {
        message: text,
        history: messages // history before this turn — backend appends the new message itself
      });
      setMessages([...nextMessages, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the AI. Try again in a moment.');
      // Roll back the optimistic user message so it doesn't look like it was answered
      setMessages(messages);
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="section-title">Ask about your spending</div>

      <div className="ai-chat-log" ref={scrollRef}>
        {messages.length === 0 && !sending ? (
          <div className="empty-state" style={{ padding: '1.5rem 0' }}>
            <i className="ti ti-message-circle"></i>
            Ask something like "How much did I spend on food last month?"
          </div>
        ) : (
          messages.map((m, i) => (
            <div className={`ai-chat-bubble ${m.role === 'user' ? 'ai-chat-user' : 'ai-chat-assistant'}`} key={i}>
              {m.content}
            </div>
          ))
        )}
        {sending && (
          <div className="ai-chat-bubble ai-chat-assistant ai-chat-typing">
            <span></span><span></span><span></span>
          </div>
        )}
      </div>

      {error && <div className="error-banner" style={{ marginTop: 10 }}>{error}</div>}

      <form onSubmit={send} className="ai-chat-input-row">
        <input
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button className="btn btn-primary" type="submit" disabled={sending || !input.trim()} aria-label="Send">
          <i className="ti ti-send"></i>
        </button>
      </form>
    </div>
  );
}