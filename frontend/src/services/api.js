// EduAI - API Service
// Handles all communication with the FastAPI backend

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ── Auth helpers ──────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('eduai_token');
const getUser = () => JSON.parse(localStorage.getItem('eduai_user') || 'null');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

// ── Generic fetch wrapper ─────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (username, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('eduai_token', data.access_token);
    localStorage.setItem('eduai_user', JSON.stringify({
      role: data.role,
      name: data.name,
    }));
    return data;
  },

  logout: () => {
    localStorage.removeItem('eduai_token');
    localStorage.removeItem('eduai_user');
  },

  getUser,
  isLoggedIn: () => !!getToken(),
};

// ── Doubt API ─────────────────────────────────────────────────────────────────
export const doubtApi = {
  ask: async (question, chatHistory = [], filters = {}) => {
    return apiFetch('/doubt/ask', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        question,
        chat_history: chatHistory,
        subject_filter: filters.subject || null,
        chapter_filter: filters.chapter || null,
      }),
    });
  },

  status: async () => {
    return apiFetch('/doubt/status');
  },
};

// ── Question Generation API ───────────────────────────────────────────────────
export const questionApi = {
  generate: async (params) => {
    return apiFetch('/questions/generate', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });
  },

  downloadPDF: async (params) => {
    const res = await fetch(`${BASE_URL}/questions/generate/pdf`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('PDF generation failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions_${params.topic.slice(0, 20)}_${params.difficulty}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  getTypes: async () => {
    return apiFetch('/questions/types');
  },
};