import React, { useState } from 'react';
import { PostConfig, Tone, PostFormat } from '../types';
import { Button } from './ui/Button';

interface GeneratorFormProps {
  onGenerate: (config: PostConfig) => Promise<void>;
  isLoading: boolean;
  hasToken?: boolean;
  initialPrompt?: string;
}

const formatIcons: Record<PostFormat, React.ReactNode> = {
  [PostFormat.STORY]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  [PostFormat.LISTICLE]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  [PostFormat.SHORT_PUNCHY]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  [PostFormat.CONTRARIAN]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  [PostFormat.CASE_STUDY]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
};

export const GeneratorForm: React.FC<GeneratorFormProps> = ({ onGenerate, isLoading, hasToken, initialPrompt }) => {
  const [config, setConfig] = useState<PostConfig>({
    topic: '',
    targetAudience: 'Professionals',
    tone: Tone.PROFESSIONAL,
    format: PostFormat.STORY,
    keyPoints: '',
    autoPost: false
  });

  React.useEffect(() => {
    if (initialPrompt) {
      setConfig(prev => ({ ...prev, topic: initialPrompt }));
    }
  }, [initialPrompt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.topic) return;
    await onGenerate(config);
  };

  const handleChange = (field: keyof PostConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="form-card animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-white px-2">
        <div className="logo-icon bg-gradient-to-br from-[#0a66c2] to-[#6366f1] w-12 h-12 flex items-center justify-center shadow-lg shadow-[#0a66c2]/30">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white leading-tight">Create Mastery Post</h2>
          <p className="text-sm text-slate-400 font-medium">Elevate your professional narrative with AI</p>
        </div>
      </div>

      {/* Topic Input */}
      <div className="space-y-3">
        <label htmlFor="topic-input" className="form-label">
          What's on your mind? ✨
        </label>
        <textarea
          id="topic-input"
          required
          rows={3}
          className="form-input w-full p-4 text-sm"
          placeholder="e.g. The importance of empathy in leadership, lessons from my startup journey..."
          value={config.topic}
          onChange={(e) => handleChange('topic', e.target.value)}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label htmlFor="audience-input" className="form-label">
            🎯 Target Audience
          </label>
          <input
            id="audience-input"
            type="text"
            className="form-input w-full p-3 text-sm"
            placeholder="e.g. Junior Developers, CEOs"
            value={config.targetAudience}
            onChange={(e) => handleChange('targetAudience', e.target.value)}
          />
        </div>
        
        <div className="space-y-3">
          <label htmlFor="tone-select" className="form-label">
            🎭 Tone
          </label>
          <select
            id="tone-select"
            className="form-input w-full p-3 text-sm appearance-none"
            value={config.tone}
            onChange={(e) => handleChange('tone', e.target.value as Tone)}
          >
            {Object.values(Tone).map((tone) => (
              <option key={tone} value={tone} className="bg-[#0f172a]">{tone}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Format Selection */}
      <div className="space-y-4">
        <label className="form-label">
          📝 Post Format
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.values(PostFormat).map((format) => (
            <button
              key={format}
              type="button"
              onClick={() => handleChange('format', format)}
              className={`flex items-center justify-center gap-2 text-xs font-bold p-3.5 rounded-xl border transition-all duration-300 ${
                config.format === format
                  ? 'bg-gradient-to-r from-[#0a66c2] to-[#6366f1] text-white border-transparent shadow-lg shadow-[#0a66c2]/40 scale-[1.05]'
                  : 'bg-slate-800/40 text-slate-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {formatIcons[format]}
              <span>{format}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Key Points */}
      <div className="space-y-3">
        <label htmlFor="key-points-input" className="form-label">
          💡 Key Points <span className="text-slate-500 font-normal ml-1 lowercase">(Optional)</span>
        </label>
        <textarea
          id="key-points-input"
          rows={2}
          className="form-input w-full p-4 text-sm"
          placeholder="Specific stats, quotes, or arguments to include..."
          value={config.keyPoints}
          onChange={(e) => handleChange('keyPoints', e.target.value)}
        />
      </div>

      {/* Auto Post Toggle */}
      <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 transition-all hover:border-white/10 group">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${hasToken ? 'bg-blue-500/10 text-blue-400 group-hover:scale-110' : 'bg-slate-800 text-slate-600'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className={`text-sm font-bold ${!hasToken ? 'text-slate-500' : 'text-slate-200'}`}>
              Auto-post to LinkedIn
            </p>
            {!hasToken && (
              <p className="text-[10px] uppercase tracking-wider text-rose-500 font-bold mt-0.5">Connect profile first</p>
            )}
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox"
            className="sr-only peer"
            checked={config.autoPost}
            onChange={(e) => handleChange('autoPost', e.target.checked)}
            disabled={!hasToken}
          />
          <div className="w-12 h-6.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 peer-disabled:opacity-30 peer-disabled:cursor-not-allowed"></div>
        </label>
      </div>

      {/* Submit Button */}
      <button 
        type="submit" 
        className="btn-premium w-full flex items-center justify-center gap-3 py-4.5"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )}
        <span className="text-sm tracking-widest font-black">
          {config.autoPost ? 'LAUNCH & PUBLISH' : 'GENERATE MAGIC'}
        </span>
      </button>
    </form>
  );
};
