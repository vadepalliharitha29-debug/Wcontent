import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Sparkles, Check, X, FileEdit } from 'lucide-react';

const Posts = () => {
  const { authFetch } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form states for creating a new post
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('Draft');
  const [formError, setFormError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // AI Generation Loading state
  const [aiLoadingMap, setAiLoadingMap] = useState({});

  const fetchPosts = async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/api/posts/`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitLoading(true);

    try {
      const response = await authFetch(`${API_BASE_URL}/api/posts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, status }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setPosts(prev => [data, ...prev]);
        setShowModal(false);
        // Clear form fields
        setTitle('');
        setContent('');
        setStatus('Draft');
      } else {
        setFormError(data.detail || 'Failed to create post.');
      }
    } catch (err) {
      setFormError('Internal server error.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Are you sure you want to delete this publication draft?')) return;

    try {
      const response = await authFetch(`${API_BASE_URL}/api/posts/${id}/`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setPosts(prev => prev.filter(post => post.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  // Triggers Gemini SEO Title generation
  const handleGenerateSEOTitle = async (id) => {
    // Set loading for this specific post id
    setAiLoadingMap(prev => ({ ...prev, [id]: true }));

    try {
      const response = await authFetch(`${API_BASE_URL}/api/posts/${id}/seo/`, {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        // Update the post list state locally to reflect the suggestion
        setPosts(prev => prev.map(post => {
          if (post.id === id) {
            return { ...post, seo_title_suggestion: data.seo_title_suggestion };
          }
          return post;
        }));
      } else {
        alert(data.error || 'AI generation failed.');
      }
    } catch (err) {
      alert('Network error communicating with AI service.');
    } finally {
      setAiLoadingMap(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="content-panel">
      <div className="panel-header">
        <div>
          <h1 className="panel-title">My Publications</h1>
          <p style={{ color: '#9ca3af', marginTop: '5px' }}>Draft and optimize your articles with Gemini AI</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={18} /> Create Post
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#9ca3af' }}>Loading your creator publications...</div>
      ) : posts.length === 0 ? (
        <div className="panel-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
          <FileEdit size={48} color="#4b5563" style={{ marginBottom: '15px' }} />
          <h3>No posts found!</h3>
          <p style={{ marginTop: '5px', marginBottom: '20px' }}>Create your first draft to test our Gemini SEO title recommender.</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            Create First Post
          </button>
        </div>
      ) : (
        <div className="posts-grid">
          {posts.map((post) => (
            <div key={post.id} className="post-card">
              <div>
                <span className={`post-status ${post.status === 'Published' ? 'status-published' : 'status-draft'}`}>
                  {post.status}
                </span>
                <h3 className="post-title">{post.title}</h3>
                <p className="post-body-preview">{post.content}</p>
                
                {/* Display Gemini Suggestion if available */}
                {post.seo_title_suggestion ? (
                  <div className="ai-section">
                    <div className="ai-title">
                      <Sparkles size={16} />
                      <span>Gemini SEO Title Recommendation</span>
                    </div>
                    <p style={{ fontStyle: 'italic', fontWeight: '500', color: '#f3f4f6' }}>
                      "{post.seo_title_suggestion}"
                    </p>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleGenerateSEOTitle(post.id)} 
                    className="btn btn-secondary" 
                    style={{ marginTop: '15px', fontSize: '0.8rem', padding: '8px 12px' }}
                    disabled={aiLoadingMap[post.id]}
                  >
                    <Sparkles size={14} color="#8b5cf6" />
                    {aiLoadingMap[post.id] ? 'Generating SEO title...' : 'Get SEO Title Idea'}
                  </button>
                )}
              </div>

              <div className="post-card-footer">
                <span className="post-author">By {post.author_username}</span>
                <div className="post-actions">
                  <button onClick={() => handleDeletePost(post.id)} className="btn btn-secondary" style={{ padding: '6px 10px', color: '#ef4444' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE POST MODAL DIALOG */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Write New Draft</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <X size={24} />
              </button>
            </div>

            {formError && <div className="alert alert-danger">{formError}</div>}

            <form onSubmit={handleCreatePost}>
              <div className="form-group">
                <label className="form-label" htmlFor="post-title">Draft Title</label>
                <input 
                  id="post-title"
                  className="form-input" 
                  type="text" 
                  placeholder="Enter publication title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="post-content">Draft Content Body</label>
                <textarea 
                  id="post-content"
                  className="form-input" 
                  rows={6}
                  placeholder="Start writing your content here (min. 20 characters for Gemini AI recommendation)..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{ resize: 'vertical' }}
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '30px' }}>
                <label className="form-label" htmlFor="post-status">Publication Status</label>
                <select 
                  id="post-status"
                  className="form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Scheduled">Scheduled</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Creating...' : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Posts;
