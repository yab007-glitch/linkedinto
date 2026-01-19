import React, { useEffect, useState } from 'react';
import { useToast } from './ui/ToastContext';

interface Template {
  id: string;
  name: string;
  category: string;
  structure: string;
  isCustom?: boolean;
}

interface TemplatesManagerProps {
  onUseTemplate: (template: Template) => void;
}

export const TemplatesManager: React.FC<TemplatesManagerProps> = ({ onUseTemplate }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isCreating, setIsCreating] = useState(false);
  const { showToast } = useToast();

  // New Template Form State
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('Personal Stories');
  const [newTemplateStructure, setNewTemplateStructure] = useState('');

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/templates?includeCustom=true');
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch {
      showToast('Failed to load templates', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const categories = ['All', ...Array.from(new Set(templates.map(t => t.category)))];

  const filteredTemplates = activeCategory === 'All' 
    ? templates 
    : templates.filter(t => t.category === activeCategory);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const res = await fetch('/api/templates/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newTemplateName,
                category: newTemplateCategory,
                structure: newTemplateStructure
            })
        });

        if (res.ok) {
            showToast('Template created successfully!', 'success');
            setIsCreating(false);
            setNewTemplateName('');
            setNewTemplateStructure('');
            fetchTemplates();
        } else {
            showToast('Failed to create template', 'error');
        }
    } catch {
        showToast('Error creating template', 'error');
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
        const res = await fetch(`/api/templates/custom/${id}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            showToast('Template deleted', 'info');
            fetchTemplates();
        } else {
            showToast('Failed to delete template', 'error');
        }
    } catch {
        showToast('Error deleting template', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Template Library</h2>
                <p className="text-gray-500">Jumpstart your content with proven frameworks</p>
            </div>
            <button 
                onClick={() => setIsCreating(true)}
                className="btn-primary"
            >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Template
            </button>
        </div>

        {/* Modal for Creating Template */}
        {isCreating && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-scale-in">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="text-lg font-bold text-gray-900">New Custom Template</h3>
                        <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <form onSubmit={handleCreateTemplate} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                            <input 
                                required
                                type="text" 
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                className="w-full rounded-lg border-gray-300 focus:border-linkedin-blue focus:ring-linkedin-blue"
                                placeholder="e.g., Viral Story Framework"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <input 
                                required
                                type="text"
                                value={newTemplateCategory}
                                onChange={(e) => setNewTemplateCategory(e.target.value)}
                                className="w-full rounded-lg border-gray-300 focus:border-linkedin-blue focus:ring-linkedin-blue"
                                placeholder="e.g., Personal Stories" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Structure / Prompt</label>
                            <textarea 
                                required
                                value={newTemplateStructure}
                                onChange={(e) => setNewTemplateStructure(e.target.value)}
                                rows={6}
                                className="w-full rounded-lg border-gray-300 focus:border-linkedin-blue focus:ring-linkedin-blue"
                                placeholder="Describe the structure of this post..."
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg mr-2">Cancel</button>
                            <button type="submit" className="btn-primary">Save Template</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Categories */}
        <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
            {categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                        activeCategory === cat 
                        ? 'bg-linkedin-blue text-white shadow-md' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>

        {/* Grid */}
        {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3].map(i => (
                    <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse"></div>
                ))}
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                    <div 
                        key={template.id} 
                        className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-xl hover:border-linkedin-blue/30 transition-all duration-300 flex flex-col cursor-pointer relative"
                        onClick={() => onUseTemplate(template)}
                    >
                        {template.isCustom && (
                             <button 
                                onClick={(e) => handleDeleteTemplate(template.id, e)}
                                className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete Template"
                             >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                             </button>
                        )}
                        <div className="mb-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold ${template.isCustom ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                                {template.category}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-linkedin-blue transition-colors">
                            {template.name}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-3 mb-6 flex-1">
                            {template.structure}
                        </p>
                        <div className="flex items-center text-linkedin-blue font-medium text-sm group-hover:translate-x-1 transition-transform">
                            Use this template
                            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
