import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './components/Login';
import PurchaseEntry from './components/PurchaseEntry';
import Reports from './components/Reports';
import AdminPanel from './components/AdminPanel';
import AdminOptions from './components/AdminOptions';
import UserManagement from './components/UserManagement';
import './styles/App.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    if (token) {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);
    }
  }, [token]);

  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : '';
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (!token) {
    return (
      <Router>
        <div className="app">
          <ToastContainer position="top-right" autoClose={3000} theme={darkMode ? 'dark' : 'light'} />
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </Router>
    );
  }

  return (
    <Router>
      <div className="app">
        <ToastContainer position="top-right" autoClose={3000} theme={darkMode ? 'dark' : 'light'} />
        <nav className="navbar">
          <div className="nav-brand">🛒 Grocery Tracker</div>
          <div className="nav-menu">
            <Link to="/purchases">Purchases</Link>
            <Link to="/reports">Reports</Link>
            {user?.is_admin && <Link to="/admin">Admin</Link>}
            {user?.is_admin && <Link to="/admin-options">Manage Data</Link>}
            {user?.is_admin && <Link to="/users">Users</Link>}
            <button onClick={toggleDarkMode} className="nav-dark-toggle" title="Toggle dark mode">
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={handleLogout} className="nav-logout">Logout</button>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/purchases" element={<PurchaseEntry />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin" element={user?.is_admin ? <AdminPanel /> : <Navigate to="/purchases" />} />
            <Route path="/admin-options" element={user?.is_admin ? <AdminOptions /> : <Navigate to="/purchases" />} />
            <Route path="/users" element={user?.is_admin ? <UserManagement /> : <Navigate to="/purchases" />} />
            <Route path="/" element={<Navigate to="/purchases" />} />
            <Route path="*" element={<Navigate to="/purchases" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
