import React, { useState, useEffect } from 'react';
import { Save, X, Wand2, Eye } from 'lucide-react';

interface Section {
  id: string;
  section_type?: string;
  name?: string;
  description?: string;
  content?: any;
  seo?: {
    title?: string;
    description?: string;
  };
  is_active?: boolean;
}

interface SimpleSectionEditorProps {
  section: Section;
  onSectionUpdate?: (section: Section) => void;
  onSave?: () => void;
  onPublish?: () => void;
  isDirty?: boolean;
}

const SimpleSectionEditor: React.FC<SimpleSectionEditorProps> = ({
  section,
  onSectionUpdate,
  onSave,
  onPublish,
  isDirty = false
}) => {
  const [editingSection, setEditingSection] = useState<Section>(section);
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'settings'>('content');

  useEffect(() => {
    setEditingSection(section);
  }, [section]);

  const handleSave = () => {
    onSave?.();
  };

  const updateSection = (field: string, value: any) => {
    const updatedSection = { ...editingSection, [field]: value };
    setEditingSection(updatedSection);
    onSectionUpdate?.(updatedSection);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Edit Section</h2>
          <p className="text-gray-600 capitalize">
            {editingSection.section_type?.replace('_', ' ') || 'Section'}
            {isDirty && <span className="ml-2 text-orange-600 text-sm">• Unsaved changes</span>}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-6 px-6">
          {['content', 'seo', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-3 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'content' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section Name
              </label>
              <input
                type="text"
                value={editingSection.name || ''}
                onChange={(e) => updateSection('name', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter section name..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={editingSection.description || ''}
                onChange={(e) => updateSection('description', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Enter section description..."
              />
            </div>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SEO Title
              </label>
              <input
                type="text"
                value={editingSection.seo?.title || ''}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Enter SEO title..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SEO Description
              </label>
              <textarea
                value={editingSection.seo?.description || ''}
                className="w-full p-3 border border-gray-300 rounded-lg"
                rows={4}
                placeholder="Enter SEO description..."
              />
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-gray-300 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Active</h3>
                <p className="text-sm text-gray-600">Show this section on the homepage</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingSection.is_active || false}
                  onChange={(e) => updateSection('is_active', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleSectionEditor;