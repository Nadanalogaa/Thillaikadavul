import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, Image, Type, Link, Eye } from 'lucide-react';
import AdminNav from '../../components/admin/AdminNav';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

interface EditModalData {
  type: 'text' | 'image' | 'media';
  title: string;
  content: string;
  imageUrl?: string;
  mediaUrl?: string;
  sectionId: string;
  elementId: string;
}

const HomepageCMSEdit: React.FC = () => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<EditModalData | null>(null);
  const [homePageContent, setHomePageContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    loadHomePage();
  }, []);

  const loadHomePage = async () => {
    try {
      setIsLoading(true);
      // Load the static home page HTML
      const response = await fetch('/static/index.html');
      const html = await response.text();
      setHomePageContent(html);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load home page:', error);
      setIsLoading(false);
    }
  };

  const injectEditButtons = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    const iframeDoc = iframe.contentDocument;
    const editButtonsCSS = `
      .cms-edit-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(59, 130, 246, 0.1);
        border: 2px dashed #3b82f6;
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;
      }
      
      .cms-editable-section {
        position: relative;
      }
      
      .cms-editable-section:hover .cms-edit-overlay {
        opacity: 1;
      }
      
      .cms-edit-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: #3b82f6;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
        opacity: 0;
        transform: translateY(-5px);
        transition: all 0.2s;
        pointer-events: auto;
        z-index: 1000;
      }
      
      .cms-editable-section:hover .cms-edit-btn {
        opacity: 1;
        transform: translateY(0);
      }
      
      .cms-edit-btn:hover {
        background: #2563eb;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }
    `;

    // Inject CSS
    const style = iframeDoc.createElement('style');
    style.textContent = editButtonsCSS;
    iframeDoc.head.appendChild(style);

    // Add edit buttons to sections
    const sections = [
      // Header section
      { selector: '.mxd-header', type: 'text', title: 'Header Navigation' },
      // Hero section
      { selector: '.mxd-hero', type: 'text', title: 'Hero Section' },
      // CTA section
      { selector: '.nad-cta', type: 'text', title: 'Call-to-Action Cards' },
      // About section
      { selector: '.mxd-about', type: 'text', title: 'About Section' },
      // Programs section
      { selector: '.mxd-pinned-projects', type: 'text', title: 'Our Programs' },
      // Stats section
      { selector: '.mxd-stats-cards', type: 'text', title: 'Statistics' },
      // Testimonials
      { selector: '.mxd-testimonials', type: 'text', title: 'Testimonials' },
      // Gallery
      { selector: '.mxd-gallery', type: 'image', title: 'Gallery' },
      // Features
      { selector: '.mxd-features', type: 'text', title: 'Features' },
      // Contact/Footer
      { selector: '.mxd-footer', type: 'text', title: 'Footer' }
    ];

    sections.forEach((section, index) => {
      const element = iframeDoc.querySelector(section.selector);
      if (element) {
        element.classList.add('cms-editable-section');
        
        const overlay = iframeDoc.createElement('div');
        overlay.className = 'cms-edit-overlay';
        
        const editBtn = iframeDoc.createElement('button');
        editBtn.className = 'cms-edit-btn';
        editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>Edit`;
        
        editBtn.onclick = () => {
          const content = element.textContent || '';
          const imageElement = element.querySelector('img');
          
          setEditData({
            type: section.type as 'text' | 'image' | 'media',
            title: section.title,
            content: content,
            imageUrl: imageElement?.src || '',
            sectionId: section.selector,
            elementId: `section-${index}`
          });
          setShowEditModal(true);
        };
        
        overlay.appendChild(editBtn);
        element.appendChild(overlay);
      }
    });
  };

  const handleIframeLoad = () => {
    // Small delay to ensure content is fully rendered
    setTimeout(() => {
      injectEditButtons();
    }, 500);
  };

  const handleSaveEdit = async () => {
    if (!editData) return;

    try {
      // Here you would typically save to your backend
      // For now, we'll just update the iframe content
      const iframe = iframeRef.current;
      if (iframe && iframe.contentDocument) {
        const element = iframe.contentDocument.querySelector(editData.sectionId);
        if (element && editData.type === 'text') {
          // Update text content (this is a simplified approach)
          const textElements = element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div');
          if (textElements.length > 0) {
            textElements[0].textContent = editData.content;
          }
        } else if (element && editData.type === 'image' && editData.imageUrl) {
          const img = element.querySelector('img');
          if (img) {
            img.src = editData.imageUrl;
          }
        }
      }

      setShowEditModal(false);
      setEditData(null);
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && editData) {
      // Create object URL for preview
      const imageUrl = URL.createObjectURL(file);
      setEditData({
        ...editData,
        imageUrl: imageUrl
      });
      
      // Here you would typically upload to your server
      // For now, we're just using the object URL
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        <div className="ml-64">
          <AdminPageHeader title="Homepage CMS" subtitle="Loading..." />
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-primary"></div>
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
          subtitle="Click on any section to edit content, images, or media"
          action={
            <button 
              onClick={loadHomePage}
              className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Refresh Preview
            </button>
          }
        />
        
        <div className="p-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 bg-gray-100 border-b">
              <p className="text-sm text-gray-600">
                Hover over any section and click the "Edit" button to modify content
              </p>
            </div>
            
            <div className="relative" style={{ height: '80vh' }}>
              <iframe
                ref={iframeRef}
                src="/static/index.html"
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                title="Homepage Preview"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit {editData.title}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {editData.type === 'text' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Type className="w-4 h-4 inline mr-1" />
                      Content
                    </label>
                    <textarea
                      value={editData.content}
                      onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your content here..."
                    />
                  </div>
                </div>
              )}

              {editData.type === 'image' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Image className="w-4 h-4 inline mr-1" />
                      Image Upload
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Upload
                      </button>
                    </div>
                    {editData.imageUrl && (
                      <div className="mt-4">
                        <img
                          src={editData.imageUrl}
                          alt="Preview"
                          className="max-w-full h-48 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Link className="w-4 h-4 inline mr-1" />
                      Image URL (Alternative)
                    </label>
                    <input
                      type="url"
                      value={editData.imageUrl || ''}
                      onChange={(e) => setEditData({ ...editData, imageUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              )}

              {editData.type === 'media' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Upload className="w-4 h-4 inline mr-1" />
                      Media Upload
                    </label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Type className="w-4 h-4 inline mr-1" />
                      Caption
                    </label>
                    <textarea
                      value={editData.content}
                      onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter caption or description..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomepageCMSEdit;