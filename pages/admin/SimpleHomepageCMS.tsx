import React, { useState, useEffect } from 'react';
import AdminNav from '../../components/admin/AdminNav';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import RayoLanding from '../../static_react/src/RayoLanding.jsx';
import { Edit3, Save, X, Upload, Video, Image as ImageIcon } from 'lucide-react';

interface EditableContent {
  [key: string]: {
    text?: string;
    image?: string;
    video?: string;
    youtube?: string;
  };
}

const SimpleHomepageCMS: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState<EditableContent>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [tempContent, setTempContent] = useState<any>({});

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setSelectedElement(null);
    setShowEditModal(false);
  };

  // Reflect edit mode on <body> for CSS-controlled overlays
  useEffect(() => {
    const cls = 'cms-editing';
    document.body.classList.toggle(cls, isEditing);
    // Ask the injector to (re)attach edit overlays when mode toggles
    try { window.dispatchEvent(new Event('cmsEditToggle')); } catch {}
    return () => {
      document.body.classList.remove(cls);
    };
  }, [isEditing]);

  const handleElementClick = (elementId: string) => {
    if (isEditing) {
      setSelectedElement(elementId);
      setTempContent(editableContent[elementId] || getDefaultContent(elementId));
      setShowEditModal(true);
    }
  };

  const getDefaultContent = (elementId: string) => {
    // Handle dynamic section IDs or static ones
    let sectionType = elementId;
    if (elementId.startsWith('section-')) {
      // For dynamic sections, try to determine type from content
      sectionType = 'generic-section';
    }
    
    const defaults = {
      'hero-section': {
        text: 'Dance, Music and Fine Arts\nDiscover the rich heritage of Indian classical arts through expert guidance.',
        image: '/images/Barathanatyam.png'
      },
      'about-section': {
        text: 'About Nadanaloga Academy\nLearn about our history and mission.',
        image: '/images/about-us.jpg'
      },
      'services-section': {
        text: 'Our Services\nBharatanatyam, Vocal Music, Drawing, Abacus',
        image: '/images/services.jpg'
      },
      'gallery-section': {
        text: 'Gallery\nView our student performances and artworks.',
        image: '/images/gallery.jpg'
      },
      'testimonials-section': {
        text: 'What Our Students Say\nRead testimonials from our amazing students.',
        image: '/images/testimonials.jpg'
      },
      'contact-section': {
        text: 'Contact Us\nGet in touch to start your artistic journey.',
        image: '/images/contact.jpg'
      },
      'generic-section': {
        text: 'Section Content\nEdit this section\'s text, images, and videos.',
        image: '/images/default-section.jpg'
      }
    };
    return defaults[sectionType] || defaults['generic-section'];
  };

  const getSectionTitle = (elementId: string) => {
    const titles = {
      'hero-section': 'Hero Section',
      'about-section': 'About Section',
      'services-section': 'Services Section',
      'gallery-section': 'Gallery Section',
      'testimonials-section': 'Testimonials Section',
      'contact-section': 'Contact Section'
    };
    
    // Handle dynamic sections
    if (elementId.startsWith('section-')) {
      const sectionNumber = elementId.replace('section-', '');
      return `Section ${parseInt(sectionNumber) + 1}`;
    }
    
    return titles[elementId] || 'Edit Content';
  };

  const handleSave = () => {
    if (selectedElement) {
      setEditableContent(prev => ({
        ...prev,
        [selectedElement]: tempContent
      }));
    }
    setShowEditModal(false);
    setSelectedElement(null);
  };

  const handleCancel = () => {
    setShowEditModal(false);
    setSelectedElement(null);
    setTempContent({});
  };

  const handlePublish = () => {
    // Here you would save to your backend/database
    console.log('Publishing changes...', editableContent);
    alert('Changes published successfully!');
    setIsEditing(false);
  };

  const handleFileUpload = (file: File, type: 'image' | 'video') => {
    // Create a preview URL
    const url = URL.createObjectURL(file);
    setTempContent(prev => ({
      ...prev,
      [type]: url,
      fileName: file.name
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="ml-64">
        {/* Simple Header - NO EDIT BUTTONS */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Homepage Editor</h1>
            <p className="text-lg text-gray-600 mt-2">Click edit buttons on each section to modify content</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white border-b px-8 py-4 flex justify-end gap-2">
          <button onClick={handleEditToggle} className={`px-4 py-2 rounded-md font-medium ${isEditing ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
            {isEditing ? 'Exit Edit Mode' : 'Enter Edit Mode'}
          </button>
          <button onClick={handlePublish} className="px-4 py-2 rounded-md font-medium bg-green-600 text-white">Publish</button>
        </div>

        {/* Homepage Content with Edit Buttons (shown in edit mode) */}
        <div className="relative">
          {/* Always show edit buttons - no conditional rendering */}
          <script dangerouslySetInnerHTML={{
            __html: `
              // ALWAYS run - no conditions
              function addSectionEditButtons() {
                console.log('🔧 CMS: Adding section edit buttons...');
                
                // Remove existing buttons (only those we added)
                document.querySelectorAll('.section-edit-overlay, .section-edit-btn, .section-title-label').forEach(el => el.remove());
                
                // Add styles - make them super prominent
                if (!document.getElementById('section-edit-styles')) {
                  const style = document.createElement('style');
                  style.id = 'section-edit-styles';
                  style.textContent = \`
                    .section-edit-overlay {
                      position: absolute !important;
                      top: 0 !important;
                      left: 0 !important;
                      right: 0 !important;
                      bottom: 0 !important;
                      border: 3px solid #3B82F6 !important;
                      border-style: solid !important;
                      background: rgba(59, 130, 246, 0.05) !important;
                      pointer-events: none !important;
                      z-index: 999999 !important;
                      display: none;
                    }
                    
                    .section-edit-btn {
                      position: absolute !important;
                      top: 50% !important;
                      left: 50% !important;
                      transform: translate(-50%, -50%) !important;
                      background: #3B82F6 !important;
                      color: white !important;
                      border: none !important;
                      border-radius: 12px !important;
                      padding: 16px 32px !important;
                      font-size: 16px !important;
                      font-weight: 700 !important;
                      cursor: pointer !important;
                      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4) !important;
                      transition: all 0.3s ease !important;
                      pointer-events: auto !important;
                      z-index: 1000000 !important;
                      display: none !important;
                      align-items: center !important;
                      gap: 10px !important;
                      min-width: 200px !important;
                      justify-content: center !important;
                      opacity: 0.9 !important;
                    }
                    
                    .section-edit-btn:hover {
                      background: #2563EB !important;
                      transform: translate(-50%, -50%) scale(1.1) !important;
                      opacity: 1 !important;
                      box-shadow: 0 12px 35px rgba(59, 130, 246, 0.6) !important;
                    }
                    
                    .section-title-label {
                      position: absolute !important;
                      top: 10px !important;
                      left: 10px !important;
                      background: #3B82F6 !important;
                      color: white !important;
                      padding: 8px 16px !important;
                      border-radius: 8px !important;
                      font-size: 14px !important;
                      font-weight: 600 !important;
                      z-index: 1000000 !important;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
                      display: none !important;
                    }

                    body.cms-editing .section-edit-overlay { display:block !important; }
                    body.cms-editing .section-edit-btn { display:flex !important; }
                    body.cms-editing .section-title-label { display:block !important; }
                  \`;
                  document.head.appendChild(style);
                }
                
                // Find sections - be more specific to avoid too many
                const mainSelectors = [
                  '.mxd-section',
                  '.nad-cta', 
                  '.tkd-cta',
                  'section'
                ];
                
                let sectionCount = 0;
                
                mainSelectors.forEach(selector => {
                  document.querySelectorAll(selector).forEach((section) => {
                    // Skip already processed only; allow sections inside ml-64 (main content wrapper)
                    if (section.querySelector('.section-edit-btn') ||
                        section.classList.contains('cms-processed')) {
                      return;
                    }
                    
                    section.classList.add('cms-processed');
                    sectionCount++;
                    
                    // Make section relative
                    section.style.position = section.style.position || 'relative';
                    
                    // Determine section name from content
                    let sectionName = 'Section ' + sectionCount;
                    const content = section.textContent?.toLowerCase() || '';
                    
                    if (content.includes('book') && content.includes('demo')) {
                      sectionName = 'Demo Booking';
                    } else if (content.includes('login') || content.includes('register')) {
                      sectionName = 'Login/Register';
                    } else if (content.includes('dance') || content.includes('music') || section.className.includes('hero')) {
                      sectionName = 'Hero Section';
                    } else if (section.className.includes('cta') || content.includes('demo')) {
                      sectionName = 'Call to Action';
                    } else if (content.includes('about')) {
                      sectionName = 'About Section';
                    } else if (content.includes('service')) {
                      sectionName = 'Services';
                    } else if (content.includes('project') || content.includes('portfolio')) {
                      sectionName = 'Projects';
                    } else if (content.includes('contact')) {
                      sectionName = 'Contact';
                    }
                    
                    // Create overlay
                    const overlay = document.createElement('div');
                    overlay.className = 'section-edit-overlay';
                    
                    // Create title label
                    const titleLabel = document.createElement('div');
                    titleLabel.className = 'section-title-label';
                    titleLabel.textContent = sectionName;
                    
                    // Create edit button
                    const editButton = document.createElement('button');
                    editButton.className = 'section-edit-btn';
                    editButton.innerHTML = '✏️ Edit ' + sectionName;
                    
                    // Click handler
                    editButton.addEventListener('click', function(e) {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Trigger modal
                      window.dispatchEvent(new CustomEvent('editSection', {
                        detail: {
                          sectionId: 'section-' + sectionCount,
                          sectionName: sectionName,
                          element: section
                        }
                      }));
                    });
                    
                    // Add to section
                    section.appendChild(overlay);
                    section.appendChild(titleLabel);
                    section.appendChild(editButton);
                  });
                });
                
                console.log('✅ CMS: Added edit buttons to', sectionCount, 'sections');
              }
              
              // Run immediately
              addSectionEditButtons();
              
              // Run multiple times to catch dynamic content
              setTimeout(addSectionEditButtons, 1000);
              setTimeout(addSectionEditButtons, 2000);
              setTimeout(addSectionEditButtons, 4000);
              window.addEventListener('cmsEditToggle', addSectionEditButtons);
            `
          }} />

          {/* Expose handler to global scope */}
          <script dangerouslySetInnerHTML={{
            __html: `
              window.handleElementEdit = function(elementId) {
                window.dispatchEvent(new CustomEvent('editElement', { detail: { elementId } }));
              };
            `
          }} />

          {/* Listen for edit events */}
          <div ref={(div) => {
            if (div) {
              const handleEditEvent = (e: any) => {
                console.log('Section edit event:', e.detail);
                handleElementClick(e.detail.sectionId);
              };
              window.addEventListener('editSection', handleEditEvent);
              return () => window.removeEventListener('editSection', handleEditEvent);
            }
          }} />

          {/* Homepage iframe/content */}
          <RayoLanding 
            htmlPath="/static/index.html" 
            onLoginClick={() => {}} 
            user={null} 
            onLogout={() => {}} 
          />
        </div>
      </div>

      {/* FULL WIDTH Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-6xl mx-4 my-4 max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Edit {getSectionTitle(selectedElement || '')}</h3>
              <p className="text-gray-600 text-sm mt-1">Update text, images, or videos for this section</p>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Text Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text Content
                </label>
                <textarea
                  value={tempContent.text || ''}
                  onChange={(e) => setTempContent(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Enter text content..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image
                </label>
                <div className="space-y-3">
                  {tempContent.image && (
                    <div className="relative">
                      <img 
                        src={tempContent.image} 
                        alt="Preview" 
                        className="max-w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setTempContent(prev => ({ ...prev, image: '' }))}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <label className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg border-2 border-dashed border-blue-300 hover:bg-blue-100 transition-colors flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4" />
                      <span>Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'image');
                        }}
                      />
                    </label>
                    <span className="text-sm text-gray-500">or</span>
                    <input
                      type="url"
                      placeholder="Image URL"
                      value={tempContent.imageUrl || ''}
                      onChange={(e) => setTempContent(prev => ({ ...prev, image: e.target.value }))}
                      className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Video Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video
                </label>
                <div className="space-y-3">
                  {tempContent.video && (
                    <div className="relative">
                      <video 
                        src={tempContent.video} 
                        controls 
                        className="max-w-full h-32 rounded-lg"
                      />
                      <button
                        onClick={() => setTempContent(prev => ({ ...prev, video: '' }))}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <label className="cursor-pointer bg-green-50 text-green-600 px-4 py-2 rounded-lg border-2 border-dashed border-green-300 hover:bg-green-100 transition-colors flex items-center space-x-2">
                      <Video className="w-4 h-4" />
                      <span>Upload Video</span>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'video');
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

                {/* YouTube URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    YouTube Video URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={tempContent.youtube || ''}
                    onChange={(e) => setTempContent(prev => ({ ...prev, youtube: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {tempContent.youtube && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-2">Preview:</p>
                      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500">YouTube Video Preview</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleHomepageCMS;
