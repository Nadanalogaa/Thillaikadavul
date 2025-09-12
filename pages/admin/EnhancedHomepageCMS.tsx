import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, Image, Type, Link, Eye, Plus, Trash2, Youtube, Play, Edit3, RotateCcw } from 'lucide-react';
import AdminNav from '../../components/admin/AdminNav';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'youtube';
  url: string;
  caption?: string;
  thumbnail?: string;
}

interface EditModalData {
  type: 'text' | 'image' | 'icon' | 'carousel' | 'mixed';
  title: string;
  content: string;
  imageUrl?: string;
  iconUrl?: string;
  mediaItems?: MediaItem[];
  sectionId: string;
  elementId: string;
  textElements?: { id: string; content: string; tag: string }[];
  imageElements?: { id: string; url: string; alt: string }[];
  iconElements?: { id: string; url: string; alt: string }[];
}

const EnhancedHomepageCMS: React.FC = () => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<EditModalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'images' | 'icons' | 'media'>('content');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    loadHomePage();
  }, []);

  const loadHomePage = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const detectSectionType = (element: Element): EditModalData['type'] => {
    const hasCarousel = element.querySelector('.swiper, .carousel, .slider');
    const hasMultipleImages = element.querySelectorAll('img').length > 1;
    const hasIcons = element.querySelector('.icon, [class*="icon"], .fa, [class*="ph-"]');
    const hasImages = element.querySelector('img');
    
    if (hasCarousel || hasMultipleImages) return 'carousel';
    if (hasIcons && hasImages) return 'mixed';
    if (hasIcons) return 'icon';
    if (hasImages) return 'image';
    return 'text';
  };

  const extractSectionContent = (element: Element, sectionType: EditModalData['type']) => {
    const textElements = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div')).map((el, index) => ({
      id: `text-${index}`,
      content: el.textContent || '',
      tag: el.tagName.toLowerCase()
    }));

    const imageElements = Array.from(element.querySelectorAll('img')).map((img, index) => ({
      id: `img-${index}`,
      url: img.src,
      alt: img.alt || ''
    }));

    const iconElements = Array.from(element.querySelectorAll('.icon, [class*="icon"], .fa, [class*="ph-"]')).map((icon, index) => ({
      id: `icon-${index}`,
      url: (icon as HTMLImageElement).src || '',
      alt: (icon as HTMLImageElement).alt || icon.className
    }));

    const mediaItems: MediaItem[] = [];
    if (sectionType === 'carousel') {
      imageElements.forEach((img, index) => {
        mediaItems.push({
          id: `media-${index}`,
          type: 'image',
          url: img.url,
          caption: img.alt
        });
      });
    }

    return { textElements, imageElements, iconElements, mediaItems };
  };

  const injectEditButtons = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    const iframeDoc = iframe.contentDocument;
    
    // Enhanced CSS with better visual indicators
    const editButtonsCSS = `
      .cms-edit-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(59, 130, 246, 0.08);
        border: 2px dashed #3b82f6;
        opacity: 0;
        transition: all 0.3s ease;
        pointer-events: none;
        border-radius: 8px;
      }
      
      .cms-editable-section {
        position: relative;
        transition: transform 0.2s ease;
      }
      
      .cms-editable-section:hover {
        transform: translateY(-2px);
      }
      
      .cms-editable-section:hover .cms-edit-overlay {
        opacity: 1;
      }
      
      .cms-edit-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        opacity: 0;
        transform: translateY(-5px);
        transition: all 0.3s ease;
        pointer-events: auto;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }
      
      .cms-editable-section:hover .cms-edit-btn {
        opacity: 1;
        transform: translateY(0);
      }
      
      .cms-edit-btn:hover {
        background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        transform: translateY(-3px);
        box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
      }

      .cms-section-indicator {
        position: absolute;
        top: 12px;
        left: 12px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }

      .cms-editable-section:hover .cms-section-indicator {
        opacity: 1;
      }
    `;

    const style = iframeDoc.createElement('style');
    style.textContent = editButtonsCSS;
    iframeDoc.head.appendChild(style);

    // Enhanced section detection
    const sections = [
      { selector: '.mxd-header', type: 'mixed', title: 'Header Navigation', icon: '🧭' },
      { selector: '.mxd-hero', type: 'mixed', title: 'Hero Section', icon: '🚀' },
      { selector: '.nad-cta', type: 'text', title: 'Call-to-Action Cards', icon: '📢' },
      { selector: '.mxd-about', type: 'mixed', title: 'About Section', icon: '📖' },
      { selector: '.mxd-pinned-projects', type: 'mixed', title: 'Our Programs', icon: '🎯' },
      { selector: '.mxd-stats-cards', type: 'mixed', title: 'Statistics', icon: '📊' },
      { selector: '.mxd-testimonials', type: 'carousel', title: 'Testimonials', icon: '💬' },
      { selector: '.mxd-gallery', type: 'carousel', title: 'Gallery', icon: '🖼️' },
      { selector: '.mxd-features', type: 'mixed', title: 'Features', icon: '⭐' },
      { selector: '.mxd-footer', type: 'mixed', title: 'Footer', icon: '🔗' }
    ];

    sections.forEach((section, index) => {
      const element = iframeDoc.querySelector(section.selector);
      if (element) {
        element.classList.add('cms-editable-section');
        
        const overlay = iframeDoc.createElement('div');
        overlay.className = 'cms-edit-overlay';
        
        const indicator = iframeDoc.createElement('div');
        indicator.className = 'cms-section-indicator';
        indicator.textContent = `${section.icon} ${section.title}`;
        
        const editBtn = iframeDoc.createElement('button');
        editBtn.className = 'cms-edit-btn';
        editBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>Edit ${section.title}`;
        
        editBtn.onclick = () => {
          const sectionType = detectSectionType(element);
          const content = extractSectionContent(element, sectionType);
          
          setEditData({
            type: sectionType,
            title: section.title,
            content: element.textContent || '',
            sectionId: section.selector,
            elementId: `section-${index}`,
            ...content
          });
          setShowEditModal(true);
          setActiveTab(sectionType === 'carousel' ? 'media' : 'content');
        };
        
        overlay.appendChild(indicator);
        overlay.appendChild(editBtn);
        element.appendChild(overlay);
      }
    });
  };

  const handleIframeLoad = () => {
    setTimeout(() => {
      injectEditButtons();
    }, 1000);
  };

  const addMediaItem = () => {
    if (!editData) return;
    
    const newMediaItem: MediaItem = {
      id: `media-${Date.now()}`,
      type: 'image',
      url: '',
      caption: ''
    };
    
    setEditData({
      ...editData,
      mediaItems: [...(editData.mediaItems || []), newMediaItem]
    });
  };

  const removeMediaItem = (itemId: string) => {
    if (!editData) return;
    
    setEditData({
      ...editData,
      mediaItems: editData.mediaItems?.filter(item => item.id !== itemId)
    });
  };

  const updateMediaItem = (itemId: string, updates: Partial<MediaItem>) => {
    if (!editData) return;
    
    setEditData({
      ...editData,
      mediaItems: editData.mediaItems?.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    });
  };

  const handleSaveEdit = async () => {
    if (!editData) return;

    try {
      // Here you would save to your backend
      console.log('Saving changes:', editData);
      setShowEditModal(false);
      setEditData(null);
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const renderContentTab = () => (
    <div className="space-y-6">
      {editData?.textElements?.map((textEl, index) => (
        <div key={textEl.id} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            <Type className="w-4 h-4 inline mr-2" />
            {textEl.tag.toUpperCase()} Content
          </label>
          <textarea
            value={textEl.content}
            onChange={(e) => {
              if (!editData) return;
              const updated = editData.textElements?.map(el => 
                el.id === textEl.id ? { ...el, content: e.target.value } : el
              );
              setEditData({ ...editData, textElements: updated });
            }}
            rows={textEl.tag === 'p' ? 4 : 2}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder={`Enter ${textEl.tag} content...`}
          />
        </div>
      ))}
    </div>
  );

  const renderImagesTab = () => (
    <div className="space-y-6">
      {editData?.imageElements?.map((imgEl, index) => (
        <div key={imgEl.id} className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Image {index + 1}</h4>
            <button className="text-blue-600 hover:text-blue-800">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Upload className="w-4 h-4 inline mr-1" />
                Upload New Image
              </label>
              <input
                type="file"
                accept="image/*"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <div className="mt-2">
                <input
                  type="url"
                  value={imgEl.url}
                  onChange={(e) => {
                    if (!editData) return;
                    const updated = editData.imageElements?.map(el => 
                      el.id === imgEl.id ? { ...el, url: e.target.value } : el
                    );
                    setEditData({ ...editData, imageElements: updated });
                  }}
                  placeholder="Or enter image URL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            
            <div>
              {imgEl.url && (
                <img
                  src={imgEl.url}
                  alt={imgEl.alt}
                  className="w-full h-32 object-cover rounded-lg border"
                />
              )}
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Alt Text</label>
            <input
              type="text"
              value={imgEl.alt}
              onChange={(e) => {
                if (!editData) return;
                const updated = editData.imageElements?.map(el => 
                  el.id === imgEl.id ? { ...el, alt: e.target.value } : el
                );
                setEditData({ ...editData, imageElements: updated });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Image description"
            />
          </div>
        </div>
      ))}
    </div>
  );

  const renderIconsTab = () => (
    <div className="space-y-6">
      {editData?.iconElements?.map((iconEl, index) => (
        <div key={iconEl.id} className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Icon {index + 1}</h4>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Upload className="w-4 h-4 inline mr-1" />
                Upload Icon
              </label>
              <input
                type="file"
                accept="image/*,.svg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <div className="mt-2">
                <input
                  type="url"
                  value={iconEl.url}
                  onChange={(e) => {
                    if (!editData) return;
                    const updated = editData.iconElements?.map(el => 
                      el.id === iconEl.id ? { ...el, url: e.target.value } : el
                    );
                    setEditData({ ...editData, iconElements: updated });
                  }}
                  placeholder="Or enter icon URL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              {iconEl.url ? (
                <img
                  src={iconEl.url}
                  alt={iconEl.alt}
                  className="w-16 h-16 object-contain"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Image className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMediaTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Carousel Media</h3>
        <button
          onClick={addMediaItem}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Media
        </button>
      </div>

      {editData?.mediaItems?.map((mediaItem, index) => (
        <div key={mediaItem.id} className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Media Item {index + 1}</h4>
            <button
              onClick={() => removeMediaItem(mediaItem.id)}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Media Type</label>
              <select
                value={mediaItem.type}
                onChange={(e) => updateMediaItem(mediaItem.id, { type: e.target.value as 'image' | 'video' | 'youtube' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              {mediaItem.type === 'youtube' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Youtube className="w-4 h-4 inline mr-1" />
                    YouTube URL
                  </label>
                  <input
                    type="url"
                    value={mediaItem.url}
                    onChange={(e) => updateMediaItem(mediaItem.id, { url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Upload className="w-4 h-4 inline mr-1" />
                    Upload {mediaItem.type === 'image' ? 'Image' : 'Video'}
                  </label>
                  <input
                    type="file"
                    accept={mediaItem.type === 'image' ? 'image/*' : 'video/*'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="url"
                    value={mediaItem.url}
                    onChange={(e) => updateMediaItem(mediaItem.id, { url: e.target.value })}
                    placeholder={`Or enter ${mediaItem.type} URL`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-2"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
            <input
              type="text"
              value={mediaItem.caption || ''}
              onChange={(e) => updateMediaItem(mediaItem.id, { caption: e.target.value })}
              placeholder="Optional caption or description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {mediaItem.url && (
            <div className="mt-4">
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                {mediaItem.type === 'youtube' ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Youtube className="w-6 h-6" />
                    <span>YouTube Video Preview</span>
                  </div>
                ) : mediaItem.type === 'video' ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Play className="w-6 h-6" />
                    <span>Video Preview</span>
                  </div>
                ) : (
                  <img
                    src={mediaItem.url}
                    alt={mediaItem.caption || ''}
                    className="w-full h-full object-cover rounded-lg"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {(!editData?.mediaItems || editData.mediaItems.length === 0) && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No media items yet</h3>
          <p className="text-gray-600 mb-4">Add images, videos, or YouTube links to create a carousel</p>
          <button
            onClick={addMediaItem}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add First Media Item
          </button>
        </div>
      )}
    </div>
  );

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
          title="Enhanced Homepage CMS" 
          subtitle="Click on any section to edit content, images, icons, and media"
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
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">✨ Enhanced CMS:</span> Hover over sections to see edit options. Support for text, images, icons, and carousels.
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="px-2 py-1 bg-blue-100 rounded">📝 Text</span>
                  <span className="px-2 py-1 bg-green-100 rounded">🖼️ Images</span>
                  <span className="px-2 py-1 bg-purple-100 rounded">🎠 Carousel</span>
                </div>
              </div>
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

      {/* Enhanced Full-Width Edit Modal */}
      {showEditModal && editData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl mx-auto h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Edit {editData.title}
                  </h2>
                  <p className="text-sm text-gray-600 capitalize">
                    {editData.type === 'mixed' ? 'Text, Images & Icons' : editData.type} Content
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b bg-white">
              <div className="flex space-x-8 px-6">
                {['content', 'images', 'icons', 'media'].map((tab) => {
                  const shouldShow = 
                    (tab === 'content') ||
                    (tab === 'images' && (editData.type === 'image' || editData.type === 'mixed' || editData.type === 'carousel')) ||
                    (tab === 'icons' && (editData.type === 'icon' || editData.type === 'mixed')) ||
                    (tab === 'media' && editData.type === 'carousel');

                  if (!shouldShow) return null;

                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab === 'content' && <Type className="w-4 h-4 inline mr-2" />}
                      {tab === 'images' && <Image className="w-4 h-4 inline mr-2" />}
                      {tab === 'icons' && <div className="w-4 h-4 inline mr-2">⭐</div>}
                      {tab === 'media' && <Play className="w-4 h-4 inline mr-2" />}
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="max-w-4xl">
                {activeTab === 'content' && renderContentTab()}
                {activeTab === 'images' && renderImagesTab()}
                {activeTab === 'icons' && renderIconsTab()}
                {activeTab === 'media' && renderMediaTab()}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-6 border-t bg-white">
              <div className="text-sm text-gray-600">
                💡 Changes will be applied immediately to the preview
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center gap-2 font-medium"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedHomepageCMS;