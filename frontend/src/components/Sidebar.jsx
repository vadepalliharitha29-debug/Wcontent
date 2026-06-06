import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Sparkles, 
  LogOut, 
  Activity 
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dbStatus, setDbStatus] = useState({ connected: true, mode: 'Checking...' });

  // Periodically check MongoDB and System Connection status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/status/`);
        if (response.ok) {
          const data = await response.json();
          setDbStatus({
            connected: data.mongodb_connected,
            mode: data.database_mode
          });
        }
      } catch (error) {
        setDbStatus({
          connected: false,
          mode: 'Offline (No API Response)'
        });
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000); // Check database status every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <Sparkles size={26} color="#8b5cf6" />
        <span>Wcontent</span>
      </div>

      <nav className="nav-list">
        <NavLink 
          to="/" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/posts" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <FileText size={20} />
          <span>My Posts</span>
        </NavLink>

        <NavLink 
          to="/collabs" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Users size={20} />
          <span>Collaborations</span>
        </NavLink>

        <NavLink 
          to="/ai-summarizer" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Sparkles size={20} />
          <span>AI Insight Tools</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="user-badge">
            <div className="avatar">
              {user.username.substring(0, 2)}
            </div>
            <div className="user-info">
              <div className="username">{user.username}</div>
              <div className="role">{user.creatorType}</div>
              <div className="email" title={user.email}>{user.email}</div>
            </div>
          </div>
        )}

        <button onClick={handleLogout} className="nav-item" style={{ width: '100%', background: 'transparent', textAlign: 'left' }}>
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>

        {/* Database Resiliency Monitor Widget */}
        <div className="db-status-badge" title={dbStatus.mode}>
          <div className={`status-dot ${dbStatus.connected ? 'online' : 'offline'}`}></div>
          <span style={{ color: dbStatus.connected ? '#10b981' : '#f59e0b' }}>
            {dbStatus.connected ? 'Mongo Connected' : 'JSON Fallback Cache'}
          </span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
