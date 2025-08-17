import React, { useState } from 'react';
import './App.css';
import './styles.css';
import { Link, useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverInfo, setServerInfo] = useState(null);
  const navigate = useNavigate();

  // Assumption: your Flask backend exposes a POST /api/login endpoint
  // that accepts { email, password } and returns JSON { success: true, token }
  // You can configure the API base URL via REACT_APP_API_BASE (e.g. http://localhost:5000)
  const API_BASE = process.env.REACT_APP_API_BASE || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const url = `${API_BASE}/api/login`;
      console.debug('Sending login request to', url, { email });

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (err) {
        // non-JSON response
        data = { raw: text };
      }

      console.debug('Login response', { status: res.status, ok: res.ok, data });

      if (!res.ok) {
        // Prefer common message fields from backend
        const message = data.message || data.error || data.detail || data.raw || `Request failed (${res.status})`;
        setError(message);
        setServerInfo({ status: res.status, raw: data.raw || text });
        setLoading(false);
        return;
      }

      // On success, optionally store token and redirect
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      // Redirect to home page
      navigate('/');
    } catch (err) {
      console.error('Login error', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Welcome Back</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {error && (
          <div style={{ color: 'crimson', marginBottom: 12, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {serverInfo && (
          <div style={{ color: '#555', marginTop: 8, fontSize: 12, textAlign: 'center' }}>
            <div>Server status: {serverInfo.status}</div>
            {serverInfo.raw && (
              <pre style={{ textAlign: 'left', maxHeight: 120, overflow: 'auto', background: '#f7f7f7', padding: 8, borderRadius: 6 }}>
                {serverInfo.raw}
              </pre>
            )}
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link to="/" style={{ color: '#3498db', textDecoration: 'none' }}>
            ← Back to Home
          </Link>
        </div>
      </form>
    </div>
  );
}

export default Login;
