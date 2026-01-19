import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

interface AutomationStats {
  totalPosts: number;
  pending: number;
  approved: number;
  posted: number;
  failed: number;
  upcoming: number;
  overdue: number;
  unprocessedArticles: number;
  totalArticles: number;
  nextPostTime?: string;
  nextPostIn?: string;
}

interface AutomationConfig {
  enabled: boolean;
  postingInterval: number;
  lastRun: string | null;
  nextRun: string | null;
}

export const AutomationDashboard: React.FC = () => {
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, configRes] = await Promise.all([
        fetch(`${API_BASE}/automation/stats`),
        fetch(`${API_BASE}/automation/config`)
      ]);
      
      if (statsRes.ok && configRes.ok) {
        setStats(await statsRes.json());
        setConfig(await configRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomation = async () => {
    if (!config) return;
    
    try {
      const res = await fetch(`${API_BASE}/automation/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !config.enabled })
      });
      
      if (res.ok) {
        const newConfig = await res.json();
        setConfig(newConfig);
      }
    } catch (error) {
      console.error('Failed to toggle automation:', error);
    }
  };

  const generateNow = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/automation/generate-now`, {
        method: 'POST'
      });
      
      if (res.ok) {
        setTimeout(fetchData, 3000);
      } 
    } catch (error) {
      console.error('Failed to trigger generation:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading automation dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Pending Context', value: stats?.unprocessedArticles || 0, sublabel: 'RSS feed intake', color: 'blue', icon: '📄' },
    { label: 'Upcoming Deploy', value: stats?.upcoming || 0, sublabel: 'Temporal queue', color: 'purple', icon: '📅' },
    { label: 'Finalized', value: stats?.posted || 0, sublabel: 'Successfully public', color: 'green', icon: '✅' },
    { label: 'Verification', value: stats?.pending || 0, sublabel: 'Awaiting signal', color: 'amber', icon: '⏳' },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-white/5 mx-2">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Automation Matrix</h1>
          <p className="text-slate-400 font-medium mt-1">Autonomous intelligence scaling your professional resonance</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={generateNow}
            disabled={generating || !config?.enabled}
            className="btn-premium flex items-center gap-3 px-6 py-3.5 shadow-[#0a66c2]/40"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Initializing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Sync Now
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={toggleAutomation}
            className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all duration-500 border flex items-center gap-3 ${
              config?.enabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5'
                : 'bg-slate-800/50 text-slate-500 border-white/5 hover:bg-slate-800'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${config?.enabled ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-slate-600'}`}></div>
            {config?.enabled ? 'Matrix Active' : 'Matrix Offline'}
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div 
            key={card.label}
            className="glass rounded-3xl p-7 border border-white/5 hover:border-white/20 transition-all duration-500 group cursor-default"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-500">
                {card.icon}
              </div>
              <div className={`w-1.5 h-1.5 rounded-full ${card.color === 'green' ? 'bg-emerald-400' : card.color === 'blue' ? 'bg-blue-400' : card.color === 'purple' ? 'bg-indigo-400' : 'bg-rose-400'} animate-pulse`}></div>
            </div>
            <div className="text-4xl font-black text-white tracking-tighter mb-1">
              {card.value}
            </div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{card.label}</div>
            <div className="text-[10px] text-slate-600 font-bold mt-1 opacity-60 italic">{card.sublabel}</div>
          </div>
        ))}
      </div>

      {/* Next Post Info */}
      {stats?.nextPostTime && (
        <div className="glass rounded-3xl p-8 border border-blue-500/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-blue-500/10 transition-all duration-1000"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                Next Temporal Deployment
              </h3>
              <p className="text-2xl font-black text-white tracking-tight">
                {new Date(stats.nextPostTime).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-xl text-[10px] font-black text-blue-300 uppercase tracking-wider border border-blue-500/20">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Commencing in {stats.nextPostIn}
              </div>
            </div>
            <div className="text-6xl opacity-20 filter grayscale group-hover:grayscale-0 group-hover:opacity-40 transition-all duration-1000 transform group-hover:rotate-12 group-hover:scale-110">🚀</div>
          </div>
        </div>
      )}

      {/* Configuration & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass rounded-3xl p-8 border border-white/5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-lg shadow-inner">⚙️</div>
              Operational Parameters
            </h3>
            <div className="space-y-8">
              <div className="space-y-3">
                <label htmlFor="frequency-interval" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Frequency Interval</label>
                <select
                  id="frequency-interval"
                  value={config?.postingInterval || 6}
                  onChange={async (e) => {
                    const newInterval = parseInt(e.target.value, 10);
                    try {
                      const res = await fetch(`${API_BASE}/automation/config`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ postingInterval: newInterval })
                      });
                      if (res.ok) {
                        const updatedConfig = await res.json();
                        setConfig(updatedConfig);
                      }
                    } catch (error) {
                      console.error('Failed to update interval:', error);
                    }
                  }}
                  className="form-input w-full p-4 text-sm appearance-none cursor-pointer bg-slate-800/40 hover:bg-slate-800 focus:bg-slate-800"
                >
                  <option value={1} className="bg-slate-900">Every 1 hour</option>
                  <option value={2} className="bg-slate-900">Every 2 hours</option>
                  <option value={3} className="bg-slate-900">Every 3 hours</option>
                  <option value={4} className="bg-slate-900">Every 4 hours</option>
                  <option value={6} className="bg-slate-900">Every 6 hours</option>
                  <option value={8} className="bg-slate-900">Every 8 hours</option>
                  <option value={12} className="bg-slate-900">Every 12 hours</option>
                  <option value={24} className="bg-slate-900">Every 24 hours</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Previous Sequence</label>
                    <div className="form-input p-4 text-[11px] font-bold text-slate-300 bg-white/2 truncate">
                      {config?.lastRun ? new Date(config.lastRun).toLocaleTimeString() : 'Await Start'}
                    </div>
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Next Expected</label>
                    <div className="form-input p-4 text-[11px] font-bold text-blue-400 bg-blue-500/5 border-blue-500/20 truncate">
                      {config?.nextRun ? new Date(config.nextRun).toLocaleTimeString() : 'Calculating...'}
                    </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl p-8 border border-white/5 flex flex-col">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-lg shadow-inner">📊</div>
              Cumulative Resonance
            </h3>
            <div className="grid grid-cols-2 gap-4 flex-1">
              {[
                { value: stats?.totalArticles || 0, label: 'Context Points', color: 'slate-500' },
                { value: stats?.totalPosts || 0, label: 'Generated Outputs', color: 'blue-400' },
                { value: stats?.approved || 0, label: 'Verified Signals', color: 'emerald-400' },
                { value: stats?.failed || 0, label: 'Sequence Interrupts', color: 'rose-500' },
              ].map((item) => (
                <div key={item.label} className="p-5 rounded-2xl bg-white/2 border border-white/5 hover:bg-white/5 transition-all group flex flex-col justify-center">
                  <div className={`text-2xl font-black text-white group-hover:scale-110 transition-transform origin-left`}>
                    {item.value}
                  </div>
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-br from-[#0a66c2]/10 to-[#6366f1]/5 border border-[#0a66c2]/10 rounded-3xl p-8 group">
        <div className="flex items-start gap-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0a66c2]/20 to-[#6366f1]/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:rotate-12 transition-transform duration-500">ℹ️</div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-4">Core Operational Protocol</h4>
            <ul className="text-xs text-slate-400 space-y-3 font-medium">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                RSS streams synchronize temporal context every 120 minutes for precise healthcare news mapping.
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                Synthesizing narrative sequences at 6-hour intervals (00, 06, 12, 18) to maintain audience resonance.
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                All generated signals require human verification (Post Approval) before terminal public deployment.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
