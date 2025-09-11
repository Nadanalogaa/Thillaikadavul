import React, { useState, useEffect, useCallback } from 'react';
import AdminNav from '../../components/admin/AdminNav';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import SimpleCMSDashboard from '../../components/cms/SimpleCMSDashboard';
import SimpleSectionEditor from '../../components/cms/SimpleSectionEditor';
import MediaLibrary from '../../components/cms/MediaLibrary';
import AIAssistant from '../../components/cms/AIAssistant';
import PreviewModal from '../../components/cms/PreviewModal';
import AddSectionModal from '../../components/cms/AddSectionModal';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent 
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
// Using native browser notifications for now

interface HomepageSection {
  id: string;
  section_key: string;
  section_type: string;
  name: string;
  description: string;
  order_index: number;
  is_active: boolean;
  layout_config: any;
  responsive_settings: any;
  animation_config: any;
  custom_css: string;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  content?: {
    id: string;
    version: number;
    title?: string;
    subtitle?: string;
    description?: string;
    body_content?: string;
    rich_content?: any;
    metadata?: any;
    tags?: string[];
    status: string;
    ai_generated_content?: any;
    ai_seo_score?: number;
    media?: any[];
    ctas?: any[];
    specialized?: any;
    updated_at: string;
  };
}

interface CMSPageState {
  sections: HomepageSection[];
  loading: boolean;
  selectedSection: HomepageSection | null;
  view: 'dashboard' | 'editor' | 'media' | 'preview';
  searchQuery: string;
  filterType: string;
  showAIAssistant: boolean;
  showAddSectionModal: boolean;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  isDirty: boolean;
}

const HomepageCMSPage: React.FC = () => {
  const [state, setState] = useState<CMSPageState>({
    sections: [],
    loading: true,
    selectedSection: null,
    view: 'dashboard',
    searchQuery: '',
    filterType: 'all',
    showAIAssistant: false,
    showAddSectionModal: false,
    previewMode: 'desktop',
    isDirty: false
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load sections on mount
  useEffect(() => {
    loadSections();
  }, []);

  // Auto-save when content changes
  useEffect(() => {
    if (state.isDirty && state.selectedSection) {
      const autoSaveTimer = setTimeout(() => {
        autoSave();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(autoSaveTimer);
    }
  }, [state.isDirty, state.selectedSection]);

  const loadSections = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const response = await fetch('/api/cms/sections', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setState(prev => ({
          ...prev,
          sections: data.data,
          loading: false
        }));
      } else {
        throw new Error(data.error || 'Failed to load sections');
      }
    } catch (error) {
      console.error('Error loading sections:', error);
      console.error('Failed to load sections:', error);
      alert(`Failed to load sections: ${error.message}`);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const autoSave = useCallback(async () => {
    if (!state.selectedSection?.content?.id) return;
    
    try {
      const response = await fetch(`/api/cms/content/${state.selectedSection.content.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...state.selectedSection.content,
          generate_ai_content: false // Don't generate AI on auto-save
        })
      });
      
      if (response.ok) {
        setState(prev => ({ ...prev, isDirty: false }));
        console.log('Auto-saved successfully');
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  }, [state.selectedSection]);

  const handleSectionReorder = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = state.sections.findIndex(s => s.id === active.id);
    const newIndex = state.sections.findIndex(s => s.id === over.id);
    
    const reorderedSections = arrayMove(state.sections, oldIndex, newIndex);
    
    // Update order_index for all sections
    const sectionOrders = reorderedSections.map((section, index) => ({
      id: section.id,
      order_index: index + 1
    }));
    
    // Optimistically update UI
    setState(prev => ({
      ...prev,
      sections: reorderedSections.map((section, index) => ({
        ...section,
        order_index: index + 1
      }))
    }));
    
    try {
      const response = await fetch('/api/cms/sections/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ section_orders: sectionOrders })
      });
      
      if (!response.ok) {
        throw new Error('Failed to reorder sections');
      }
      
      console.log('Sections reordered successfully');
    } catch (error) {
      console.error('Reorder error:', error);
      console.error('Failed to reorder sections');
      alert('Failed to reorder sections');
      // Revert on error
      loadSections();
    }
  }, [state.sections, loadSections]);

  const handleSectionSelect = useCallback((section: HomepageSection) => {
    if (state.isDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    
    setState(prev => ({
      ...prev,
      selectedSection: section,
      view: 'editor',
      isDirty: false
    }));
  }, [state.isDirty]);

  const handleSectionUpdate = useCallback((updatedSection: HomepageSection) => {
    setState(prev => ({
      ...prev,
      selectedSection: updatedSection,
      isDirty: true,
      sections: prev.sections.map(section =>
        section.id === updatedSection.id ? updatedSection : section
      )
    }));
  }, []);

  const handleSectionSave = useCallback(async () => {
    if (!state.selectedSection?.content?.id) {
      alert('No content to save');
      return;
    }
    
    try {
      const response = await fetch(`/api/cms/content/${state.selectedSection.content.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...state.selectedSection.content,
          generate_ai_content: false
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save content');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setState(prev => ({
          ...prev,
          isDirty: false
        }));
        console.log('Content saved successfully');
        
        // Refresh sections to get latest data
        loadSections();
      } else {
        throw new Error(data.error || 'Save failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      console.error('Save error:', error);
      alert(`Failed to save: ${error.message}`);
    }
  }, [state.selectedSection, loadSections]);

  const handleSectionPublish = useCallback(async () => {
    if (!state.selectedSection?.content?.id) {
      alert('No content to publish');
      return;
    }
    
    try {
      const response = await fetch(`/api/cms/content/${state.selectedSection.content.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to publish content');
      }
      
      console.log('Content published successfully');
      loadSections();
    } catch (error) {
      console.error('Publish error:', error);
      console.error('Publish error:', error);
      alert(`Failed to publish: ${error.message}`);
    }
  }, [state.selectedSection, loadSections]);

  const handleCreateSection = useCallback(async (sectionData: Partial<HomepageSection>) => {
    try {
      const response = await fetch('/api/cms/sections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(sectionData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create section');
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Section created successfully');
        loadSections();
      } else {
        throw new Error(data.error || 'Create failed');
      }
    } catch (error) {
      console.error('Create error:', error);
      console.error('Create error:', error);
      alert(`Failed to create section: ${error.message}`);
    }
  }, [loadSections]);

  const handleDeleteSection = useCallback(async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/cms/sections/${sectionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete section');
      }
      
      console.log('Section deleted successfully');
      
      // If we're editing the deleted section, go back to dashboard
      if (state.selectedSection?.id === sectionId) {
        setState(prev => ({
          ...prev,
          selectedSection: null,
          view: 'dashboard'
        }));
      }
      
      loadSections();
    } catch (error) {
      console.error('Delete error:', error);
      console.error('Delete error:', error);
      alert(`Failed to delete section: ${error.message}`);
    }
  }, [state.selectedSection, loadSections]);

  const handleViewChange = useCallback((view: CMSPageState['view']) => {
    if (state.isDirty && view !== 'editor') {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    
    setState(prev => ({
      ...prev,
      view,
      isDirty: false
    }));
  }, [state.isDirty]);

  const handleAIAssistant = useCallback((show: boolean) => {
    setState(prev => ({
      ...prev,
      showAIAssistant: show
    }));
  }, []);

  const handleAddSectionModal = useCallback((show: boolean) => {
    setState(prev => ({
      ...prev,
      showAddSectionModal: show
    }));
  }, []);

  const handleAddSection = useCallback(async (type: string, title: string) => {
    const sectionData = {
      section_type: type,
      name: title,
      description: `Auto-generated ${type.replace('_', ' ')} section`,
      order_index: state.sections.length + 1,
      is_active: true,
      layout_config: {},
      responsive_settings: {},
      animation_config: {},
      custom_css: '',
      seo: {
        title: title,
        description: `${title} section content`
      }
    };

    await handleCreateSection(sectionData);
    handleAddSectionModal(false);
  }, [state.sections.length, handleCreateSection]);

  const filteredSections = state.sections.filter(section => {
    const matchesSearch = !state.searchQuery || 
      section.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      section.section_type.toLowerCase().includes(state.searchQuery.toLowerCase());
    
    const matchesFilter = state.filterType === 'all' || 
      section.section_type === state.filterType ||
      (state.filterType === 'published' && section.content?.status === 'published') ||
      (state.filterType === 'draft' && section.content?.status === 'draft');
    
    return matchesSearch && matchesFilter;
  });

  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        <div className="ml-64">
          <AdminPageHeader 
            title="Homepage CMS"
            subtitle="Loading content management system..."
          />
          <div className="p-8">
            <div className="flex items-center justify-center min-h-96">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-primary"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="ml-64">
        <AdminPageHeader 
          title="Homepage CMS"
          subtitle="Manage all homepage content with AI-powered assistance"
          action={
            <div className="flex items-center space-x-4">
              {/* View Switcher */}
              <div className="flex items-center bg-white rounded-lg shadow-sm border">
                <button
                  onClick={() => handleViewChange('dashboard')}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                    state.view === 'dashboard' 
                      ? 'bg-brand-primary text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => handleViewChange('editor')}
                  disabled={!state.selectedSection}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    state.view === 'editor' 
                      ? 'bg-brand-primary text-white' 
                      : 'text-gray-600 hover:text-gray-900 disabled:text-gray-400'
                  }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => handleViewChange('media')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    state.view === 'media' 
                      ? 'bg-brand-primary text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Media
                </button>
                <button
                  onClick={() => handleViewChange('preview')}
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                    state.view === 'preview' 
                      ? 'bg-brand-primary text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Preview
                </button>
              </div>

              {/* AI Assistant Toggle */}
              <button
                onClick={() => handleAIAssistant(!state.showAIAssistant)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  state.showAIAssistant
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>AI Assistant</span>
              </button>

              {/* Save Actions (only show in editor) */}
              {state.view === 'editor' && state.selectedSection && (
                <div className="flex items-center space-x-2">
                  {state.isDirty && (
                    <span className="text-xs text-orange-600 font-medium">Unsaved changes</span>
                  )}
                  
                  <button
                    onClick={handleSectionSave}
                    disabled={!state.isDirty}
                    className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Save
                  </button>
                  
                  {state.selectedSection.content?.status !== 'published' && (
                    <button
                      onClick={handleSectionPublish}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      Publish
                    </button>
                  )}
                </div>
              )}
            </div>
          }
        />

        <div className="p-8">
          <div className="flex space-x-6">
            {/* Main Content Area */}
            <div className={`flex-1 ${state.showAIAssistant ? 'mr-80' : ''} transition-all duration-300`}>
              {state.view === 'dashboard' && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleSectionReorder}
                >
                  <SortableContext items={state.sections} strategy={verticalListSortingStrategy}>
                    <SimpleCMSDashboard
                      sections={filteredSections}
                      onSectionSelect={handleSectionSelect}
                      onSectionCreate={() => handleAddSectionModal(true)}
                      onSectionDelete={handleDeleteSection}
                      searchQuery={state.searchQuery}
                      onSearchChange={(query) => setState(prev => ({ ...prev, searchQuery: query }))}
                      filterType={state.filterType}
                      onFilterChange={(filter) => setState(prev => ({ ...prev, filterType: filter }))}
                      loading={state.loading}
                    />
                  </SortableContext>
                </DndContext>
              )}

              {state.view === 'editor' && state.selectedSection && (
                <SimpleSectionEditor
                  section={state.selectedSection}
                  onSectionUpdate={handleSectionUpdate}
                  onSave={handleSectionSave}
                  onPublish={handleSectionPublish}
                  isDirty={state.isDirty}
                />
              )}

              {state.view === 'media' && (
                <MediaLibrary />
              )}

              {state.view === 'preview' && (
                <PreviewModal
                  sections={state.sections.filter(s => s.is_active)}
                  mode={state.previewMode}
                  onModeChange={(mode) => setState(prev => ({ ...prev, previewMode: mode }))}
                />
              )}
            </div>

            {/* AI Assistant Panel */}
            {state.showAIAssistant && (
              <div className="fixed right-0 top-0 w-80 h-full bg-white border-l border-gray-200 shadow-xl z-40">
                <AIAssistant
                  selectedSection={state.selectedSection}
                  onContentGenerated={(content) => {
                    if (state.selectedSection) {
                      handleSectionUpdate({
                        ...state.selectedSection,
                        content: {
                          ...state.selectedSection.content,
                          ...content
                        }
                      });
                    }
                  }}
                  onClose={() => handleAIAssistant(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Section Modal */}
      {state.showAddSectionModal && (
        <AddSectionModal
          onClose={() => handleAddSectionModal(false)}
          onAddSection={handleAddSection}
        />
      )}

      {/* Keyboard shortcuts help */}
      <div className="fixed bottom-4 left-4 text-xs text-gray-500 bg-white px-3 py-2 rounded-lg shadow-sm border">
        <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl+S</kbd> Save • 
        <kbd className="px-1 py-0.5 bg-gray-100 rounded ml-1">Ctrl+P</kbd> Publish • 
        <kbd className="px-1 py-0.5 bg-gray-100 rounded ml-1">Ctrl+K</kbd> AI Assistant
      </div>

      {/* Global keyboard shortcuts */}
      <div
        onKeyDown={(e) => {
          if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
              case 's':
                e.preventDefault();
                if (state.view === 'editor') handleSectionSave();
                break;
              case 'p':
                e.preventDefault();
                if (state.view === 'editor') handleSectionPublish();
                break;
              case 'k':
                e.preventDefault();
                handleAIAssistant(!state.showAIAssistant);
                break;
            }
          }
        }}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
};

export default HomepageCMSPage;