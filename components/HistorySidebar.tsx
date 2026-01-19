import React from 'react';
import { GeneratedPost } from '../types';

interface HistorySidebarProps {
  history: GeneratedPost[];
  onSelect: (post: GeneratedPost) => void;
  selectedId?: string;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onSelect, selectedId }) => {
  return (
    <div className="h-full bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Posts</h3>
      </div>
      <div className="p-2 space-y-2">
        {history.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No history yet.</p>
        )}
        {history.map((post) => (
          <button
            key={post.id}
            onClick={() => onSelect(post)}
            className={`w-full text-left p-3 rounded-lg text-sm transition-all hover:bg-gray-50 ${
              selectedId === post.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'border border-transparent'
            }`}
          >
            <p className="font-medium text-gray-900 truncate mb-1">
              {post.config.topic}
            </p>
            <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500 truncate max-w-[120px]">
                {new Date(post.timestamp).toLocaleDateString()}
                </p>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {post.config.format.split(' ')[0]}
                </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};