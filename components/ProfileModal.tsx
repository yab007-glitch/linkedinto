import React, { useState, useEffect } from 'react';
import { LinkedInProfile } from '../types';
import { Button } from './ui/Button';
import { fetchLinkedInProfile, saveAccessToken } from '../services/linkedinService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: LinkedInProfile) => void;
  initialProfile: LinkedInProfile | null;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSave, initialProfile }) => {
  const [mode, setMode] = useState<'manual' | 'token'>('manual');
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userId, setUserId] = useState('');
  
  const [accessToken, setAccessToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialProfile?.name || '');
      setHeadline(initialProfile?.headline || '');
      setAvatarUrl(initialProfile?.avatarUrl || '');
      setUserId(initialProfile?.id || '');
      setMode('manual');
      setError(null);
      setAccessToken('');
    }
  }, [isOpen, initialProfile]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: userId || 'manual-entry',
      name: name || 'LinkedIn Member',
      headline: headline || 'Professional',
      avatarUrl: avatarUrl
    });
    onClose();
  };

  const handleFetchProfile = async () => {
    if (!accessToken.trim()) {
      setError("Please enter an access token");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const profile = await fetchLinkedInProfile(accessToken);
      
      // Save token for future API calls (posting)
      saveAccessToken(accessToken.trim());

      setName(profile.name);
      setAvatarUrl(profile.avatarUrl);
      setUserId(profile.id);

      // Keep existing headline if set, or default
      if (profile.headline && profile.headline !== "LinkedIn Professional") {
          setHeadline(profile.headline);
      } else if (!headline) {
          setHeadline("LinkedIn Professional");
      }
      
      setMode('manual'); // Switch back to manual so they can review/edit
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('URI malformed'))) {
         setError("Network Error: Could not connect via proxy. Please enter details manually.");
      } else {
         setError(err.message || "Failed to fetch profile. Check your token permissions.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10 text-linkedin-blue">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                  </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  {mode === 'manual' ? 'Setup Your Profile' : 'Import from LinkedIn'}
                </h3>
                
                {/* Mode Toggle */}
                <div className="mt-4 flex space-x-4 border-b border-gray-100 pb-2">
                   <button 
                     onClick={() => setMode('manual')}
                     className={`text-sm font-medium pb-2 border-b-2 transition-colors ${mode === 'manual' ? 'border-linkedin-blue text-linkedin-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                   >
                     Manual Entry
                   </button>
                   <button 
                     onClick={() => setMode('token')}
                     className={`text-sm font-medium pb-2 border-b-2 transition-colors ${mode === 'token' ? 'border-linkedin-blue text-linkedin-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                   >
                     Use Access Token
                   </button>
                </div>

                <div className="mt-4">
                  {mode === 'token' ? (
                     <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-800 border border-blue-100">
                          <p className="font-semibold mb-1">How to get a token:</p>
                          <p>
                            This is for advanced users. Use the <a href="https://www.linkedin.com/developers/tools/oauth/token-generator" target="_blank" rel="noopener noreferrer" className="underline">LinkedIn Token Generator</a>.
                            <br/>
                            <span className="font-bold">Permissions Required:</span> <code>openid</code> (for profile), <code>w_member_social</code> (for posting).
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Access Token</label>
                          <input 
                            type="password" 
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-linkedin-blue focus:border-linkedin-blue sm:text-sm"
                            value={accessToken}
                            onChange={(e) => setAccessToken(e.target.value)}
                            placeholder="Enter your OAuth 2.0 Access Token"
                          />
                        </div>
                        {error && (
                          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                            {error}
                          </div>
                        )}
                        <Button 
                          onClick={handleFetchProfile} 
                          isLoading={isLoading}
                          className="w-full"
                        >
                          Fetch Profile Data
                        </Button>
                     </div>
                  ) : (
                    <form id="profile-form" onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input 
                          type="text" 
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-linkedin-blue focus:border-linkedin-blue sm:text-sm"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Jane Doe"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Headline</label>
                        <input 
                          type="text" 
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-linkedin-blue focus:border-linkedin-blue sm:text-sm"
                          value={headline}
                          onChange={(e) => setHeadline(e.target.value)}
                          placeholder="e.g. Senior Product Manager @ TechCorp"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Avatar URL (Optional)</label>
                        <input 
                          type="url" 
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-linkedin-blue focus:border-linkedin-blue sm:text-sm"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {mode === 'manual' && (
               <Button form="profile-form" type="submit" className="w-full sm:w-auto sm:ml-3">
                  Save Profile
               </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose} className="mt-3 w-full sm:mt-0 sm:w-auto">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
