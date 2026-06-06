import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, Check, X, Users, MessageSquare } from 'lucide-react';

const Collabs = () => {
  const { authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('received'); // received | sent
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states for sending request
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [projectDetails, setProjectDetails] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchCollabs = async () => {
    try {
      const response = await authFetch('http://127.0.0.1:8000/api/collab/');
      if (response.ok) {
        const data = await response.json();
        setSentRequests(data.sent);
        setReceivedRequests(data.received);
      }
    } catch (err) {
      console.error("Failed to load collaboration requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollabs();
  }, []);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitLoading(true);

    try {
      const response = await authFetch('http://127.0.0.1:8000/api/collab/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient,
          message,
          project_details: projectDetails,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFormSuccess('Collaboration request sent successfully!');
        setRecipient('');
        setMessage('');
        setProjectDetails('');
        fetchCollabs(); // Reload lists
      } else {
        setFormError(data.error || 'Failed to send request.');
      }
    } catch (err) {
      setFormError('Connection error.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const response = await authFetch(`http://127.0.0.1:8000/api/collab/${id}/status/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Refresh local lists
        fetchCollabs();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update request.');
      }
    } catch (err) {
      console.error("Error updating collab status:", err);
    }
  };

  return (
    <div className="content-panel">
      <div className="panel-header">
        <div>
          <h1 className="panel-title">Collaboration Requests</h1>
          <p style={{ color: '#9ca3af', marginTop: '5px' }}>Connect and partner with other content creators on Wcontent</p>
        </div>
      </div>

      <div className="dash-layout-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        {/* Left column: Manage collaboration requests (sent/received tabs) */}
        <div>
          <div className="collab-tabs">
            <div 
              className={`collab-tab ${activeTab === 'received' ? 'active' : ''}`}
              onClick={() => setActiveTab('received')}
            >
              Received Proposals ({receivedRequests.length})
            </div>
            <div 
              className={`collab-tab ${activeTab === 'sent' ? 'active' : ''}`}
              onClick={() => setActiveTab('sent')}
            >
              Sent Requests ({sentRequests.length})
            </div>
          </div>

          {loading ? (
            <div style={{ color: '#9ca3af' }}>Loading requests...</div>
          ) : activeTab === 'received' ? (
            // RECEIVED PROPOSALS FEED
            receivedRequests.length === 0 ? (
              <div className="panel-card" style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
                <Users size={32} color="#4b5563" style={{ marginBottom: '10px' }} />
                <p>You haven't received any collaboration requests yet.</p>
              </div>
            ) : (
              <div className="collabs-list">
                {receivedRequests.map((req) => (
                  <div key={req.id} className="collab-card">
                    <div className="collab-card-header">
                      <div className="collab-user">From Creator: {req.sender}</div>
                      <span className={`collab-status status-badge-${req.status.toLowerCase()}`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="collab-message">{req.message}</p>
                    {req.project_details && (
                      <div style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '15px' }}>
                        <strong>Project Details:</strong> {req.project_details}
                      </div>
                    )}
                    
                    {/* Render action buttons if request is pending */}
                    {req.status === 'Pending' && (
                      <div className="collab-actions">
                        <button 
                          onClick={() => handleUpdateStatus(req.id, 'Accepted')} 
                          className="btn btn-primary"
                          style={{ padding: '8px 14px', fontSize: '0.85rem', backgroundColor: '#10b981', boxShadow: 'none' }}
                        >
                          <Check size={14} /> Accept Proposal
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(req.id, 'Rejected')} 
                          className="btn btn-secondary"
                          style={{ padding: '8px 14px', fontSize: '0.85rem', color: '#ef4444' }}
                        >
                          <X size={14} /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            // SENT REQUESTS FEED
            sentRequests.length === 0 ? (
              <div className="panel-card" style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
                <Send size={32} color="#4b5563" style={{ marginBottom: '10px' }} />
                <p>You haven't sent any collaboration requests yet.</p>
              </div>
            ) : (
              <div className="collabs-list">
                {sentRequests.map((req) => (
                  <div key={req.id} className="collab-card">
                    <div className="collab-card-header">
                      <div className="collab-user">To Creator: {req.recipient}</div>
                      <span className={`collab-status status-badge-${req.status.toLowerCase()}`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="collab-message">{req.message}</p>
                    {req.project_details && (
                      <div style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <strong>Project Scope:</strong> {req.project_details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Right column: Create a new proposal request */}
        <div>
          <div className="panel-card">
            <h2 className="panel-card-title">
              <Send size={18} color="#8b5cf6" />
              <span>Send Collaboration Offer</span>
            </h2>

            {formError && <div className="alert alert-danger">{formError}</div>}
            {formSuccess && <div className="alert alert-success">{formSuccess}</div>}

            <form onSubmit={handleSendRequest}>
              <div className="form-group">
                <label className="form-label" htmlFor="recipient-username">Partner Username</label>
                <input 
                  id="recipient-username"
                  className="form-input"
                  type="text"
                  placeholder="Enter creator username"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="collab-message">Proposal Message</label>
                <textarea 
                  id="collab-message"
                  className="form-input"
                  rows={4}
                  placeholder="Introduce yourself and outline your collab proposal..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '25px' }}>
                <label className="form-label" htmlFor="collab-details">Deliverables / Project Scope</label>
                <input 
                  id="collab-details"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Co-host podcast, edit 1 Youtube video"
                  value={projectDetails}
                  onChange={(e) => setProjectDetails(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={submitLoading}
              >
                {submitLoading ? 'Sending Proposal...' : 'Send Collab Request'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Collabs;
