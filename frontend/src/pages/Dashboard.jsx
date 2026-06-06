import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  Users, 
  Bell, 
  Sparkles, 
  CheckCheck, 
  Clock 
} from 'lucide-react';

const Dashboard = () => {
  const { user, authFetch } = useAuth();
  const [stats, setStats] = useState({ posts: 0, sentCollabs: 0, receivedCollabs: 0 });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // 1. Fetch Posts from MySQL to get total count
      const postRes = await authFetch('http://127.0.0.1:8000/api/posts/');
      let postCount = 0;
      if (postRes.ok) {
        const posts = await postRes.json();
        postCount = posts.length;
      }

      // 2. Fetch Collaboration requests from MongoDB/JSON fallback
      const collabRes = await authFetch('http://127.0.0.1:8000/api/collab/');
      let sentCount = 0;
      let receivedCount = 0;
      if (collabRes.ok) {
        const collabData = await collabRes.json();
        sentCount = collabData.sent.length;
        receivedCount = collabData.received.length;
      }

      // 3. Fetch notifications from MongoDB/JSON fallback
      const notifRes = await authFetch('http://127.0.0.1:8000/api/notifications/');
      let notifList = [];
      if (notifRes.ok) {
        notifList = await notifRes.json();
      }

      setStats({
        posts: postCount,
        sentCollabs: sentCount,
        receivedCollabs: receivedCount
      });
      setNotifications(notifList);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const response = await authFetch('http://127.0.0.1:8000/api/notifications/', {
        method: 'PUT',
      });
      if (response.ok) {
        // Refresh notifications list locally
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  };

  if (loading) {
    return <div className="content-panel" style={{ color: '#9ca3af' }}>Loading your dashboard...</div>;
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="content-panel">
      <div className="panel-header">
        <div>
          <h1 className="panel-title">Dashboard Overview</h1>
          <p style={{ color: '#9ca3af', marginTop: '5px' }}>
            Welcome back, <span style={{ color: '#8b5cf6', fontWeight: '600' }}>{user?.username}</span>!
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#9ca3af', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
            Category: <strong style={{ textTransform: 'capitalize', color: '#f3f4f6' }}>{user?.creatorType}</strong>
          </span>
        </div>
      </div>

      {/* Grid of key statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FileText size={24} />
          </div>
          <div>
            <div className="stat-lbl">My Publications</div>
            <div className="stat-val">{stats.posts}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(217, 70, 239, 0.1)', color: '#d946ef' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="stat-lbl">Sent Collab Requests</div>
            <div className="stat-val">{stats.sentCollabs}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="stat-lbl">Received Requests</div>
            <div className="stat-val">{stats.receivedCollabs}</div>
          </div>
        </div>
      </div>

      {/* Two-column Layout: Feed and Quick Actions */}
      <div className="dash-layout-grid">
        {/* Left Side: Notifications Feed (Dynamic MongoDB storage) */}
        <div className="panel-card">
          <div className="panel-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={20} color="#8b5cf6" />
              <span>Activity & Notifications Feed</span>
              {unreadCount > 0 && (
                <span style={{ background: '#ef4444', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                  {unreadCount} New
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead} 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
              <Bell size={36} color="#4b5563" style={{ marginBottom: '10px' }} />
              <p>No recent activity or notifications found.</p>
            </div>
          ) : (
            <ul className="notifications-list">
              {notifications.map((notif) => (
                <li 
                  key={notif.id} 
                  className={`notif-item ${notif.type}`}
                  style={{ 
                    opacity: notif.is_read ? 0.6 : 1,
                    borderLeftColor: notif.is_read ? '#4b5563' : undefined 
                  }}
                >
                  <div className="notif-msg">{notif.message}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
                    <Clock size={12} color="#6b7280" />
                    <span className="notif-time">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right Side: Creator Quick Info Box */}
        <div className="panel-card">
          <div className="panel-card-title">
            <Sparkles size={20} color="#d946ef" />
            <span>Profile Details</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block' }}>Email Address</span>
              <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>{user?.email}</span>
            </div>

            <div>
              <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block' }}>Biography</span>
              <p style={{ fontSize: '0.9rem', color: '#d1d5db', lineHeight: '1.4' }}>
                {user?.bio || 'No biography written yet. Edit your profile details in the admin portal to customize this space!'}
              </p>
            </div>

            {user?.portfolioUrl && (
              <div>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block' }}>Creator Portfolio</span>
                <a 
                  href={user.portfolioUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{ color: '#8b5cf6', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}
                >
                  {user.portfolioUrl}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
