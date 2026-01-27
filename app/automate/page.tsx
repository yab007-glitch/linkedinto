'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface GeneratedPost {
  topic: string;
  category: string;
  content: string;
  hashtags: string[];
  hook: string;
  status: 'generated' | 'posted' | 'failed';
  linkedInUrl?: string;
  cost: number;
  tokens: number;
}

interface AutomationResult {
  success: boolean;
  results: GeneratedPost[];
  summary: {
    total: number;
    generated: number;
    posted: number;
    failed: number;
    totalTokens: number;
    totalCost: number;
    formattedCost: string;
  };
}

interface TrendingTopic {
  topic: string;
  category: string;
  hook: string;
  relevance: string;
}

interface LinkedInProfile {
  name?: string;
}

export default function AutomatePage() {
  const [count, setCount] = useState(3);
  const [tone, setTone] = useState<'professional' | 'casual' | 'inspirational' | 'educational' | 'humorous'>('professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [autoPost, setAutoPost] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AutomationResult | null>(null);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [selectedPost, setSelectedPost] = useState<GeneratedPost | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postingIndex, setPostingIndex] = useState<number | null>(null);

  // Fetch profile
  useEffect(() => {
    fetch('/api/dev/profile')
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(console.error);
    console.log('Automate Page v1.2.1 - Fix applied again');
  }, []);

  // Discover trending topics
  const discoverTopics = async () => {
    setIsLoadingTopics(true);
    try {
      const res = await fetch('/api/dev/topics');
      const data = await res.json();
      setTrendingTopics(data.topics || []);
    } catch (error) {
      console.error('Failed to discover topics:', error);
    } finally {
      setIsLoadingTopics(false);
    }
  };

  // Run full automation
  const runAutomation = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      const res = await fetch('/api/dev/automate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count,
          tone,
          length,
          autoPost,
        }),
      });

      const data: AutomationResult = await res.json();
      setResults(data);
    } catch (error) {
      console.error('Automation failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Post a single generated post
  const postToLinkedIn = async (post: GeneratedPost, index: number) => {
    setIsPosting(true);
    setPostingIndex(index);

    try {
      const fullContent = post.content + '\n\n' + (post.hashtags?.map(h => `#${h}`).join(' ') || '');
      
      const res = await fetch('/api/dev/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fullContent }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update the post status in results
        if (results) {
          const updatedResults = [...results.results];
          updatedResults[index] = {
            ...updatedResults[index],
            status: 'posted',
            linkedInUrl: data.url,
          };
          setResults({
            ...results,
            results: updatedResults,
            summary: {
              ...results.summary,
              generated: results.summary.generated - 1,
              posted: results.summary.posted + 1,
            },
          });
        }
      }
    } catch (error) {
      console.error('Posting failed:', error);
    } finally {
      setIsPosting(false);
      setPostingIndex(null);
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
            <span className="text-white font-medium">🤖 Automation</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-300 bg-amber-600/20 text-amber-400 px-3 py-1 rounded-full text-sm">
              🔧 Dev Mode
            </span>
            {profile?.name && (
              <span className="text-slate-300">{profile.name}</span>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Automation Controls */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">🚀 Auto-Generate LinkedIn Posts</h2>
            <p className="text-slate-400 mb-6">
              Automatically discover trending topics and generate professional posts
            </p>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div>
                <label htmlFor="post-count" className="block text-sm font-medium text-slate-300 mb-2">
                  Number of Posts
                </label>
                <select
                  id="post-count"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white"
                >
                  {[1, 2, 3, 5, 7, 10].map(n => (
                    <option key={n} value={n}>{n} post{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="tone-select" className="block text-sm font-medium text-slate-300 mb-2">Tone</label>
                <select
                  id="tone-select"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as typeof tone)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white"
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
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Auto-Post
                  <button
                    type="button"
                    onClick={() => setAutoPost(!autoPost)}
                    className={`w-full mt-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      autoPost 
                        ? 'bg-green-600 text-white' 
                        : 'bg-slate-700/50 border border-slate-600 text-slate-400'
                    }`}
                  >
                    {autoPost ? '✓ Auto-Post ON' : 'Auto-Post OFF'}
                  </button>
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={runAutomation}
                disabled={isRunning}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-4 rounded-xl transition-all text-lg"
              >
                {isRunning ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚡</span> Generating {count} Posts...
                  </span>
                ) : (
                  `🤖 Generate ${count} Posts Automatically`
                )}
              </button>
              
              <button
                type="button"
                onClick={discoverTopics}
                disabled={isLoadingTopics}
                className="px-6 bg-slate-700 hover:bg-slate-600 text-white font-medium py-4 rounded-xl transition-colors"
              >
                {isLoadingTopics ? '...' : '🔍 Preview Topics'}
              </button>
            </div>

            {autoPost && (
              <div className="mt-4 bg-amber-600/10 border border-amber-600/30 text-amber-400 px-4 py-3 rounded-lg">
                ⚠️ <strong>Auto-Post is ON</strong> - Generated posts will be immediately published to your LinkedIn profile.
              </div>
            )}
          </div>

          {/* Trending Topics Preview */}
          {trendingTopics.length > 0 && (
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">🔥 Discovered Topics</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingTopics?.map((topic, i) => (
                  <div key={`${topic.topic}-${i}`} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                    <div className="text-xs text-blue-400 mb-1">{topic.category}</div>
                    <div className="text-white font-medium mb-2">{topic.topic}</div>
                    <div className="text-sm text-slate-400 italic">&ldquo;{topic.hook}&rdquo;</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4">📊 Generation Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-slate-700/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-white">{results.summary?.total || 0}</div>
                    <div className="text-sm text-slate-400">Total</div>
                  </div>
                  <div className="bg-blue-600/20 rounded-lg p-4 text-center border border-blue-600/30">
                    <div className="text-3xl font-bold text-blue-400">{results.summary?.generated || 0}</div>
                    <div className="text-sm text-slate-400">Generated</div>
                  </div>
                  <div className="bg-green-600/20 rounded-lg p-4 text-center border border-green-600/30">
                    <div className="text-3xl font-bold text-green-400">{results.summary?.posted || 0}</div>
                    <div className="text-sm text-slate-400">Posted</div>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-white">{results.summary?.totalTokens?.toLocaleString() || 0}</div>
                    <div className="text-sm text-slate-400">Tokens</div>
                  </div>
                  <div className="bg-green-600/20 rounded-lg p-4 text-center border border-green-600/30">
                    <div className="text-3xl font-bold text-green-400">{results.summary?.formattedCost || '$0.00'}</div>
                    <div className="text-sm text-slate-400">Total Cost</div>
                  </div>
                </div>
              </div>

              {/* Generated Posts */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4">📝 Generated Posts</h3>
                <div className="space-y-4">
                  {results.results?.map((post, index) => (
                    <div
                      key={`${post.topic}-${index}`}
                      className={`rounded-xl border p-4 transition-colors ${
                        post.status === 'posted' 
                          ? 'bg-green-600/10 border-green-600/30' 
                          : post.status === 'failed'
                          ? 'bg-red-600/10 border-red-600/30'
                          : 'bg-slate-700/30 border-slate-600/50 hover:border-blue-500/50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs text-blue-400 bg-blue-600/20 px-2 py-0.5 rounded">
                            {post.category}
                          </span>
                          <h4 className="text-white font-medium mt-1">{post.topic}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{post.tokens} tokens</span>
                          <span className="text-xs text-green-400">${post.cost.toFixed(6)}</span>
                          {post.status === 'posted' && (
                            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                              ✓ Posted
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 mb-3">
                        <div className="text-slate-800 text-sm whitespace-pre-wrap line-clamp-4">
                          {post.content}
                        </div>
                        {post.hashtags?.length > 0 && (
                          <div className="mt-2 text-blue-600 text-xs">
                            {post.hashtags?.map(h => `#${h}`).join(' ')}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {post.status === 'generated' && (
                          <button
                            type="button"
                            onClick={() => postToLinkedIn(post, index)}
                            disabled={isPosting && postingIndex === index}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                          >
                            {isPosting && postingIndex === index ? '📤 Posting...' : '📤 Post to LinkedIn'}
                          </button>
                        )}
                        {post.linkedInUrl && (
                          <a
                            href={post.linkedInUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg text-center transition-colors"
                          >
                            🔗 View on LinkedIn
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedPost(post)}
                          className="px-4 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                        >
                          👁️ Preview
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Post Preview Modal */}
          {selectedPost && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white">Post Preview</h3>
                    <button
                      type="button"
                      onClick={() => setSelectedPost(null)}
                      className="text-slate-400 hover:text-white text-2xl"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-lg p-6">
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
                      {selectedPost.content}
                    </div>
                    <div className="mt-4 text-blue-600">
                      {selectedPost.hashtags?.map(h => `#${h}`).join(' ')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
