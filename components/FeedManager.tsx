import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

interface Feed {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  category: string;
  lastFetch: string | null;
  articleCount: number;
  errors: Array<{ message: string; timestamp: string }>;
}

export const FeedManager: React.FC = () => {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      const res = await fetch(`${API_BASE}/feeds`);
      if (res.ok) {
        const data = await res.json();
        setFeeds(data);
      }
    } catch (error) {
      console.error('Failed to fetch feeds:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeed = async (feedId: string, enabled: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/feeds/${feedId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      
      if (res.ok) {
        fetchFeeds();
      }
    } catch (error) {
      console.error('Failed to toggle feed:', error);
    }
  };

  const refreshFeed = async (feedId: string) => {
    setRefreshing(feedId);
    try {
      const res = await fetch(`${API_BASE}/feeds/${feedId}/refresh`, {
        method: 'POST'
      });
      
      if (res.ok) {
        await res.json();
        fetchFeeds();
      }
    } catch (error) {
      console.error('Failed to refresh feed:', error);
    } finally {
      setRefreshing(null);
    }
  };

  const refreshAllFeeds = async () => {
    setRefreshing('all');
    try {
      const res = await fetch(`${API_BASE}/feeds/refresh-all`, {
        method: 'POST'
      });
      
      if (res.ok) {
        fetchFeeds();
      }
    } catch (error) {
      console.error('Failed to refresh feeds:', error);
    } finally {
      setRefreshing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 gap-4">
        <div className="w-12 h-12 border-4 border-white/5 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Scanning Frequencies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-white/5 mx-2">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Signal Sources</h1>
          <p className="text-slate-400 font-medium mt-1">Configuring the global healthcare intelligence intake</p>
        </div>
        
        <button
          type="button"
          onClick={refreshAllFeeds}
          disabled={refreshing === 'all'}
          className="btn-premium flex items-center gap-3 px-6 py-3.5 shadow-amber-500/20 from-amber-500 to-orange-600"
        >
          {refreshing === 'all' ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Synchronizing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-Sync All Sources
            </>
          )}
        </button>
      </div>

      {/* Feeds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {feeds.map((feed, idx) => (
          <div
            key={feed.id}
            className={`glass rounded-3xl p-8 border hover:border-white/20 transition-all duration-500 hover:-translate-y-2 group ${
              feed.enabled ? 'border-amber-500/10' : 'border-white/5'
            }`}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Feed Header */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4 mb-1.5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-transform duration-500 group-hover:scale-110 ${
                    feed.enabled 
                      ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-500' 
                      : 'bg-white/5 text-slate-600'
                  }`}>
                    📡
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black text-white truncate tracking-tight">{feed.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{feed.category}</span>
                        {feed.enabled && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded-lg uppercase tracking-tighter border border-emerald-500/20">
                            <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></span>
                            Live
                            </span>
                        )}
                    </div>
                  </div>
                </div>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  checked={feed.enabled}
                  onChange={(e) => toggleFeed(feed.id, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-white"></div>
              </label>
            </div>

            {/* Feed Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-5 bg-white/2 rounded-2xl border border-white/5 group-hover:bg-white/5 transition-colors">
                <div className="text-3xl font-black text-white tracking-tighter">{feed.articleCount}</div>
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Signals Processed</div>
              </div>
              <div className="p-5 bg-white/2 rounded-2xl border border-white/5 group-hover:bg-white/5 transition-colors">
                <div className="text-sm font-black text-slate-300">
                  {feed.lastFetch
                    ? new Date(feed.lastFetch).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : 'N/A'}
                </div>
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Terminal Sync</div>
              </div>
            </div>

            {/* Feed URL */}
            <div className="mb-8">
              <label className="text-[10px] text-slate-500 font-black mb-2.5 uppercase tracking-widest block pl-1">Source Protocol</label>
              <div className="text-[11px] text-slate-400 truncate bg-black/20 px-4 py-3 rounded-xl border border-white/5 font-mono shadow-inner group-hover:text-amber-400/60 transition-colors">
                {feed.url}
              </div>
            </div>

            {/* Errors */}
            {feed.errors && feed.errors.length > 0 && (
              <div className="mb-8 p-5 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                <div className="flex items-center gap-2 text-[10px] font-black text-rose-400 mb-2 uppercase tracking-widest">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Interrupt Detected
                </div>
                <div className="text-[11px] text-rose-300/80 font-medium leading-relaxed italic">
                  "{feed.errors[feed.errors.length - 1].message}"
                </div>
              </div>
            )}

            {/* Actions */}
            <button
              type="button"
              onClick={() => refreshFeed(feed.id)}
              disabled={!feed.enabled || refreshing === feed.id}
              className={`w-full px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 border ${
                feed.enabled
                  ? 'bg-slate-800/40 border-white/5 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-white/10'
                  : 'bg-transparent border-white/5 text-slate-700 cursor-not-allowed'
              }`}
            >
              {refreshing === feed.id ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>
                  Calibrating...
                </>
              ) : (
                <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Source Sync
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-gradient-to-br from-[#0a66c2]/10 to-[#6366f1]/5 border border-[#0a66c2]/10 rounded-3xl p-8 group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="flex items-start gap-6 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform duration-500">💡</div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-4 text-orange-400">Stream Alignment Strategy</h4>
            <ul className="text-xs text-slate-400 space-y-3 font-medium">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></span>
                Integrated RSS streams refresh every 120 minutes during periods of high temporal volatility.
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></span>
                Disabling a source retains processed context while preventing new narrative intake.
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></span>
                New narrative signals are automatically analyzed and mapped to pending output sequences.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
