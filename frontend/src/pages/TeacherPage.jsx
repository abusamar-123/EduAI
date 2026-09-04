import { useState, useRef, useEffect } from 'react';
import { doubtApi, questionApi } from '../services/api';

const TABS = ['💬 Ask Doubt', '📝 Generate Questions'];
const QUESTION_TYPES = ['MCQ', 'Short Answer', 'Long Answer', 'True/False', 'Fill in the Blanks'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Science'];

export default function TeacherPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <span style={{ fontSize: 28 }}>🎓</span>
          <span style={styles.sidebarTitle}>EduAI</span>
        </div>

        <div style={styles.userCard}>
          <div style={{ fontSize: 32 }}>👩‍🏫</div>
          <div>
            <div style={styles.userName}>{user.name}</div>
            <div style={styles.userRole}>Science Teacher</div>
          </div>
        </div>

        <div style={styles.navSection}>
          {TABS.map((tab, i) => (
            <button
              key={i}
              style={{ ...styles.navBtn, ...(activeTab === i ? styles.navBtnActive : {}) }}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Chapter reference */}
        <div style={styles.chapSection}>
          <div style={styles.sectionLabel}>Available Chapters</div>
          {[
            { ch: 2, title: 'Is Matter Pure?', sub: '🧪' },
            { ch: 3, title: 'Atoms & Molecules', sub: '🧪' },
            { ch: 4, title: 'Structure of Atom', sub: '🧪' },
            { ch: 5, title: 'Cell', sub: '🌱' },
            { ch: 6, title: 'Tissues', sub: '🌱' },
            { ch: 7, title: 'Motion', sub: '⚡' },
          ].map(c => (
            <div key={c.ch} style={styles.chItem}>
              {c.sub} Ch.{c.ch}: {c.title}
            </div>
          ))}
        </div>

        <button style={styles.logoutBtn} onClick={onLogout}>Logout</button>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        {activeTab === 0 ? (
          <DoubtTab user={user} />
        ) : (
          <QuestionGenTab />
        )}
      </div>
    </div>
  );
}

// ── Doubt Tab ─────────────────────────────────────────────────────────────────
function DoubtTab({ user }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Welcome ${user.name}! 👋 Ask me any Science doubt or concept clarification.` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    const newMsgs = [...messages, { role: 'user', content: q }];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);
    try {
      const history = newMsgs.slice(1).slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await doubtApi.ask(q, history);
      setMessages(prev => [...prev, { role: 'assistant', content: res.answer, sources: res.sources }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}`, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <h2 style={styles.tabTitle}>💬 Ask a Doubt</h2>
        <span style={styles.tabSub}>Ask anything from NCERT Class 9 Science</span>
      </div>
      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div key={i} style={{ ...styles.msgRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && <span style={{ fontSize: 28 }}>🤖</span>}
            <div style={{
              ...styles.bubble,
              ...(msg.role === 'user' ? styles.userBubble : styles.botBubble),
              ...(msg.isError ? { background: '#ffebee', color: '#c62828' } : {}),
            }}>
              <div style={styles.msgText}>{msg.content}</div>
              {msg.sources?.length > 0 && (
                <div style={styles.sources}>
                  📖 {msg.sources.map(s => `Ch.${s.chapter} ${s.chapter_title}`).join(' · ')}
                </div>
              )}
            </div>
            {msg.role === 'user' && <span style={{ fontSize: 28 }}>👩‍🏫</span>}
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.msgRow, justifyContent: 'flex-start' }}>
            <span style={{ fontSize: 28 }}>🤖</span>
            <div style={{ ...styles.bubble, ...styles.botBubble, padding: '14px 18px' }}>
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={styles.inputArea}>
        <textarea
          style={styles.textarea}
          placeholder="Ask a Science question..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={2}
        />
        <button style={styles.sendBtn} onClick={send} disabled={loading || !input.trim()}>➤</button>
      </div>
    </div>
  );
}

// ── Question Generation Tab ───────────────────────────────────────────────────
function QuestionGenTab() {
  const [form, setForm] = useState({
    topic: '',
    subject: 'Science',
    question_type: 'MCQ',
    difficulty: 'Medium',
    count: 5,
  });
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const generate = async () => {
    if (!form.topic.trim()) { setError('Please enter a topic'); return; }
    setLoading(true);
    setError('');
    setQuestions([]);
    try {
      const res = await questionApi.generate(form);
      setQuestions(res.questions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      await questionApi.downloadPDF(form);
    } catch (err) {
      setError('PDF download failed: ' + err.message);
    }
  };

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <h2 style={styles.tabTitle}>📝 Generate Questions</h2>
        <span style={styles.tabSub}>Create exam questions from NCERT content</span>
      </div>

      <div style={styles.genLayout}>
        {/* Form */}
        <div style={styles.genForm}>
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Topic / Concept *</label>
            <input
              style={styles.fieldInput}
              placeholder="e.g. Rutherford's model, Osmosis, Equations of motion"
              value={form.topic}
              onChange={e => update('topic', e.target.value)}
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Subject</label>
              <select style={styles.fieldSelect} value={form.subject} onChange={e => update('subject', e.target.value)}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Difficulty</label>
              <select style={styles.fieldSelect} value={form.difficulty} onChange={e => update('difficulty', e.target.value)}>
                {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Question Type</label>
              <select style={styles.fieldSelect} value={form.question_type} onChange={e => update('question_type', e.target.value)}>
                {QUESTION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Count (1–20)</label>
              <input
                style={styles.fieldInput}
                type="number" min={1} max={20}
                value={form.count}
                onChange={e => update('count', parseInt(e.target.value))}
              />
            </div>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <button style={styles.genBtn} onClick={generate} disabled={loading}>
            {loading ? '⏳ Generating...' : '✨ Generate Questions'}
          </button>
        </div>

        {/* Results */}
        {questions.length > 0 && (
          <div style={styles.results}>
            <div style={styles.resultsHeader}>
              <span style={styles.resultCount}>{questions.length} questions generated</span>
              <button style={styles.pdfBtn} onClick={downloadPDF}>⬇ Download PDF</button>
            </div>

            {questions.map((q, i) => (
              <div key={i} style={styles.questionCard}>
                <div style={styles.qHeader}>
                  <span style={styles.qNum}>Q{i + 1}</span>
                  <span style={styles.qDiff}>{q.difficulty}</span>
                </div>
                <p style={styles.qText}>{q.question}</p>

                {q.options?.length > 0 && (
                  <div style={styles.options}>
                    {q.options.map((opt, j) => (
                      <div key={j} style={styles.option}>{opt}</div>
                    ))}
                  </div>
                )}

                <div style={styles.answer}>
                  <strong>Answer:</strong> {q.answer}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', height: '100vh', fontFamily: "'Segoe UI', sans-serif" },
  sidebar: {
    width: '240px', background: '#1a237e', color: '#fff',
    display: 'flex', flexDirection: 'column', padding: '20px', gap: '14px',
    overflowY: 'auto',
  },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: '10px' },
  sidebarTitle: { fontSize: '22px', fontWeight: 700, letterSpacing: '1px' },
  userCard: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px',
  },
  userName: { fontWeight: 600, fontSize: '14px' },
  userRole: { fontSize: '12px', opacity: 0.7 },
  navSection: { display: 'flex', flexDirection: 'column', gap: '6px' },
  navBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
    color: '#fff', padding: '10px 14px', cursor: 'pointer', textAlign: 'left', fontSize: '14px',
  },
  navBtnActive: { background: 'rgba(255,255,255,0.3)', fontWeight: 600 },
  chapSection: { display: 'flex', flexDirection: 'column', gap: '4px' },
  sectionLabel: { fontSize: '11px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' },
  chItem: { fontSize: '12px', opacity: 0.8, padding: '2px 0' },
  logoutBtn: {
    marginTop: 'auto', background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '14px',
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f5f5f5' },
  tabContent: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  tabHeader: {
    background: '#fff', padding: '16px 24px',
    borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: '16px',
  },
  tabTitle: { margin: 0, fontSize: '18px', color: '#1a237e' },
  tabSub: { fontSize: '13px', color: '#888' },
  messages: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' },
  msgRow: { display: 'flex', alignItems: 'flex-end', gap: '10px' },
  bubble: { maxWidth: '70%', borderRadius: '16px', padding: '12px 16px' },
  userBubble: { background: '#1a237e', color: '#fff', borderBottomRightRadius: '4px' },
  botBubble: { background: '#fff', color: '#333', borderBottomLeftRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  msgText: { fontSize: '15px', lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  sources: { marginTop: '8px', fontSize: '12px', color: '#888', borderTop: '1px solid #f0f0f0', paddingTop: '6px' },
  inputArea: {
    display: 'flex', gap: '10px', padding: '16px 20px',
    background: '#fff', borderTop: '1px solid #e0e0e0', alignItems: 'flex-end',
  },
  textarea: {
    flex: 1, border: '2px solid #e0e0e0', borderRadius: '12px',
    padding: '12px 16px', fontSize: '15px', resize: 'none',
    fontFamily: "'Segoe UI', sans-serif", outline: 'none',
  },
  sendBtn: {
    background: '#1a237e', color: '#fff', border: 'none',
    borderRadius: '12px', padding: '12px 20px', fontSize: '20px', cursor: 'pointer',
  },
  genLayout: { flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' },
  genForm: {
    background: '#fff', borderRadius: '12px', padding: '24px',
    display: 'flex', flexDirection: 'column', gap: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  formRow: { display: 'flex', gap: '16px' },
  fieldGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' },
  fieldLabel: { fontSize: '13px', color: '#555', fontWeight: 600 },
  fieldInput: {
    border: '2px solid #e0e0e0', borderRadius: '8px',
    padding: '10px 14px', fontSize: '14px', outline: 'none',
  },
  fieldSelect: {
    border: '2px solid #e0e0e0', borderRadius: '8px',
    padding: '10px 14px', fontSize: '14px', outline: 'none', background: '#fff',
  },
  errorBox: {
    background: '#ffebee', color: '#c62828',
    padding: '10px 14px', borderRadius: '8px', fontSize: '14px',
  },
  genBtn: {
    background: 'linear-gradient(135deg, #1a237e, #1565c0)',
    color: '#fff', border: 'none', borderRadius: '8px',
    padding: '14px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
  },
  results: {
    background: '#fff', borderRadius: '12px', padding: '20px',
    display: 'flex', flexDirection: 'column', gap: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  resultsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  resultCount: { fontWeight: 600, color: '#1a237e', fontSize: '15px' },
  pdfBtn: {
    background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7',
    borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
  },
  questionCard: {
    border: '1px solid #e0e0e0', borderRadius: '10px', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  qHeader: { display: 'flex', gap: '10px', alignItems: 'center' },
  qNum: {
    background: '#1a237e', color: '#fff', borderRadius: '50%',
    width: '28px', height: '28px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0,
  },
  qDiff: {
    fontSize: '12px', padding: '3px 10px', borderRadius: '12px',
    background: '#e8eaf6', color: '#1a237e', fontWeight: 600,
  },
  qText: { margin: 0, fontSize: '15px', lineHeight: 1.6 },
  options: { display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px' },
  option: { fontSize: '14px', color: '#555' },
  answer: {
    background: '#e8f5e9', borderRadius: '8px', padding: '10px 14px',
    fontSize: '14px', color: '#2e7d32', marginTop: '4px',
  },
};
