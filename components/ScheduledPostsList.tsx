import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

interface ScheduledPost {
  id: string;
  articleId: string;
  content: string;
  scheduledFor: string;
  status: 'pending' | 'approved' | 'posted' | 'failed';
  linkedInPostId: string | null;
  createdAt: string;
  postedAt: string | null;
  error: string | null;
}

export const ScheduledPostsList: React.FC = () => {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [filter, setFilter] = useState<string>('upcoming');
  const [loading, setLoading] = useState(true);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/scheduled-posts`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const approvePost = async (postId: string) => {
    try {
      const res = await fetch(`${API_BASE}/scheduled-posts/${postId}/approve`, {
        method: 'POST'
      });
      
      if (res.ok) {
        fetchPosts();
        alert('Post approved! It will be published at the scheduled time.');
      }
    } catch (error) {
      alert('Failed to approve post');
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) {
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/scheduled-posts/${postId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        fetchPosts();
      }
    } catch (error) {
      alert('Failed to delete post');
    }
  };

  const getFilteredPosts = () => {
    const now = new Date();
    
    switch (filter) {
      case 'upcoming':
        return posts.filter(p => 
          (p.status === 'pending' || p.status === 'approved') && 
          new Date(p.scheduledFor) >= now
        );
      case 'pending':
        return posts.filter(p => p.status === 'pending');
      case 'approved':
        return posts.filter(p => p.status === 'approved');
      case 'posted':
        return posts.filter(p => p.status === 'posted');
      case 'failed':
        return posts.filter(p => p.status === 'failed');
      default:
        return posts;
    }
  };

  const filteredPosts = getFilteredPosts();

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: string }> = {
      pending: { bg: 'from-amber-100 to-yellow-100', text: 'text-amber-700', icon: '⏳' },
      approved: { bg: 'from-green-100 to-emerald-100', text: 'text-green-700', icon: '✓' },
      posted: { bg: 'from-blue-100 to-indigo-100', text: 'text-blue-700', icon: '🚀' },
      failed: { bg: 'from-red-100 to-rose-100', text: 'text-red-700', icon: '✗' },
    };
    return configs[status] || { bg: 'from-gray-100 to-slate-100', text: 'text-gray-700', icon: '•' };
  };

  const filters = [
    { key: 'upcoming', label: 'Upcoming', count: posts.filter(p => (p.status === 'pending' || p.status === 'approved') && new Date(p.scheduledFor) >= new Date()).length, color: 'blue' },
    { key: 'pending', label: 'Pending', count: posts.filter(p => p.status === 'pending').length, color: 'amber' },
    { key: 'approved', label: 'Approved', count: posts.filter(p => p.status === 'approved').length, color: 'green' },
    { key: 'posted', label: 'Posted', count: posts.filter(p => p.status === 'posted').length, color: 'indigo' },
    { key: 'failed', label: 'Failed', count: posts.filter(p => p.status === 'failed').length, color: 'red' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading scheduled posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Scheduled Posts</h1>
        <p className="text-gray-500 mt-1">Review and manage upcoming LinkedIn posts</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar mx-1">
        {filters.map(({ key, label, count, color }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all duration-500 flex items-center gap-3 border ${
              filter === key
                ? `bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]`
                : 'bg-white/2 border-white/5 text-slate-500 hover:bg-white/5 hover:text-slate-300'
            }`}
          >
            {label}
            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black ${
              filter === key ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-600'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-24 glass rounded-3xl border-2 border-dashed border-white/5">
          <div className="text-6xl mb-6 opacity-20 filter grayscale">📭</div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Queue Buffer Empty</h3>
          <p className="text-slate-500 font-medium max-w-xs mx-auto">No narrative signals detected in the selected frequency range.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPosts.map((post, idx) => {
            return (
              <div
                key={post.id}
                className="glass rounded-3xl p-8 border border-white/5 hover:border-white/10 transition-all duration-500 group"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Post Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 uppercase tracking-widest border ${
                            post.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            post.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            post.status === 'posted' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                             post.status === 'pending' ? 'bg-amber-400' :
                             post.status === 'approved' ? 'bg-emerald-400 animate-pulse' :
                             post.status === 'posted' ? 'bg-blue-400' :
                             'bg-rose-400'
                        }`}></span>
                        {post.status}
                      </span>
                      <span className="text-xs text-slate-400 font-bold flex items-center gap-2 bg-white/2 px-3 py-1.5 rounded-xl border border-white/5 uppercase tracking-tighter">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(post.scheduledFor).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest pl-1">
                      Signal Latency: {new Date(post.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                    className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all duration-300 border border-transparent hover:border-white/10"
                  >
                    <svg 
                      className={`w-5 h-5 transition-transform duration-500 ${expandedPost === post.id ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Post Preview */}
                <div className="mb-8">
                  <div className={`text-slate-200 text-sm leading-relaxed font-medium bg-black/20 p-6 rounded-2xl border border-white/5 shadow-inner transition-all duration-500 ${expandedPost === post.id ? '' : 'line-clamp-4'}`}>
                    {post.content}
                  </div>
                  {post.content.length > 200 && (
                    <button
                      type="button"
                      onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                      className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mt-4 hover:text-blue-300 transition-colors flex items-center gap-2 group-hover:pl-1 transition-all"
                    >
                      {expandedPost === post.id ? 'Compress Narrative' : 'Expand Full Signal'}
                      <svg className={`w-3.5 h-3.5 transition-transform duration-500 ${expandedPost === post.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Error Message */}
                {post.error && (
                  <div className="mb-8 p-6 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                    <div className="flex items-center gap-2 text-[10px] font-black text-rose-400 mb-2 uppercase tracking-widest">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Sequence Alert
                    </div>
                    <div className="text-xs text-rose-300 font-medium italic opacity-80">"{post.error}"</div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                  {post.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => approvePost(post.id)}
                      className="btn-premium px-8 py-3.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Authorize Post
                    </button>
                  )}
                  
                  {(post.status === 'pending' || post.status === 'approved') && (
                    <button
                      type="button"
                      onClick={() => deletePost(post.id)}
                      className="px-6 py-3.5 bg-slate-800/50 text-slate-400 rounded-2xl hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 border border-white/5 transition-all duration-300 text-xs font-black uppercase tracking-widest flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Abort Sequence
                    </button>
                  )}

                  {post.status === 'posted' && post.linkedInPostId && (
                    <a
                      href={`https://www.linkedin.com/feed/update/${post.linkedInPostId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-8 py-3.5 bg-[#0a66c2]/10 text-[#0a66c2] border border-[#0a66c2]/20 rounded-2xl hover:bg-[#0a66c2]/20 transition-all duration-500 text-xs font-black uppercase tracking-widest flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      Terminal Access
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
