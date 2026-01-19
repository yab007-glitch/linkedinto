import React, { useState } from 'react';
import { GeneratedPost, LinkedInProfile } from '../types';
import { Button } from './ui/Button';
import { getLinkedInShareUrl, postToLinkedIn, getAccessToken } from '../services/linkedinService';

interface LinkedInPreviewProps {
  post: GeneratedPost | null;
  onRefine: (instruction: string) => void;
  isRefining: boolean;
  linkedInProfile?: LinkedInProfile | null;
}

export const LinkedInPreview: React.FC<LinkedInPreviewProps> = ({ 
  post, 
  onRefine, 
  isRefining,
  linkedInProfile 
}) => {
  const [refinementText, setRefinementText] = useState('');
  const [showFullText, setShowFullText] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Default profile if not connected
  const displayProfile = linkedInProfile || {
    id: "",
    name: "Your Name",
    headline: "LinkedIn Content Creator • 1st",
    avatarUrl: ""
  };

  const hasToken = !!getAccessToken() && !!linkedInProfile?.id;

  if (!post) {
    return (
      <div className="glass border-2 border-dashed border-white/10 rounded-2xl p-10 text-center h-full flex flex-col items-center justify-center min-h-[460px] animate-fade-in-up">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#0a66c2]/20 to-[#6366f1]/20 flex items-center justify-center mb-6 animate-float relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a66c2] to-[#6366f1] opacity-0 group-hover:opacity-20 transition-opacity" />
          <svg className="w-12 h-12 text-[#0a66c2]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
          </svg>
        </div>
        <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Ready to Command Attention?</h3>
        <p className="text-slate-400 text-sm max-w-xs leading-relaxed">Your professional narrative begins here. Fill the form to manifest your vision. ✨</p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(post.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePostToLinkedIn = async () => {
    if (hasToken && linkedInProfile?.id) {
        setIsPosting(true);
        setPostStatus('idle');
        try {
            await postToLinkedIn(post.content, linkedInProfile.id);
            setPostStatus('success');
            setTimeout(() => setPostStatus('idle'), 3000);
        } catch (error: any) {
            console.error(error);
            if (error.message === "This content has already been posted to LinkedIn.") {
                setPostStatus('success');
                setTimeout(() => setPostStatus('idle'), 3000);
            } else {
                setPostStatus('error');
            }
        } finally {
            setIsPosting(false);
        }
    } else {
        const url = getLinkedInShareUrl(post.content);
        const width = 600;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        window.open(url, 'LinkedIn', `width=${width},height=${height},left=${left},top=${top}`);
    }
  };

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refinementText.trim()) {
      onRefine(refinementText);
      setRefinementText('');
    }
  };

  const lines = post.content.split('\n');
  const previewLines = lines.slice(0, 3);
  const isLong = lines.length > 3 || post.content.length > 200;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Mock LinkedIn Card - Premium Style */}
      <div className="preview-card glass overflow-hidden group">
        {/* Header */}
        <div className="preview-header p-5 flex items-start space-x-4">
          {displayProfile.avatarUrl ? (
             <img src={displayProfile.avatarUrl} alt={displayProfile.name} className="w-14 h-14 rounded-full object-cover shadow-2xl border-2 border-white/10" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0a66c2] to-[#6366f1] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#0a66c2]/30">
              {displayProfile.name.charAt(0)}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-white text-base tracking-tight">{displayProfile.name}</h3>
                <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{displayProfile.headline}</p>
                <div className="flex items-center text-[10px] text-slate-500 mt-1 gap-1.5 uppercase font-bold tracking-widest">
                  <span>Now</span>
                  <span className="opacity-30">•</span>
                  <svg className="w-3 h-3 text-[#0a66c2]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <button className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 text-[15px] text-slate-200 whitespace-pre-wrap leading-relaxed tracking-wide">
          {showFullText ? post.content : (
            <>
              {isLong ? (
                <>
                  {previewLines.join('\n')}
                  <span className="text-slate-500">... </span>
                  <button 
                    onClick={() => setShowFullText(true)}
                    className="text-[#0a66c2] hover:text-[#0077b5] font-black hover:underline transition-all"
                  >
                    see more
                  </button>
                </>
              ) : post.content}
            </>
          )}
        </div>

        {/* Engagement Stats */}
        <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center text-slate-500 bg-white/2 cursor-default">
          <div className="flex items-center space-x-3 text-[11px] font-bold tracking-wider uppercase">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0a66c2] to-[#6366f1] flex items-center justify-center border-2 border-[#0f172a] z-20 shadow-xl">
                <span className="text-[10px]">👍</span>
              </div>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center border-2 border-[#0f172a] z-10 shadow-xl">
                <span className="text-[10px]">❤️</span>
              </div>
            </div>
            <span className="text-slate-400">1.2K</span>
          </div>
          <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
            42 comments • 12 reposts
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-2 py-2 border-t border-white/5 flex gap-1 bg-white/2">
          {[
            { icon: "M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5", label: "Like" },
            { icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", label: "Comment" },
            { icon: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z", label: "Repost" },
            { icon: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8", label: "Send" },
          ].map(({ icon, label }) => (
            <button key={label} className="flex-1 py-3.5 hover:bg-white/5 rounded-xl flex items-center justify-center text-slate-400 font-bold text-xs uppercase tracking-widest transition-all group">
              <svg className="w-5 h-5 mr-2 group-hover:text-[#0a66c2] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
              </svg>
              <span className="group-hover:text-white transition-colors">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Action Area */}
      <div className="flex flex-col space-y-4">
        {/* Post Button */}
        <button 
          onClick={handlePostToLinkedIn} 
          disabled={isPosting}
          className={`btn-premium w-full flex items-center justify-center gap-3 py-4.5 ${
              postStatus === 'success' ? 'from-emerald-600 to-teal-500 shadow-emerald-500/30' : ''
          }`}
        >
          {isPosting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : postStatus === 'success' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
          )}
          <span className="tracking-widest font-black uppercase">
            {postStatus === 'success' ? 'Mission Accomplished' : (hasToken ? 'Deploy to LinkedIn' : 'Share Narrative')}
          </span>
        </button>

        {/* Secondary Actions */}
        <div className="flex gap-4">
          <button 
            onClick={handleCopy} 
            className={`flex-1 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 flex-shrink-0 ${
              copied 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white border border-white/5'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                Secured
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copy Script
              </>
            )}
          </button>
          
          <button 
            onClick={() => setShowFullText(!showFullText)} 
            className="flex-1 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-800/20 border border-white/5 text-slate-400 hover:border-white/20 hover:text-white transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={showFullText ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
            </svg>
            {showFullText ? 'Focus' : 'Inspect'}
          </button>
        </div>

        {/* Refine Input */}
        <form onSubmit={handleRefineSubmit} className="relative group">
          <input 
            type="text" 
            placeholder="Summon AI for refinements..."
            className="form-input w-full pl-5 pr-14 py-4 text-sm bg-slate-800/40 focus:bg-slate-800/60"
            value={refinementText}
            onChange={(e) => setRefinementText(e.target.value)}
            disabled={isRefining}
          />
          <button 
            type="submit"
            disabled={!refinementText.trim() || isRefining}
            className="absolute right-2 top-2 p-2.5 bg-gradient-to-r from-[#0a66c2] to-[#6366f1] rounded-xl text-white disabled:opacity-30 transition-all duration-300 shadow-lg shadow-[#0a66c2]/20 group-hover:shadow-[#0a66c2]/40"
          >
            {isRefining ? (
               <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
