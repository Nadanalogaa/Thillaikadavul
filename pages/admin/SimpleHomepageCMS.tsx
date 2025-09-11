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
        <AdminPageHeader 
          title="Homepage Editor"
          subtitle="Edit your homepage content directly"
          action={
            <div className="flex items-center space-x-3">
              {isEditing && (
                <button
                  onClick={handlePublish}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Publish Changes</span>
                </button>
              )}
              
              <button
                onClick={handleEditToggle}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isEditing
                    ? 'bg-gray-600 text-white hover:bg-gray-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isEditing ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>Exit Edit</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Homepage</span>
                  </>
                )}
              </button>
            </div>
          }
        />

        {/* Edit Mode Indicator */}
        {isEditing && (
          <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-6 mx-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <Edit3 className="h-5 w-5 text-orange-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-orange-700">
                  <strong>Edit Mode Active:</strong> Click on any text, image, or section to edit it.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Homepage Content */}
        <div className="relative">
          {/* FIXED: Simple Edit Buttons on Every Section */}
          {isEditing && (
            <>
              {/* Inject edit buttons directly into homepage */}
              <script dangerouslySetInnerHTML={{
                __html: `
                  (function() {
                    // Remove existing buttons first
                    document.querySelectorAll('.cms-edit-btn, .cms-section-overlay').forEach(el => el.remove());
                    
                    // Add styles
                    if (!document.getElementById('cms-edit-styles')) {
                      const style = document.createElement('style');
                      style.id = 'cms-edit-styles';
                      style.textContent = \`
                        .cms-section-overlay {
                          position: absolute !important;
                          top: 0 !important;
                          left: 0 !important;
                          right: 0 !important;
                          bottom: 0 !important;
                          border: 3px solid #FF6B35 !important;
                          border-style: dashed !important;
                          background: rgba(255, 107, 53, 0.1) !important;
                          pointer-events: none !important;
                          z-index: 999999 !important;
                        }
                        
                        .cms-edit-btn {
                          position: absolute !important;
                          top: 15px !important;
                          right: 15px !important;
                          background: #FF6B35 !important;
                          color: white !important;
                          border: none !important;
                          border-radius: 8px !important;
                          padding: 12px 20px !important;
                          font-size: 14px !important;
                          font-weight: 700 !important;
                          cursor: pointer !important;
                          box-shadow: 0 4px 15px rgba(255, 107, 53, 0.5) !important;
                          transition: all 0.3s ease !important;
                          pointer-events: auto !important;
                          z-index: 1000000 !important;
                          display: flex !important;
                          align-items: center !important;
                          gap: 8px !important;
                          min-width: 120px !important;
                          justify-content: center !important;
                        }
                        
                        .cms-edit-btn:hover {
                          background: #E55A2B !important;
                          transform: translateY(-3px) scale(1.05) !important;
                          box-shadow: 0 6px 25px rgba(255, 107, 53, 0.7) !important;
                        }
                        
                        .cms-section-label {
                          position: absolute !important;
                          top: 15px !important;
                          left: 15px !important;
                          background: #FF6B35 !important;
                          color: white !important;
                          padding: 8px 12px !important;
                          border-radius: 6px !important;
                          font-size: 12px !important;
                          font-weight: 700 !important;
                          text-transform: uppercase !important;
                          z-index: 1000000 !important;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
                        }
                      \`;
                      document.head.appendChild(style);
                    }
                    
                    // Find ALL sections - cast a wide net
                    const selectors = [
                      '.mxd-section',
                      'section', 
                      '[class*="section"]',
                      '.mxd-hero-section',
                      '.nad-cta',
                      '.tkd-cta',
                      '[class*="hero"]',
                      '[class*="about"]',
                      '[class*="service"]',
                      '[class*="project"]',
                      '[class*="gallery"]',
                      '[class*="contact"]',
                      '[class*="testimonial"]',
                      'main > div',
                      '[class*="padding"]'
                    ];
                    
                    let sectionCounter = 0;
                    
                    selectors.forEach(selector => {
                      document.querySelectorAll(selector).forEach((section) => {
                        // Skip admin elements and already processed sections
                        if (section.closest('.ml-64') || 
                            section.querySelector('.cms-edit-btn') ||
                            section.classList.contains('processed-cms-section')) {
                          return;
                        }
                        
                        // Mark as processed
                        section.classList.add('processed-cms-section');
                        sectionCounter++;
                        
                        // Make section relative if not already positioned
                        const computedStyle = getComputedStyle(section);
                        if (computedStyle.position === 'static') {
                          section.style.position = 'relative';
                        }
                        
                        // Determine section name
                        let sectionName = 'Section ' + sectionCounter;
                        if (section.className.includes('hero') || section.textContent?.toLowerCase().includes('dance') || section.textContent?.toLowerCase().includes('music')) {
                          sectionName = 'Hero Section';
                        } else if (section.className.includes('cta') || section.textContent?.toLowerCase().includes('demo') || section.textContent?.toLowerCase().includes('login')) {
                          sectionName = 'CTA Section';
                        } else if (section.className.includes('about') || section.textContent?.toLowerCase().includes('about')) {
                          sectionName = 'About Section';
                        } else if (section.className.includes('service') || section.textContent?.toLowerCase().includes('service')) {
                          sectionName = 'Services Section';
                        } else if (section.className.includes('project') || section.id === 'projects') {
                          sectionName = 'Projects Section';
                        } else if (section.className.includes('contact') || section.textContent?.toLowerCase().includes('contact')) {
                          sectionName = 'Contact Section';
                        }
                        
                        // Create section overlay
                        const overlay = document.createElement('div');
                        overlay.className = 'cms-section-overlay';
                        
                        // Create section label
                        const label = document.createElement('div');
                        label.className = 'cms-section-label';
                        label.textContent = sectionName;
                        
                        // Create edit button
                        const editBtn = document.createElement('button');
                        editBtn.className = 'cms-edit-btn';
                        editBtn.innerHTML = '✏️ EDIT ' + sectionName.toUpperCase();
                        
                        // Add click handler
                        editBtn.addEventListener('click', function(e) {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          // Dispatch edit event
                          window.dispatchEvent(new CustomEvent('editSection', {
                            detail: {
                              sectionId: 'section-' + sectionCounter,
                              sectionName: sectionName,
                              element: section
                            }
                          }));
                        });
                        
                        // Add elements to section
                        section.appendChild(overlay);
                        section.appendChild(label);
                        section.appendChild(editBtn);
                      });
                    });
                    
                    console.log('CMS: Added edit buttons to', sectionCounter, 'sections');
                  })();
                `
              }} />
            </>
          )}

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

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Edit {getSectionTitle(selectedElement || '')}</h3>
              <p className="text-gray-600 text-sm mt-1">Update text, images, or videos for this section</p>
            </div>
            
            <div className="p-6 space-y-6">
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