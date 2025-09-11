import React, { useState, useEffect } from 'react';
import AdminNav from '../../components/admin/AdminNav';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import RayoLanding from '../../static_react/src/RayoLanding.jsx';
import AddSectionModal from '../../components/cms/AddSectionModal';
import { 
  Edit3, Save, Eye, EyeOff, Plus, Settings, Image, Video, Type, Layout, 
  Palette, Zap, Monitor, Tablet, Smartphone, Globe, Code, Layers 
} from 'lucide-react';

interface HomepageSection {
  id: string;
  section_type: string;
  name: string;
  description: string;
  order_index: number;
  is_active: boolean;
  content?: {
    title?: string;
    subtitle?: string;
    description?: string;
    body_content?: string;
    media?: any[];
  };
}

type ViewMode = 'desktop' | 'tablet' | 'mobile';
type EditMode = 'preview' | 'edit';

const HomepagePreviewCMS: React.FC = () => {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState<EditMode>('preview');
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load sections on component mount
  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      const response = await fetch('/api/cms/sections', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSections(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = async (type: string, title: string) => {
    try {
      const sectionData = {
        section_type: type,
        name: title,
        description: `Auto-generated ${type.replace('_', ' ')} section`,
        order_index: sections.length + 1,
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

      const response = await fetch('/api/cms/sections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(sectionData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          loadSections(); // Reload sections
          setShowAddModal(false);
        }
      }
    } catch (error) {
      console.error('Error creating section:', error);
    }
  };

  const toggleEditMode = () => {
    setEditMode(prev => prev === 'preview' ? 'edit' : 'preview');
    setSelectedSection(null);
  };

  const getViewportStyles = (): React.CSSProperties => {
    switch (viewMode) {
      case 'mobile':
        return {
          width: '375px',
          margin: '0 auto',
          minHeight: '100vh'
        };
      case 'tablet':
        return {
          width: '768px',
          margin: '0 auto',
          minHeight: '100vh'
        };
      default:
        return {
          width: '100%',
          minHeight: '100vh'
        };
    }
  };

  const ViewportButton = ({ mode, icon: Icon, label }: { mode: ViewMode, icon: any, label: string }) => (
    <button
      onClick={() => setViewMode(mode)}
      className={`p-2 rounded-md transition-colors ${
        viewMode === mode
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
      }`}
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        <div className="ml-64">
          <AdminPageHeader 
            title="Homepage Preview CMS"
            subtitle="Loading homepage editor..."
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
    <div className="min-h-screen bg-gray-100">
      <AdminNav />
      <div className={`${sidebarOpen ? 'mr-80' : ''} transition-all duration-300`} style={{ marginLeft: '256px' }}>
        
        {/* Top Toolbar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-gray-900">Homepage Editor</h1>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    editMode === 'edit' 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {editMode === 'edit' ? 'Edit Mode' : 'Preview Mode'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Viewport Controls */}
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <ViewportButton mode="desktop" icon={Monitor} label="Desktop" />
                  <ViewportButton mode="tablet" icon={Tablet} label="Tablet" />
                  <ViewportButton mode="mobile" icon={Smartphone} label="Mobile" />
                </div>

                {/* Mode Toggle */}
                <button
                  onClick={toggleEditMode}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    editMode === 'edit'
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {editMode === 'edit' ? (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" />
                      <span>Edit</span>
                    </>
                  )}
                </button>

                {/* Add Section */}
                {editMode === 'edit' && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Section</span>
                  </button>
                )}

                {/* Sidebar Toggle */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative">
          {/* Editing Overlay */}
          {editMode === 'edit' && (
            <div className="absolute inset-0 z-10 bg-blue-50 bg-opacity-20 pointer-events-none">
              <div className="sticky top-20 z-20 p-4">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg inline-flex items-center space-x-2">
                  <Edit3 className="w-4 h-4" />
                  <span className="text-sm font-medium">Click on sections to edit them</span>
                </div>
              </div>
            </div>
          )}

          {/* Homepage Content */}
          <div style={getViewportStyles()}>
            <div className="bg-white shadow-lg">
              <RayoLanding 
                htmlPath="/static/index.html" 
                onLoginClick={() => {}} 
                user={null} 
                onLogout={() => {}} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      {sidebarOpen && (
        <div className="fixed right-0 top-0 w-80 h-full bg-white border-l border-gray-200 shadow-xl z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {editMode === 'edit' ? 'Content Editor' : 'Homepage Sections'}
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>

            {/* Viewport Info */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm">
                <Globe className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Viewing as:</span>
                <span className="font-medium text-gray-900 capitalize">{viewMode}</span>
              </div>
              {viewMode !== 'desktop' && (
                <div className="text-xs text-gray-500 mt-1">
                  {viewMode === 'mobile' ? '375px wide' : '768px wide'}
                </div>
              )}
            </div>

            {/* Sections List */}
            <div className="space-y-3">
              {sections.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Layers className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm">No sections found</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Add your first section
                  </button>
                </div>
              ) : (
                sections.map((section) => (
                  <div
                    key={section.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedSection === section.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      if (editMode === 'edit') {
                        setSelectedSection(selectedSection === section.id ? null : section.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {section.name}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${
                          section.is_active ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        {editMode === 'edit' && (
                          <Edit3 className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 capitalize">
                      {section.section_type.replace('_', ' ')}
                    </p>
                    {section.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {section.description}
                      </p>
                    )}
                  </div>
                ))
              )}

              {/* Quick Actions */}
              {editMode === 'edit' && (
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="flex flex-col items-center p-3 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Image className="w-5 h-5 mb-1" />
                      <span>Media</span>
                    </button>
                    <button className="flex flex-col items-center p-3 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Layout className="w-5 h-5 mb-1" />
                      <span>Layout</span>
                    </button>
                    <button className="flex flex-col items-center p-3 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Palette className="w-5 h-5 mb-1" />
                      <span>Style</span>
                    </button>
                    <button className="flex flex-col items-center p-3 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Zap className="w-5 h-5 mb-1" />
                      <span>AI</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {showAddModal && (
        <AddSectionModal
          onClose={() => setShowAddModal(false)}
          onAddSection={handleAddSection}
        />
      )}
    </div>
  );
};

export default HomepagePreviewCMS;