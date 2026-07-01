import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Lock, User, Eye, EyeOff, Shield, Upload } from 'lucide-react';
import { authService } from '../services/api';

const Login = () => {
  const [loginMode, setLoginMode] = useState('admin'); // 'admin' or 'user'
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
      const data = await authService.login(username, password);

      // Navigate based on the user's actual role from the server
      if (data.role === 'admin') {
        navigate('/');
      } else {
        navigate('/upload');
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to connect to authentication server. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = loginMode === 'admin';

  return (
    <div className="login-wrapper">
      <div className="login-card glass-panel">

        {/* ── Role Toggle ── */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '28px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <button
            type="button"
            onClick={() => { setLoginMode('admin'); setError(''); }}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              transition: 'all 0.25s ease',
              background: isAdmin
                ? 'linear-gradient(135deg, rgba(0,210,255,0.18), rgba(0,150,255,0.12))'
                : 'transparent',
              color: isAdmin ? 'var(--color-primary)' : 'var(--color-text-muted)',
              boxShadow: isAdmin ? '0 0 20px rgba(0,210,255,0.08)' : 'none'
            }}
          >
            <Shield size={18} />
            Admin
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('user'); setError(''); }}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              transition: 'all 0.25s ease',
              background: !isAdmin
                ? 'linear-gradient(135deg, rgba(50,215,75,0.18), rgba(30,180,60,0.12))'
                : 'transparent',
              color: !isAdmin ? '#32d74b' : 'var(--color-text-muted)',
              boxShadow: !isAdmin ? '0 0 20px rgba(50,215,75,0.08)' : 'none'
            }}
          >
            <Upload size={18} />
            User
          </button>
        </div>

        {/* ── Header ── */}
        <div className="login-header">
          <div
            style={{
              display: 'inline-flex',
              padding: '16px',
              background: isAdmin
                ? 'rgba(0, 210, 255, 0.08)'
                : 'rgba(50, 215, 75, 0.08)',
              borderRadius: '12px',
              border: `1px solid ${isAdmin
                ? 'rgba(0, 210, 255, 0.15)'
                : 'rgba(50, 215, 75, 0.15)'}`,
              marginBottom: '16px',
              transition: 'all 0.3s ease'
            }}
          >
            {isAdmin
              ? <Shield size={36} color="var(--color-primary)" />
              : <Upload size={36} color="#32d74b" />
            }
          </div>

          <h2 className="login-title">SMOKE MONITOR</h2>
          <p className="login-subtitle">
            {isAdmin
              ? 'Sign in as Administrator'
              : 'Sign in to upload & monitor videos'
            }
          </p>
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
                placeholder={isAdmin ? 'Admin username' : 'Your username'}
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
              padding: '14px',
              background: isAdmin
                ? undefined
                : 'linear-gradient(135deg, #32d74b, #28a745)',
              transition: 'all 0.3s ease'
            }}
            disabled={loading}
          >
            {loading
              ? 'Authenticating...'
              : isAdmin
                ? 'Access Admin Dashboard'
                : 'Sign In & Upload Videos'
            }
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
          Secured Monitoring Console &copy; 2026
        </div>
      </div>
    </div>
  );
};

export default Login;
