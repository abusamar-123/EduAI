import { useState, useRef, useEffect } from 'react';
import { doubtApi } from '../services/api';

const SUBJECTS = ['All', 'Physics', 'Chemistry', 'Biology'];

export default function StudentPage({ user, onLogout }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${user.name}! 👋 I'm your EduAI Science tutor. Ask me anything from Class 9 Science — Physics, Chemistry, or Biology!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('All');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || loading) return;

    // Add user message
    const newMessages = [...messages, { role: 'user', content: question }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Format chat history (exclude greeting)
      const chatHistory = newMessages
        .slice(1)  // skip greeting
        .slice(-6) // last 3 turns
        .map(m => ({ role: m.role, content: m.content }));

      const res = await doubtApi.ask(question, chatHistory, {
        subject: subject === 'All' ? null : subject,
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer,
          sources: res.sources,
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${err.message}. Please try again.`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick question suggestions
  const suggestions = [
    "What is the difference between mixtures and compounds?",
    "Explain Rutherford's gold foil experiment",
    "What is osmosis?",
    "What is uniform motion?",
    "What are plant tissues?",
  ];

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <span style={{ fontSize: 28 }}>🎓</span>
          <span style={styles.sidebarTitle}>EduAI</span>
        </div>

        <div style={styles.userCard}>
          <div style={styles.userAvatar}>🧑‍🎓</div>
          <div>
            <div style={styles.userName}>{user.name}</div>
            <div style={styles.userRole}>Class 9 Student</div>
          </div>
        </div>

        {/* Subject Filter */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Filter by Subject</div>
          {SUBJECTS.map(s => (
            <button
              key={s}
              style={{ ...styles.subjectBtn, ...(subject === s ? styles.subjectBtnActive : {}) }}
              onClick={() => setSubject(s)}
            >
              {s === 'Physics' ? '⚡ ' : s === 'Chemistry' ? '🧪 ' : s === 'Biology' ? '🌱 ' : '📚 '}{s}
            </button>
          ))}
        </div>

        {/* Chapters reference */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Available Chapters</div>
          {[
            { ch: 2, title: 'Is Matter Pure?', sub: 'Chem' },
            { ch: 3, title: 'Atoms & Molecules', sub: 'Chem' },
            { ch: 4, title: 'Structure of Atom', sub: 'Chem' },
            { ch: 5, title: 'Cell', sub: 'Bio' },
            { ch: 6, title: 'Tissues', sub: 'Bio' },
            { ch: 7, title: 'Motion', sub: 'Phy' },
          ].map(c => (
            <div key={c.ch} style={styles.chapterItem}>
              <span style={styles.chBadge}>{c.ch}</span>
              <span style={styles.chTitle}>{c.title}</span>
              <span style={styles.chSub}>{c.sub}</span>
            </div>
          ))}
        </div>

        <button style={styles.logoutBtn} onClick={onLogout}>Logout</button>
      </div>

      {/* Main Chat */}
      <div style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>💬 Ask Your Doubt</h2>
          <span style={styles.headerSub}>CBSE Class 9 Science · NCERT Based</span>
        </div>

        {/* Messages */}
        <div style={styles.messages}>
          {messages.map((msg, i) => (
            <div key={i} style={{ ...styles.msgRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && <div style={styles.botAvatar}>🤖</div>}
              <div style={{
                ...styles.bubble,
                ...(msg.role === 'user' ? styles.userBubble : styles.botBubble),
                ...(msg.isError ? styles.errorBubble : {}),
              }}>
                <div style={styles.msgText}>{msg.content}</div>
                {msg.sources && msg.sources.length > 0 && (
                  <div style={styles.sources}>
                    📖 Sources: {msg.sources.map(s => `Ch.${s.chapter} ${s.chapter_title}`).join(' · ')}
                  </div>
                )}
              </div>
              {msg.role === 'user' && <div style={styles.userAvatar2}>🧑‍🎓</div>}
            </div>
          ))}

          {loading && (
            <div style={{ ...styles.msgRow, justifyContent: 'flex-start' }}>
              <div style={styles.botAvatar}>🤖</div>
              <div style={{ ...styles.bubble, ...styles.botBubble }}>
                <div style={styles.typing}>
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div style={styles.suggestionsRow}>
            {suggestions.map((s, i) => (
              <button key={i} style={styles.suggBtn} onClick={() => setInput(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={styles.inputArea}>
          <textarea
            style={styles.textarea}
            placeholder="Ask a Science question... (Press Enter to send)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <button style={styles.sendBtn} onClick={sendMessage} disabled={loading || !input.trim()}>
            {loading ? '⏳' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', height: '100vh', fontFamily: "'Segoe UI', sans-serif", background: '#f0f4ff' },
  sidebar: {
    width: '260px', background: '#1a237e', color: '#fff',
    display: 'flex', flexDirection: 'column', padding: '20px', gap: '16px',
    overflowY: 'auto',
  },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  sidebarTitle: { fontSize: '22px', fontWeight: 700, letterSpacing: '1px' },
  userCard: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px',
  },
  userAvatar: { fontSize: '32px' },
  userName: { fontWeight: 600, fontSize: '15px' },
  userRole: { fontSize: '12px', opacity: 0.7, marginTop: '2px' },
  section: { display: 'flex', flexDirection: 'column', gap: '6px' },
  sectionTitle: { fontSize: '11px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' },
  subjectBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
    color: '#fff', padding: '8px 12px', cursor: 'pointer', textAlign: 'left', fontSize: '14px',
  },
  subjectBtnActive: { background: 'rgba(255,255,255,0.3)', fontWeight: 600 },
  chapterItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' },
  chBadge: {
    background: 'rgba(255,255,255,0.2)', borderRadius: '50%',
    width: '22px', height: '22px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '11px', flexShrink: 0,
  },
  chTitle: { fontSize: '12px', flex: 1, opacity: 0.9 },
  chSub: { fontSize: '10px', opacity: 0.6 },
  logoutBtn: {
    marginTop: 'auto', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '14px',
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: {
    background: '#fff', padding: '16px 24px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex', alignItems: 'center', gap: '16px',
  },
  headerTitle: { margin: 0, fontSize: '18px', color: '#1a237e' },
  headerSub: { fontSize: '13px', color: '#888' },
  messages: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' },
  msgRow: { display: 'flex', alignItems: 'flex-end', gap: '10px' },
  botAvatar: { fontSize: '28px', flexShrink: 0 },
  userAvatar2: { fontSize: '28px', flexShrink: 0 },
  bubble: { maxWidth: '70%', borderRadius: '16px', padding: '12px 16px' },
  userBubble: { background: '#1a237e', color: '#fff', borderBottomRightRadius: '4px' },
  botBubble: { background: '#fff', color: '#333', borderBottomLeftRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  errorBubble: { background: '#ffebee', color: '#c62828' },
  msgText: { fontSize: '15px', lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  sources: { marginTop: '8px', fontSize: '12px', color: '#888', borderTop: '1px solid #f0f0f0', paddingTop: '6px' },
  typing: { display: 'flex', gap: '4px', padding: '4px 0' },
  suggestionsRow: { padding: '0 20px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px' },
  suggBtn: {
    background: '#e8eaf6', border: 'none', borderRadius: '20px',
    padding: '8px 14px', fontSize: '13px', color: '#1a237e',
    cursor: 'pointer', transition: 'background 0.2s',
  },
  inputArea: {
    display: 'flex', gap: '10px', padding: '16px 20px',
    background: '#fff', borderTop: '1px solid #e0e0e0',
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1, border: '2px solid #e0e0e0', borderRadius: '12px',
    padding: '12px 16px', fontSize: '15px', resize: 'none',
    fontFamily: "'Segoe UI', sans-serif", outline: 'none',
    lineHeight: 1.5,
  },
  sendBtn: {
    background: '#1a237e', color: '#fff', border: 'none',
    borderRadius: '12px', padding: '12px 20px', fontSize: '20px',
    cursor: 'pointer', flexShrink: 0,
  },
};
