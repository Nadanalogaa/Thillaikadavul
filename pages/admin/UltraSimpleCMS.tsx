import React, { useState, useEffect } from 'react';
import { Save, Edit3, RefreshCw } from 'lucide-react';
import AdminNav from '../../components/admin/AdminNav';

interface SimpleSection {
  id: string;
  name: string;
  title: string;
  content: string;
  imageUrl: string;
}

const UltraSimpleCMS: React.FC = () => {
  const [sections, setSections] = useState<SimpleSection[]>([
    {
      id: 'hero',
      name: 'Hero Section',
      title: 'Dance, Draw and Fine Arts',
      content: 'Nurturing creativity through traditional and contemporary artistic expression at Nadanaloga Fine Arts Academy.',
      imageUrl: '/static/images/01_hero-img.webp'
    },
    {
      id: 'about',
      name: 'About Academy',
      title: 'About Our Academy', 
      content: 'We are a premier fine arts academy dedicated to offering comprehensive training in Bharatanatyam classical dance, Carnatic vocal music, drawing & painting, and Abacus mathematics.',
      imageUrl: '/static/images/02_hero-img.webp'
    },
    {
      id: 'programs',
      name: 'Programs Overview',
      title: 'Our Programs',
      content: 'Explore our diverse range of programs designed to cultivate artistic excellence: Classical Dance, Vocal Music, Visual Arts, and Mathematical Skills Development.',
      imageUrl: '/static/images/03_hero-img.webp'
    },
    {
      id: 'contact',
      name: 'Contact Information',
      title: 'Get In Touch',
      content: 'Connect with us to begin your artistic journey. We offer both online and offline classes with flexible scheduling to accommodate your needs.',
      imageUrl: '/static/images/1200x1000_marquee-01.webp'
    }
  ]);

  const [editingSection, setEditingSection] = useState<SimpleSection | null>(null);
  const [saving, setSaving] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cms-sections');
    if (saved) {
      try {
        setSections(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved sections');
      }
    }
  }, []);

  const handleSave = () => {
    if (!editingSection) return;
    
    setSaving(true);
    
    // Update sections array
    const updatedSections = sections.map(section => 
      section.id === editingSection.id ? editingSection : section
    );
    
    // Save to localStorage
    localStorage.setItem('cms-sections', JSON.stringify(updatedSections));
    
    // Update state
    setSections(updatedSections);
    
    // Update homepage immediately
    updateHomepage(updatedSections);
    
    setTimeout(() => {
      setSaving(false);
      setEditingSection(null);
      alert('✅ Section saved successfully! The homepage has been updated.');
    }, 1000);
  };

  const updateHomepage = (updatedSections: SimpleSection[]) => {
    // Inject updated content into the homepage
    const event = new CustomEvent('cms-content-updated', {
      detail: { sections: updatedSections }
    });
    window.dispatchEvent(event);
    
    // Also save to sessionStorage for immediate homepage access
    sessionStorage.setItem('homepage-content', JSON.stringify(updatedSections));
  };

  const handleImageUrlChange = (url: string) => {
    if (editingSection) {
      setEditingSection({ ...editingSection, imageUrl: url });
    }
  };

  const getAvailableImages = () => [
    '/static/images/01_hero-img.webp',
    '/static/images/02_hero-img.webp', 
    '/static/images/03_hero-img.webp',
    '/static/images/1200x1000_marquee-01.webp',
    '/static/images/1200x1000_marquee-02.webp',
    '/static/images/1200x1000_marquee-03.webp',
    '/static/images/1200x1000_marquee-04.webp',
    '/static/images/1200x1000_marquee-05.webp',
    '/static/images/1200x1000_marquee-06.webp',
    '/static/images/1200x1000_marquee-07.webp',
    '/static/images/1200x1000_marquee-08.webp'
  ];

  const refreshHomepage = () => {
    // Force homepage refresh
    if (window.location.pathname === '/') {
      window.location.reload();
    } else {
      // Open homepage in new tab to see changes
      window.open('/', '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <AdminNav />
      <div>
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ultra Simple CMS</h1>
              <p className="text-gray-600 mt-1">Edit your homepage content instantly - no server required!</p>
            </div>
            <button
              onClick={refreshHomepage}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <RefreshCw className="w-4 h-4" />
              View Homepage
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-green-800 font-semibold mb-2">✅ Server-Free CMS</h3>
            <p className="text-green-700 text-sm">
              This CMS works completely in your browser - no server needed! 
              Changes are saved locally and update the homepage immediately.
            </p>
          </div>

          <div className="grid gap-6">
            {sections.map((section) => (
              <div key={section.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{section.name}</h3>
                    <p className="text-sm text-gray-500">ID: {section.id}</p>
                  </div>
                  <button
                    onClick={() => setEditingSection({...section})}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Current Content</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Title:</label>
                        <p className="text-gray-900">{section.title}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Content:</label>
                        <p className="text-gray-700 text-sm leading-relaxed">{section.content}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Current Image</h4>
                    <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden">
                      {section.imageUrl && (
                        <img 
                          src={section.imageUrl} 
                          alt={section.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOUM5Qzk3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZTwvdGV4dD4KPC9zdmc+';
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                Edit {editingSection.name}
              </h2>
              <button 
                onClick={() => setEditingSection(null)} 
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Section Title
                    </label>
                    <input
                      type="text"
                      value={editingSection.title}
                      onChange={(e) => setEditingSection({...editingSection, title: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter section title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content
                    </label>
                    <textarea
                      value={editingSection.content}
                      onChange={(e) => setEditingSection({...editingSection, content: e.target.value})}
                      rows={6}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter section content"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image URL (or select from available images below)
                    </label>
                    <input
                      type="url"
                      value={editingSection.imageUrl}
                      onChange={(e) => handleImageUrlChange(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter image URL"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image Preview
                  </label>
                  <div className="w-40 h-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 mb-4 overflow-hidden">
                    {editingSection.imageUrl && (
                      <img 
                        src={editingSection.imageUrl} 
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOUM5Qzk3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZTwvdGV4dD4KPC9zdmc+';
                        }}
                      />
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Images (Click to select)
                    </label>
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {getAvailableImages().map((imageUrl, index) => (
                        <div
                          key={index}
                          onClick={() => handleImageUrlChange(imageUrl)}
                          className={`cursor-pointer border-2 rounded-lg overflow-hidden hover:border-blue-500 ${
                            editingSection.imageUrl === imageUrl ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                          }`}
                        >
                          <img 
                            src={imageUrl} 
                            alt={`Image ${index + 1}`}
                            className="w-full h-16 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOUM5Qzk3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZTwvdGV4dD4KPC9zdmc+';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t">
                <button
                  onClick={() => setEditingSection(null)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UltraSimpleCMS;