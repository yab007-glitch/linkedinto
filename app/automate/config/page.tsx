'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AutomationSettings {
  isEnabled: boolean;
  frequency: 'LOW' | 'MEDIUM' | 'HIGH';
  topics: string[];
  tone: string;
  smartTimezone: string;
}

export default function AutomationConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<AutomationSettings>({
    isEnabled: false,
    frequency: 'MEDIUM',
    topics: [],
    tone: 'Professional',
    smartTimezone: 'UTC',
  });

  const [topicsInput, setTopicsInput] = useState('');

  // Fetch current settings
  useEffect(() => {
    fetch('/api/settings/automation')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load settings');
        return res.json();
      })
      .then(data => {
        setSettings(data);
        setTopicsInput(data.topics?.join(', ') || '');
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load settings');
        setLoading(false);
        console.error(err);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Parse topics
    const topicsArray = topicsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const newSettings = {
      ...settings,
      topics: topicsArray,
    };

    try {
      const res = await fetch('/api/settings/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });

      if (!res.ok) throw new Error('Failed to save settings');
      
      const data = await res.json();
      setSettings(data);
      setSuccess('Settings saved successfully! Automation is updated.');
    } catch {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-2xl font-bold text-blue-400 hover:text-blue-300">
              LinkedInto
            </Link>
            <span className="text-slate-500">→</span>
            <Link href="/automate" className="text-slate-400 hover:text-white">
              🤖 Automation
            </Link>
            <span className="text-slate-500">→</span>
            <span className="text-white font-medium">⚙️ Configuration</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-300 bg-amber-600/20 text-amber-400 px-3 py-1 rounded-full text-sm">
              🔧 Config Mode
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8 shadow-xl">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">🧠 Autonomous Brain</h1>
                <p className="text-slate-400">
                  Configure the AI to run 24/7, discover topics, and post on your behalf.
                </p>
              </div>
              <div className="bg-blue-900/30 p-3 rounded-lg border border-blue-800">
                <span className="text-2xl">⚡</span>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-8">
                {/* Global Switch */}
                <div className={`p-6 rounded-xl border transition-colors ${
                  settings.isEnabled 
                    ? 'bg-green-600/10 border-green-600/30' 
                    : 'bg-slate-700/30 border-slate-600'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Autonomous Mode</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        When enabled, the AI will check schedule hourly and post automatically.
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, isEnabled: !settings.isEnabled })}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                        settings.isEnabled ? 'bg-green-500' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`${
                          settings.isEnabled ? 'translate-x-7' : 'translate-x-1'
                        } inline-block h-6 w-6 transform rounded-full bg-white transition-transform`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Frequency */}
                  <div>
                    <span className="block text-sm font-medium text-slate-300 mb-2">
                       Posting Frequency
                    </span>
                    <div className="grid gap-3" role="radiogroup" aria-label="Posting Frequency">
                      {[
                        { id: 'LOW', label: 'Steady (1/day)', desc: 'Posts once daily at optimal time' },
                        { id: 'MEDIUM', label: 'Growth (2/day)', desc: 'Morning and Evening posts' },
                        { id: 'HIGH', label: 'Aggressive (3/day)', desc: 'Morning, Noon, and Evening' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSettings({ ...settings, frequency: opt.id as AutomationSettings['frequency'] })}
                          className={`cursor-pointer p-4 rounded-lg border text-left transition-all ${
                            settings.frequency === opt.id
                              ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500'
                              : 'bg-slate-700/30 border-slate-600 hover:bg-slate-700/50'
                          }`}
                        >
                          <div className={`font-semibold ${settings.frequency === opt.id ? 'text-blue-400' : 'text-slate-200'}`}>
                            {opt.label}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Tone */}
                    <div>
                      <label htmlFor="tone" className="block text-sm font-medium text-slate-300 mb-2">
                        Content Tone
                      </label>
                      <select
                        id="tone"
                        value={settings.tone}
                        onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="Professional">Professional</option>
                        <option value="Casual">Casual</option>
                        <option value="Inspirational">Inspirational</option>
                        <option value="Educational">Educational</option>
                        <option value="Controversial">Controversial (High Engagement)</option>
                      </select>
                    </div>

                    {/* Timezone */}
                    <div>
                      <label htmlFor="timezone" className="block text-sm font-medium text-slate-300 mb-2">
                        Smart Timezone
                      </label>
                      <select
                        id="timezone"
                        value={settings.smartTimezone}
                        onChange={(e) => setSettings({ ...settings, smartTimezone: e.target.value })}
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="UTC">UTC (Universal)</option>
                        <option value="America/New_York">New York (EST)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Asia/Dubai">Dubai (GST)</option>
                        <option value="Asia/Singapore">Singapore (SGT)</option>
                        <option value="America/Los_Angeles">Los Angeles (PST)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Topics */}
                <div>
                  <label htmlFor="topics" className="block text-sm font-medium text-slate-300 mb-2">
                    Focus Topics (comma separated)
                  </label>
                  <textarea
                    id="topics"
                    rows={3}
                    value={topicsInput}
                    onChange={(e) => setTopicsInput(e.target.value)}
                    placeholder="e.g. Artificial Intelligence, SaaS Growth, Leadership, Remote Work..."
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    The AI will prioritize these topics but may also explore trending news in your industry.
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-6 border-t border-slate-700 flex items-center justify-between">
                  <div className="text-sm">
                    {success && <span className="text-green-400 font-medium">✓ {success}</span>}
                    {error && <span className="text-red-400 font-medium">✗ {error}</span>}
                  </div>
                  
                  <div className="flex gap-4">
                    <Link
                      href="/automate"
                      className="px-6 py-3 rounded-xl font-medium text-slate-300 hover:text-white transition-colors"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
