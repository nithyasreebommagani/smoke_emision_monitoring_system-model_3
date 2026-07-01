import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react';
import axios from 'axios';

const UserSignup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await axios.post('/api/auth/register', {
        username,
        password,
        confirm_password: confirmPassword
      });

      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      let errorMsg = 'Registration failed. Please try a different username.';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail[0].msg;
        } else {
          errorMsg = JSON.stringify(err.response.data.detail);
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card glass-panel">
        {/* Header */}
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
            <User size={36} color="var(--color-primary)" />
          </div>

          <h2 className="login-title">CREATE ACCOUNT</h2>
          <p className="login-subtitle">Sign up to monitor and upload videos</p>
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

        {success && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(50, 215, 75, 0.08)',
              border: '1px solid rgba(50, 215, 75, 0.2)',
              borderRadius: '8px',
              color: '#32d74b',
              fontSize: '0.85rem',
              marginBottom: '20px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}
          >
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSignup}>
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
                placeholder="Choose a username"
                required
              />
            </div>
          </div>

          <div className="input-group">
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
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label className="input-label" htmlFor="confirm-password">
              Confirm Password
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
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                style={{
                  width: '100%',
                  paddingLeft: '48px'
                }}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
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
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>

          <button
            type="button"
            className="btn"
            style={{
              width: '100%',
              padding: '14px',
              marginTop: '10px'
            }}
            onClick={() => navigate('/login')}
          >
            Back to Login
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
          Secured Portal &copy; 2026
        </div>
      </div>
    </div>
  );
};

export default UserSignup;
