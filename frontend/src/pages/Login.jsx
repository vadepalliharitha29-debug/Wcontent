import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Lock, User } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Invalid login credentials.');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
            <Sparkles size={32} color="#8b5cf6" />
          </div>
          <h1 className="auth-title">Wcontent</h1>
          <p className="auth-subtitle">Platform for content creators</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="#6b7280" style={{ position: 'absolute', left: '16px', top: '15px' }} />
              <input
                id="username"
                className="form-input"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '45px' }}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '30px' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#6b7280" style={{ position: 'absolute', left: '16px', top: '15px' }} />
              <input
                id="password"
                className="form-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '45px' }}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: '25px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
          New to Wcontent?{' '}
          <Link to="/register" style={{ color: '#8b5cf6', textDecoration: 'none', fontWeight: '600' }}>
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
