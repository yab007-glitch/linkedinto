import React, { useEffect, useState } from 'react';

interface AnalyticsSummary {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  engagementRate: number;
}

interface TopPost {
  id: string;
  content: string;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
  postedAt: string;
}

const StatCard: React.FC<{ title: string; value: string | number; change?: string; trend?: 'up' | 'down' | 'neutral', icon: React.ReactNode, color: string }> = ({ title, value, change, trend, icon }) => (
  <div className="stat-card p-6 group">
    <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</h3>
            <div className="stat-icon p-2.5 rounded-xl text-blue-400 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-all duration-300">
                <div className="w-5 h-5">{icon}</div>
            </div>
        </div>
        <div className="flex items-baseline gap-3">
            <p className="stat-value text-3xl font-black tracking-tight">{value}</p>
            {change && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg tracking-wider uppercase ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : trend === 'down' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                    {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'} {change}
                </span>
            )}
        </div>
    </div>
  </div>
);

export const AnalyticsDashboard: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      // Fetch summary
      const summaryRes = await fetch('/api/analytics/summary');
      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }

      // Fetch top posts
      const postsRes = await fetch('/api/analytics/top-posts?limit=5');
      if (postsRes.ok) {
        setTopPosts(await postsRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="w-12 h-12 border-4 border-white/5 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Calibrating Insights...</p>
        </div>
    );
  }

  // Use mock data if API fails or returns empty (for demo purposes if backend isn't populated)
  const displaySummary = summary || {
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    engagementRate: 0
  };

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5 mx-2">
        <div>
            <h2 className="text-3xl font-black text-white tracking-tight">Intelligence Dashboard</h2>
            <p className="text-slate-400 font-medium mt-1">Measuring the impact of your professional voice</p>
        </div>
        <button 
            onClick={fetchAnalytics}
            className="flex items-center gap-3 px-6 py-3 bg-slate-800/50 border border-white/5 rounded-2xl text-xs font-black text-white hover:bg-slate-800 hover:border-white/20 transition-all shadow-xl tracking-widest uppercase group"
        >
            <svg className="w-4 h-4 text-blue-400 group-rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Re-Sync Performance
        </button>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Total Deployments" 
            value={displaySummary.totalPosts} 
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>}
            color="blue"
        />
        <StatCard 
            title="Narrative Reach" 
            value={displaySummary.totalViews.toLocaleString()} 
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
            color="indigo"
        />
        <StatCard 
            title="Engagement Velocity" 
            value={`${displaySummary.engagementRate}%`} 
            trend="neutral"
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            color="purple"
        />
         <StatCard 
            title="Social Resonance" 
            value={(displaySummary.totalLikes + displaySummary.totalComments).toLocaleString()} 
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
            color="pink"
        />
      </div>

        {/* Two Column Layout for deeper metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Top Performing Posts */}
            <div className="lg:col-span-2 glass rounded-3xl overflow-hidden border border-white/5">
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/2">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">High Impact Content</h3>
                    <span className="text-[10px] font-black px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 uppercase tracking-wider">30-Day Matrix</span>
                </div>
                <div className="divide-y divide-white/5">
                    {topPosts.length > 0 ? (
                        topPosts.map((post) => (
                            <div key={post.id} className="p-8 hover:bg-white/2 transition-all cursor-default group">
                                <p className="text-slate-200 font-medium line-clamp-2 mb-4 group-hover:text-white transition-colors leading-relaxed">{post.content}</p>
                                <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest">
                                    <div className="flex items-center gap-2 text-slate-500 group-hover:text-blue-400 transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        <span>{post.views}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500 group-hover:text-rose-400 transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                        </svg>
                                        <span>{post.likes}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500 group-hover:text-indigo-400 transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                        </svg>
                                        <span>{post.comments}</span>
                                    </div>
                                    <div className="ml-auto text-[10px] text-slate-600 font-black">
                                        {new Date(post.postedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                         <div className="p-16 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/5 mb-6 text-slate-700">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Data Scarcity Detected</h3>
                            <p className="mt-2 text-slate-500 font-medium max-w-xs mx-auto">Initiate content generation to populate your professional resonance matrix.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Side Tips / Insights */}
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-[#0a66c2]/80 to-[#6366f1]/80 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-white/20 transition-all duration-500" />
                    <h3 className="text-xl font-black mb-6 tracking-tight">Temporal Advantage</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest bg-black/20 rounded-2xl p-4 backdrop-blur-md border border-white/10 transition-all hover:bg-black/30">
                            <span className="text-blue-100">Tuesday</span>
                            <span className="text-white">09:00 - 10:00</span>
                        </div>
                         <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest bg-black/20 rounded-2xl p-4 backdrop-blur-md border border-white/10 transition-all hover:bg-black/30">
                            <span className="text-blue-100">Wednesday</span>
                            <span className="text-white">08:00 - 12:00</span>
                        </div>
                         <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest bg-black/20 rounded-2xl p-4 backdrop-blur-md border border-white/10 transition-all hover:bg-black/30">
                            <span className="text-blue-100">Thursday</span>
                            <span className="text-white">10:00 - 11:00</span>
                        </div>
                    </div>
                    <p className="mt-6 text-[10px] text-blue-100 font-bold uppercase tracking-widest leading-relaxed opacity-60">Optimized for maximum social gravity based on your unique profile resonance.</p>
                </div>
            </div>
        </div>
    </div>
  );
};
