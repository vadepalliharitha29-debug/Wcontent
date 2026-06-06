import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, BarChart, ArrowRight, MessageSquare, AlertCircle } from 'lucide-react';

const AISummarizer = () => {
  const auth = useAuth();
  
  const [posts, setPosts] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState('');
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  
  const [postsLoading, setPostsLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  // Sample presets for testing quickly in demos
  const positiveCommentsPreset = [
    "This was incredibly helpful! The breakdown of database options was perfect.",
    "Wow, I never understood JWT custom claims before, thanks for explaining it so simply!",
    "Great article. Looking forward to the next part of the series.",
    "The UI aesthetics of this app are gorgeous! Simple but highly premium.",
    "Clear, concise, and straight to the point. Love your writing style."
  ];

  const criticalCommentsPreset = [
    "The explanations were good, but I wish you went deeper into SQL migrations.",
    "You mentioned PyMySQL but didn't show the settings.py setup commands.",
    "Is there a GitHub link to the source code? I'm getting an installation error.",
    "The article is a bit too long. Maybe break it down into shorter chapters?",
    "Could you add a section explaining how this handles token expiration?"
  ];

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await auth.authFetch('http://127.0.0.1:8000/api/posts/');
        if (response.ok) {
          const data = await response.json();
          setPosts(data);
          if (data.length > 0) {
            setSelectedPostId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load posts:", err);
      } finally {
        setPostsLoading(false);
      }
    };
    if (auth?.tokens) {
      fetchPosts();
    }
  }, [auth?.tokens]);

  const loadPreset = (type) => {
    const list = type === 'positive' ? positiveCommentsPreset : criticalCommentsPreset;
    setInputText(list.join('\n'));
  };

  const handleSummarize = async (e) => {
    e.preventDefault();
    setError('');
    setSummary('');
    
    if (!selectedPostId) {
      setError('Please select a publication draft first.');
      return;
    }

    // Split comments by newline and filter out empty lines
    const commentsList = inputText
      .split('\n')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (commentsList.length === 0) {
      setError('Please enter at least one comment to summarize.');
      return;
    }

    setAiLoading(true);

    try {
      const response = await auth.authFetch(`http://127.0.0.1:8000/api/posts/${selectedPostId}/comments-summary/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: commentsList }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSummary(data.comments_summary);
      } else {
        setError(data.error || 'Gemini summary generation failed.');
      }
    } catch (err) {
      setError('Network connection to AI engine failed.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="content-panel">
      <div className="panel-header">
        <div>
          <h1 className="panel-title">AI Insight Tools</h1>
          <p style={{ color: '#9ca3af', marginTop: '5px' }}>Analyze reader comments and compile feedback metrics using Google Gemini</p>
        </div>
      </div>

      <div className="dash-layout-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        {/* Left column: input comments and trigger summary */}
        <div>
          <div className="panel-card">
            <h2 className="panel-card-title">
              <MessageSquare size={18} color="#8b5cf6" />
              <span>Reader Feedback Compiler</span>
            </h2>

            {error && <div className="alert alert-danger">{error}</div>}

            {postsLoading ? (
              <p style={{ color: '#9ca3af' }}>Loading drafts...</p>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af' }}>
                <AlertCircle size={32} color="#f59e0b" style={{ marginBottom: '10px' }} />
                <p>You need to create at least one post draft in "My Posts" before you can run analytics.</p>
              </div>
            ) : (
              <form onSubmit={handleSummarize}>
                <div className="form-group">
                  <label className="form-label" htmlFor="selected-post">Select Draft Post</label>
                  <select
                    id="selected-post"
                    className="form-input"
                    value={selectedPostId}
                    onChange={(e) => setSelectedPostId(e.target.value)}
                  >
                    {posts.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Pasted Comments (1 per line)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button" 
                        onClick={() => loadPreset('positive')} 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px' }}
                      >
                        + Positive Comments
                      </button>
                      <button 
                        type="button" 
                        onClick={() => loadPreset('critical')} 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px' }}
                      >
                        + Critical Comments
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="form-input"
                    rows={8}
                    placeholder="Paste reader comments here, placing each comment on a new line..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={aiLoading}
                >
                  <Sparkles size={16} />
                  {aiLoading ? 'Gemini is compiling comments...' : 'Summarize Feedback with Gemini'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right column: Render AI Output results */}
        <div>
          <div className="panel-card" style={{ minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
            <h2 className="panel-card-title">
              <BarChart size={18} color="#d946ef" />
              <span>AI Compilation Results</span>
            </h2>

            {aiLoading ? (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', gap: '15px' }}>
                <Sparkles size={36} color="#8b5cf6" style={{ animation: 'spin 2s linear infinite' }} />
                <p>Generating Gemini LLM Analytics...</p>
              </div>
            ) : summary ? (
              <div style={{ whiteSpace: 'pre-line', fontSize: '0.95rem', lineHeight: '1.6', color: '#e5e7eb' }}>
                <div style={{ display: 'inline-flex', gap: '6px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '4px 10px', borderRadius: '15px', fontSize: '0.75rem', color: '#a78bfa', fontWeight: '600', marginBottom: '15px', textTransform: 'uppercase' }}>
                  Generated by Gemini 2.5 Flash
                </div>
                {summary}
              </div>
            ) : (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280', textAlign: 'center' }}>
                <Sparkles size={32} color="#4b5563" style={{ marginBottom: '10px' }} />
                <p>AI compilation output will render here once comments are submitted.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISummarizer;
