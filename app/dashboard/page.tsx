'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TokenUsage {
  total: number;
  estimatedInput: number;
  estimatedOutput: number;
}

interface CostInfo {
  input: number;
  output: number;
  total: number;
  formatted: string;
}

interface GeneratedContent {
  content: string;
  hashtags: string[];
  generationId?: string;
  tokenUsage?: TokenUsage;
  cost?: CostInfo;
  model?: string;
}

interface LinkedInProfile {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
}

interface SessionStats {
  totalGenerations: number;
  totalTokens: number;
  totalCost: number;
}

export default function DashboardPage() {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<'professional' | 'casual' | 'inspirational' | 'educational' | 'humorous'>('professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState<string | null>(null);
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalGenerations: 0,
    totalTokens: 0,
    totalCost: 0,
  });

  // Load profile on mount
  useEffect(() => {
    // Fetch LinkedIn profile on first load
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/dev/profile');
        if (res.status === 403) {
          // Dev mode is not enabled or user not authorized
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    
    fetchProfile();
    console.log('Dashboard v1.1.0 - Fix applied');
  }, []);

  // Generate content using AI
  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/dev/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          tone,
          length,
          includeHashtags: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate content');
      }

      const data = await res.json();
      setGeneratedContent(data);

      // Update session stats
      if (data.cost && data.tokenUsage) {
        setSessionStats(prev => ({
          totalGenerations: prev.totalGenerations + 1,
          totalTokens: prev.totalTokens + (data.tokenUsage?.total || 0),
          totalCost: prev.totalCost + (data.cost?.total || 0),
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  // Post to LinkedIn
  const handlePost = async () => {
    if (!generatedContent?.content) return;

    setIsPosting(true);
    setError(null);
    setPostStatus(null);

    try {
      const fullContent = generatedContent.content + 
        (generatedContent.hashtags?.length 
          ? '\n\n' + generatedContent.hashtags.map(h => `#${h}`).join(' ') 
          : '');

      const res = await fetch('/api/dev/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fullContent }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to post to LinkedIn');
      }

      const data = await res.json();
      setPostStatus(`✅ Posted successfully! View at: ${data.url}`);
      setGeneratedContent(null);
      setTopic('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-blue-400">LinkedInto</h1>
            <Link
              href="/automate"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
            >
              🤖 Auto-Generate
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {/* Session Stats */}
            <div className="hidden md:flex items-center gap-3 text-sm">
              <div className="bg-slate-700/50 px-3 py-1 rounded-lg">
                <span className="text-slate-400">Generations:</span>{' '}
                <span className="text-white font-medium">{sessionStats.totalGenerations}</span>
              </div>
              <div className="bg-slate-700/50 px-3 py-1 rounded-lg">
                <span className="text-slate-400">Tokens:</span>{' '}
                <span className="text-white font-medium">{sessionStats.totalTokens.toLocaleString()}</span>
              </div>
              <div className="bg-green-600/20 px-3 py-1 rounded-lg border border-green-600/30">
                <span className="text-green-400">Cost:</span>{' '}
                <span className="text-green-300 font-medium">${sessionStats.totalCost.toFixed(6)}</span>
              </div>
            </div>
            <span className="text-slate-300 bg-amber-600/20 text-amber-400 px-3 py-1 rounded-full text-sm">
              🔧 Dev Mode
            </span>
            {profile && (
              <span className="text-slate-300">
                {profile.name || 'Connected'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Status Messages */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {postStatus && (
            <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg">
              {postStatus}
            </div>
          )}

          {/* Content Generator */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-6">✨ AI Content Generator</h2>

            <div className="space-y-4">
              {/* Topic Input */}
              <div>
                <label htmlFor="topic-input" className="block text-sm font-medium text-slate-300 mb-2">
                  What would you like to post about?
                </label>
                <textarea
                  id="topic-input"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., The importance of work-life balance in tech..."
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Options Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tone-select" className="block text-sm font-medium text-slate-300 mb-2">Tone</label>
                  <select
                    id="tone-select"
                    value={tone}
                    onChange={(e) => setTone(e.target.value as typeof tone)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="inspirational">Inspirational</option>
                    <option value="educational">Educational</option>
                    <option value="humorous">Humorous</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="length-select" className="block text-sm font-medium text-slate-300 mb-2">Length</label>
                  <select
                    id="length-select"
                    value={length}
                    onChange={(e) => setLength(e.target.value as typeof length)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="short">Short (50-100 words)</option>
                    <option value="medium">Medium (100-200 words)</option>
                    <option value="long">Long (200-300 words)</option>
                  </select>
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !topic.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {isGenerating ? '⏳ Generating...' : '🚀 Generate Content'}
              </button>
            </div>
          </div>

          {/* Generated Content Preview */}
          {generatedContent && (
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-white">📝 Generated Post</h2>
                
                {/* Cost Badge */}
                {generatedContent.cost && (
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-700/50 px-3 py-1.5 rounded-lg text-sm">
                      <span className="text-slate-400">Tokens:</span>{' '}
                      <span className="text-white">{generatedContent.tokenUsage?.total || 0}</span>
                    </div>
                    <div className="bg-green-600/20 border border-green-600/30 px-3 py-1.5 rounded-lg text-sm">
                      <span className="text-green-400">Cost:</span>{' '}
                      <span className="text-green-300 font-medium">{generatedContent.cost.formatted}</span>
                    </div>
                    {generatedContent.model && (
                      <div className="bg-purple-600/20 border border-purple-600/30 px-3 py-1.5 rounded-lg text-sm">
                        <span className="text-purple-300">{generatedContent.model}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Preview */}
              <div className="bg-white rounded-lg p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {profile?.name?.[0] || 'Y'}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{profile?.name || 'You'}</div>
                    <div className="text-sm text-slate-500">Just now • 🌐</div>
                  </div>
                </div>
                <div className="text-slate-800 whitespace-pre-wrap">
                  {generatedContent.content}
                </div>
                {generatedContent.hashtags?.length > 0 && (
                  <div className="mt-4 text-blue-600">
                    {generatedContent.hashtags.map(h => `#${h}`).join(' ')}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handlePost}
                  disabled={isPosting}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {isPosting ? '📤 Posting...' : '📤 Post to LinkedIn'}
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  🔄 Regenerate
                </button>
              </div>
            </div>
          )}

          {/* Mobile Stats */}
          <div className="md:hidden mt-6 bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Session Stats</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{sessionStats.totalGenerations}</div>
                <div className="text-xs text-slate-400">Generations</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{sessionStats.totalTokens.toLocaleString()}</div>
                <div className="text-xs text-slate-400">Tokens</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">${sessionStats.totalCost.toFixed(4)}</div>
                <div className="text-xs text-slate-400">Total Cost</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
