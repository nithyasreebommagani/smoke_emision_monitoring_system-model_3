import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Lock, User, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login(username, password);
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to connect to authentication server. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div
            style={{
              display: 'inline-flex',
              padding: '16px',
              background: 'rgba(0, 210, 255, 0.08)',
              borderRadius: '12px',
              border: '1px solid rgba(0, 210, 255, 0.15)',
              marginBottom: '16px'
            }}
          >
            <AlertTriangle size={36} color="var(--color-primary)" />
          </div>

          <h2 className="login-title">SMOKE MONITOR</h2>
          <p className="login-subtitle">Sign in to operator dashboard</p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(255, 69, 58, 0.08)',
              border: '1px solid rgba(255, 69, 58, 0.2)',
              borderRadius: '8px',
              color: 'var(--color-danger)',
              fontSize: '0.85rem',
              marginBottom: '20px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}
          >
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label" htmlFor="username">
              Username
            </label>

            <div style={{ position: 'relative' }}>
              <User
                size={18}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '14px',
                  color: 'var(--color-text-muted)'
                }}
              />

              <input
                id="username"
                type="text"
                className="input-field"
                style={{
                  width: '100%',
                  paddingLeft: '48px'
                }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter operator username"
                required
              />
            </div>
          </div>

          <div
            className="input-group"
            style={{ marginBottom: '24px' }}
          >
            <label className="input-label" htmlFor="password">
              Password
            </label>

            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '14px',
                  color: 'var(--color-text-muted)'
                }}
              />

              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                style={{
                  width: '100%',
                  paddingLeft: '48px',
                  paddingRight: '48px'
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '14px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '14px'
            }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>

          <button
            type="button"
            className="btn"
            style={{
              width: '100%',
              padding: '14px',
              marginTop: '10px'
            }}
            onClick={() => navigate('/register')}
          >
            Create Account
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: '24px',
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)'
          }}
        >
          Secured Operator Console &copy; 2026
        </div>
      </div>
    </div>
  );
};

export default Login;
