import { useState } from 'react';
import { authApi } from '../services/api';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authApi.login(username, password);
      onLogin(data);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>🎓</div>
          <h1 style={styles.logoText}>EduAI</h1>
          <p style={styles.logoSub}>Class 9 Science Assistant</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              type="text"
              placeholder="student1 or teacher1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.loginBtn} type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login →'}
          </button>
        </form>

        {/* Demo credentials */}
        <div style={styles.demo}>
          <p style={styles.demoTitle}>Demo Credentials</p>
          <div style={styles.demoGrid}>
            <div style={styles.demoCard}>
              <span style={styles.demoRole}>🧑‍🎓 Student</span>
              <code>student1 / student123</code>
            </div>
            <div style={styles.demoCard}>
              <span style={styles.demoRole}>👩‍🏫 Teacher</span>
              <code>teacher1 / teacher123</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #1565c0 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  logo: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoIcon: { fontSize: '48px', marginBottom: '8px' },
  logoText: { margin: 0, fontSize: '28px', color: '#1a237e', fontWeight: 700 },
  logoSub: { margin: '4px 0 0', color: '#666', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '14px', color: '#333', fontWeight: 600 },
  input: {
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    background: '#ffebee',
    color: '#c62828',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  loginBtn: {
    background: 'linear-gradient(135deg, #1a237e, #1565c0)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
  },
  demo: {
    marginTop: '24px',
    padding: '16px',
    background: '#f5f5f5',
    borderRadius: '10px',
  },
  demoTitle: { margin: '0 0 10px', fontSize: '13px', color: '#666', fontWeight: 600 },
  demoGrid: { display: 'flex', gap: '10px' },
  demoCard: {
    flex: 1,
    background: '#fff',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    border: '1px solid #e0e0e0',
  },
  demoRole: { fontWeight: 600, color: '#1a237e' },
};
