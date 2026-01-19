import React, { useState, useEffect } from 'react';
import { GeneratorForm } from './components/GeneratorForm';
import { LinkedInPreview } from './components/LinkedInPreview';
import { HistorySidebar } from './components/HistorySidebar';
import { ProfileModal } from './components/ProfileModal';
import { AutomationDashboard } from './components/AutomationDashboard';
import { FeedManager } from './components/FeedManager';
import { ScheduledPostsList } from './components/ScheduledPostsList';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { TemplatesManager } from './components/TemplatesManager';
import { ToastProvider, useToast } from './components/ui/ToastContext';
import type { GeneratedPost, PostConfig, LinkedInProfile } from './types';
import { generateLinkedInPost, refinePost } from './services/huggingfaceService';
import { getStoredProfile, saveProfile, getAccessToken, postToLinkedIn } from './services/linkedinService';

// Tab icons as SVG components
const TabIcons = {
  generator: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  automation: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  feeds: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  ),
  scheduled: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  analytics: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  templates: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
};

const AppContent: React.FC = () => {
  const { showToast } = useToast();
  const [currentPost, setCurrentPost] = useState<GeneratedPost | null>(null);
  const [history, setHistory] = useState<GeneratedPost[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'generator' | 'automation' | 'feeds' | 'scheduled' | 'analytics' | 'templates'>('generator');
  
  // Template injection state
  const [injectedTemplate, setInjectedTemplate] = useState<{ structure: string } | null>(null);

  // LinkedIn Auth State
  const [linkedInUser, setLinkedInUser] = useState<LinkedInProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  const API_BASE = '/api';

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/history`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (e) {
        console.error("Failed to fetch history from server", e);
      }
    };

    fetchHistory();

    const savedProfile = getStoredProfile();
    const token = getAccessToken();
    if (savedProfile) {
      setLinkedInUser(savedProfile);
    }
    setHasToken(!!token);
  }, []);

  const handleGeneration = async (config: PostConfig) => {
    setIsGenerating(true);
    setInjectedTemplate(null); // Clear injected template after use
    try {
      const content = await generateLinkedInPost(config, linkedInUser);

      const newPost: GeneratedPost = {
        id: Date.now().toString(),
        content,
        config,
        timestamp: Date.now(),
      };

      setCurrentPost(newPost);

      try {
        await fetch(`${API_BASE}/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPost)
        });
        setHistory(prev => [newPost, ...prev]);
        showToast('Post generated and saved!', 'success');
      } catch (e) {
        console.error("Failed to save post to server", e);
        showToast('Generated post, but failed to save to history.', 'warning');
      }

      if (config.autoPost && linkedInUser?.id && hasToken) {
        try {
          await postToLinkedIn(content, linkedInUser.id);
          showToast('Auto-posted to LinkedIn successfully!', 'success');
        } catch (postError) {
          console.error(postError);
          const errorMessage = postError instanceof Error ? postError.message : "Unknown error";
          if (errorMessage === "This content has already been posted to LinkedIn.") {
            showToast('This post is already live on LinkedIn!', 'info');
          } else {
            showToast(`Generated content, but auto-post failed: ${errorMessage}`, 'error');
          }
        }
      }

    } catch (err) {
      console.error(err);
      showToast('Failed to generate content. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!currentPost) return;

    setIsRefining(true);
    try {
      const refinedContent = await refinePost(currentPost.content, instruction);
      const updatedPost = {
        ...currentPost,
        content: refinedContent,
        timestamp: Date.now()
      };
      setCurrentPost(updatedPost);
      showToast('Post refined successfully', 'success');
    } catch {
      showToast('Failed to refine post.', 'error');
    } finally {
      setIsRefining(false);
    }
  };

  const handleSelectHistory = (post: GeneratedPost) => {
    setCurrentPost(post);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    setActiveTab('generator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveProfile = (profile: LinkedInProfile) => {
    setLinkedInUser(profile);
    saveProfile(profile);
    setHasToken(!!getAccessToken());
    showToast('Profile connected successfully!', 'success');
  };

  const handleUseTemplate = (template: { structure: string }) => {
    setInjectedTemplate({ structure: template.structure });
    setActiveTab('generator');
    showToast('Template applied! Fill in the details.', 'success');
  };

  const tabs = [
    { id: 'generator' as const, label: 'Generator', icon: TabIcons.generator },
    { id: 'templates' as const, label: 'Templates', icon: TabIcons.templates },
    { id: 'analytics' as const, label: 'Analytics', icon: TabIcons.analytics },
    { id: 'automation' as const, label: 'Automation', icon: TabIcons.automation },
    { id: 'feeds' as const, label: 'RSS Feeds', icon: TabIcons.feeds },
    { id: 'scheduled' as const, label: 'Scheduled', icon: TabIcons.scheduled },
  ];

  return (
    <div className="min-h-screen bg-canvas font-sans flex flex-col relative">
      {/* Dynamic Animated Background Blobs */}
      <div className="bg-canvas">
        <div className="blob-container">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>
      </div>

      {/* Premium Navbar */}
      <nav className="navbar sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center">
              <div className="logo-container">
                <div className="logo-icon">Li</div>
                <span className="logo-text">LinkedInto</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {linkedInUser ? (
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center space-x-2 bg-white hover:bg-gray-50 px-3 py-2 rounded-full border border-gray-200 transition-all hover:shadow-md"
                >
                  {linkedInUser.avatarUrl ? (
                    <img src={linkedInUser.avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full object-cover ring-2 ring-white" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-linkedin-blue to-blue-400 flex items-center justify-center text-xs font-bold text-white">
                      {linkedInUser.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">{linkedInUser.name}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="btn-premium text-sm"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Connect Profile
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none transition-colors lg:hidden"
                aria-label="Toggle menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Enhanced Tab Navigation - Scrollable on mobile */}
      <div className="z-10 bg-transparent py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="tab-nav flex overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-btn flex items-center gap-3 px-6 py-3 transition-all ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <span className="w-5 h-5">{tab.icon}</span>
                  <span className="font-semibold text-sm">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'generator' && (
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 animate-fade-in-up">
              {/* Left Column: Generator Form */}
              <div className="space-y-6">
                <GeneratorForm
                  onGenerate={handleGeneration}
                  isLoading={isGenerating}
                  hasToken={hasToken}
                  initialPrompt={injectedTemplate?.structure}
                />

                {/* Enhanced Pro Tip */}
                <div className="pro-tip">
                  <h4>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Pro Tip
                  </h4>
                  <p>LinkedIn posts perform best when they tell a personal story connected to a professional lesson. Try the "Story" format for maximum engagement!</p>
                </div>
              </div>

              {/* Right Column: Preview */}
              <div className="lg:sticky lg:top-24 h-fit">
                <LinkedInPreview
                  post={currentPost}
                  onRefine={handleRefine}
                  isRefining={isRefining}
                  linkedInProfile={linkedInUser}
                />
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="max-w-6xl mx-auto animate-fade-in-up">
              <AnalyticsDashboard />
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="max-w-6xl mx-auto animate-fade-in-up">
              <TemplatesManager onUseTemplate={handleUseTemplate} />
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="max-w-6xl mx-auto animate-fade-in-up">
              <AutomationDashboard />
            </div>
          )}
          
          {activeTab === 'feeds' && (
            <div className="max-w-6xl mx-auto animate-fade-in-up">
              <FeedManager />
            </div>
          )}
          
          {activeTab === 'scheduled' && (
            <div className="max-w-6xl mx-auto animate-fade-in-up">
              <ScheduledPostsList />
            </div>
          )}
        </main>

        {/* Enhanced Sidebar */}
        <div className={`fixed inset-y-0 right-0 z-30 w-80 bg-white/95 backdrop-blur-lg shadow-2xl transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-linkedin-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </h2>
            <button 
              type="button"
              onClick={() => setSidebarOpen(false)} 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="h-full pb-20 overflow-y-auto">
            <HistorySidebar history={history} onSelect={handleSelectHistory} selectedId={currentPost?.id} />
          </div>
        </div>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close sidebar"
          />
        )}

        {/* Enhanced Toggle Button for Desktop */}
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="fixed right-0 top-1/2 transform -translate-y-1/2 bg-white p-3 rounded-l-xl shadow-lg border border-r-0 border-gray-200 text-gray-500 hover:text-linkedin-blue hover:bg-blue-50 z-10 hidden lg:flex items-center gap-2 transition-all hover:pr-4 group"
            title="View History"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">History</span>
          </button>
        )}
      </div>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleSaveProfile}
        initialProfile={linkedInUser}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
