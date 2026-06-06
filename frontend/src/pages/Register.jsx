import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Lock, User, Mail, Compass } from 'lucide-react';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creatorType, setCreatorType] = useState('other');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await register(username, email, password, creatorType);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Registration failed.');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ padding: '35px' }}>
        <div className="auth-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
            <Sparkles size={32} color="#8b5cf6" />
          </div>
          <h1 className="auth-title">Join Wcontent</h1>
          <p className="auth-subtitle">Create your content creator account</p>
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
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '45px' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#6b7280" style={{ position: 'absolute', left: '16px', top: '15px' }} />
              <input
                id="email"
                className="form-input"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '45px' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="creatorType">Creator Category</label>
            <div style={{ position: 'relative' }}>
              <Compass size={18} color="#6b7280" style={{ position: 'absolute', left: '16px', top: '15px' }} />
              <select
                id="creatorType"
                className="form-input"
                value={creatorType}
                onChange={(e) => setCreatorType(e.target.value)}
                style={{ paddingLeft: '45px', appearance: 'none' }}
              >
                <option value="video">Video Creator / YouTuber</option>
                <option value="writer">Writer / Blogger</option>
                <option value="podcaster">Podcaster / Audio</option>
                <option value="designer">Designer / Artist</option>
                <option value="other">Other Content Creator</option>
              </select>
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
                placeholder="Create a strong password"
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
            {loading ? 'Creating Account...' : 'Get Started'}
          </button>
        </form>

        <p style={{ marginTop: '25px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#8b5cf6', textDecoration: 'none', fontWeight: '600' }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
