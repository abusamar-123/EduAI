import { useState, useEffect } from 'react';
import { authApi } from './services/api';
import LoginPage from './pages/LoginPage';
import StudentPage from './pages/StudentPage';
import TeacherPage from './pages/TeacherPage';

export default function App() {
  const [user, setUser] = useState(null);

  // Check for existing session on load
  useEffect(() => {
    if (authApi.isLoggedIn()) {
      setUser(authApi.getUser());
    }
  }, []);

  const handleLogin = (data) => {
    setUser({ role: data.role, name: data.name });
  };

  const handleLogout = () => {
    authApi.logout();
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (user.role === 'teacher') {
    return <TeacherPage user={user} onLogout={handleLogout} />;
  }

  return <StudentPage user={user} onLogout={handleLogout} />;
}
