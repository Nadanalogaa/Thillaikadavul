import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Image, Type, Link, Eye, Plus, Trash2, Youtube, Play, Edit3, RotateCcw } from 'lucide-react';
import AdminNav from '../../components/admin/AdminNav';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import RayoLanding from '../../static_react/src/RayoLanding.jsx';

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
  textElements?: { 
    id: string; 
    content: string; 
    tag: string; 
    label?: string; 
    preview?: string; 
  }[];
  imageElements?: { 
    id: string; 
    url: string; 
    alt: string; 
    width?: number; 
    height?: number; 
    element?: HTMLImageElement;
  }[];
  iconElements?: { 
    id: string; 
    url: string; 
    alt: string; 
    type?: string;
    element?: Element;
  }[];
}

const DirectHomepageCMS: React.FC = () => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<EditModalData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'images' | 'icons' | 'media'>('content');

  useEffect(() => {
    if (isEditMode) {
      // Add edit mode class to body
      document.body.classList.add('cms-edit-mode');
      
      // Inject edit styles and buttons after a short delay to ensure DOM is ready
      setTimeout(() => {
        injectEditStyles();
        injectEditButtons();
      }, 1000);
    } else {
      document.body.classList.remove('cms-edit-mode');
      removeEditElements();
    }

    return () => {
      document.body.classList.remove('cms-edit-mode');
      removeEditElements();
    };
  }, [isEditMode]);

  const injectEditStyles = () => {
    if (document.getElementById('cms-edit-styles')) return;

    const style = document.createElement('style');
    style.id = 'cms-edit-styles';
    style.textContent = `
      .cms-edit-mode .cms-edit-overlay {
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
        z-index: 999;
      }
      
      .cms-edit-mode .cms-editable-section {
        position: relative;
        transition: transform 0.2s ease;
      }
      
      .cms-edit-mode .cms-editable-section:hover {
        transform: translateY(-2px);
      }
      
      .cms-edit-mode .cms-editable-section:hover .cms-edit-overlay {
        opacity: 1;
      }
      
      .cms-edit-mode .cms-edit-btn {
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
      
      .cms-edit-mode .cms-editable-section:hover .cms-edit-btn {
        opacity: 1;
        transform: translateY(0);
      }
      
      .cms-edit-mode .cms-edit-btn:hover {
        background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        transform: translateY(-3px);
        box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
      }

      .cms-edit-mode .cms-section-indicator {
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
        z-index: 1000;
      }

      .cms-edit-mode .cms-editable-section:hover .cms-section-indicator {
        opacity: 1;
      }

      .cms-edit-toggle {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        padding: 12px 16px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      }
    `;
    document.head.appendChild(style);
  };

  const injectEditButtons = () => {
    // Remove existing edit elements first
    removeEditElements();

    // Wait a bit more for the RayoLanding component to fully render
    setTimeout(() => {
      const homepageContainer = document.getElementById('homepage-content');
      if (!homepageContainer) {
        console.log('Homepage container not found');
        return;
      }

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

      let foundSections = 0;
      sections.forEach((section, index) => {
        // Search within the homepage container
        const element = homepageContainer.querySelector(section.selector);
        console.log(`Looking for ${section.selector}:`, element);
        
        if (element) {
          foundSections++;
          element.classList.add('cms-editable-section');
          
          const overlay = document.createElement('div');
          overlay.className = 'cms-edit-overlay';
          overlay.dataset.cmsElement = 'true';
          
          const indicator = document.createElement('div');
          indicator.className = 'cms-section-indicator';
          indicator.textContent = `${section.icon} ${section.title}`;
          indicator.dataset.cmsElement = 'true';
          
          const editBtn = document.createElement('button');
          editBtn.className = 'cms-edit-btn';
          editBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>Edit`;
          editBtn.dataset.cmsElement = 'true';
          
          editBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
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

      console.log(`Found ${foundSections} sections out of ${sections.length}`);
      
      // If no sections found, let's try to find what elements are available
      if (foundSections === 0) {
        console.log('No specific sections found. Searching for any elements...');
        console.log('All elements with classes:', Array.from(homepageContainer.querySelectorAll('*')).filter(el => el.className).map(el => el.className));
        
        // Try to add edit buttons to any section-like elements we can find
        const fallbackSections = homepageContainer.querySelectorAll(`
          section, 
          .section, 
          [class*="section"], 
          [class*="card"], 
          [class*="hero"], 
          [class*="cta"],
          [class*="demo"],
          [class*="auth"],
          h1, h2, h3,
          .nad-cta__card,
          div[class*="nad"],
          div[class*="mxd"]
        `);
        
        console.log('Found fallback sections:', fallbackSections);
        
        fallbackSections.forEach((element, index) => {
          // Skip small or hidden elements
          const rect = element.getBoundingClientRect();
          if (rect.width < 50 || rect.height < 50) return;
          
          if (!element.querySelector('.cms-edit-overlay')) {
            element.classList.add('cms-editable-section');
            
            const overlay = document.createElement('div');
            overlay.className = 'cms-edit-overlay';
            overlay.dataset.cmsElement = 'true';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'cms-edit-btn';
            editBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/></svg>Edit`;
            editBtn.dataset.cmsElement = 'true';
            
            editBtn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              const sectionType = detectSectionType(element);
              const content = extractSectionContent(element, sectionType);
              
              setEditData({
                type: sectionType,
                title: element.className || `Section ${index + 1}`,
                content: element.textContent || '',
                sectionId: `.${element.className}`,
                elementId: `fallback-section-${index}`,
                ...content
              });
              setShowEditModal(true);
              setActiveTab('content');
            };
            
            overlay.appendChild(editBtn);
            element.appendChild(overlay);
          }
        });
        
        console.log(`Added edit buttons to ${fallbackSections.length} fallback sections`);
      }
    }, 2000); // Increased delay to ensure RayoLanding is fully loaded
  };

  const removeEditElements = () => {
    // Remove all CMS-added elements
    document.querySelectorAll('[data-cms-element="true"]').forEach(el => el.remove());
    document.querySelectorAll('.cms-editable-section').forEach(el => {
      el.classList.remove('cms-editable-section');
    });
    
    // Remove styles
    const styleEl = document.getElementById('cms-edit-styles');
    if (styleEl) styleEl.remove();
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
    const textElements = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div'))
      .filter(el => {
        const text = el.textContent?.trim() || '';
        const hasDirectText = Array.from(el.childNodes).some(node => 
          node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
        );
        const isVisible = !el.closest('[style*="display: none"], [hidden]');
        
        return text.length > 2 && hasDirectText && isVisible;
      })
      .map((el, index) => {
        const text = el.textContent?.trim() || '';
        const tag = el.tagName.toLowerCase();
        
        let label = tag.toUpperCase();
        if (tag === 'h1') label = 'Main Title';
        else if (tag === 'h2') label = 'Section Title';  
        else if (tag === 'h3') label = 'Subtitle';
        else if (tag === 'p') label = 'Paragraph';
        else if (tag === 'span') label = 'Text';
        else if (tag === 'div') label = 'Content Block';
        
        return {
          id: `text-${index}`,
          content: text,
          tag: tag,
          label: label,
          preview: text.length > 50 ? text.substring(0, 50) + '...' : text
        };
      });

    const imageElements = Array.from(element.querySelectorAll('img'))
      .filter(img => {
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        const isVisible = !img.closest('[style*="display: none"], [hidden]');
        
        return width > 30 && height > 30 && isVisible && img.src && !img.src.includes('data:image');
      })
      .map((img, index) => ({
        id: `img-${index}`,
        url: img.src,
        alt: img.alt || `Image ${index + 1}`,
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0,
        element: img
      }));

    const iconElements: any[] = [];
    const iconSelectors = ['svg', '.icon', '[class*="icon"]', '.fa', '[class*="fa-"]', '[class*="ph-"]', 'i[class*="icon"]', 'i[class*="fa"]', 'i[class*="ph"]'];
    
    iconSelectors.forEach(selector => {
      const icons = Array.from(element.querySelectorAll(selector))
        .filter((icon, index, arr) => {
          const isVisible = !icon.closest('[style*="display: none"], [hidden]');
          const isDuplicate = arr.slice(0, index).some(prev => prev.isEqualNode(icon));
          
          return isVisible && !isDuplicate;
        });
      
      icons.forEach((icon) => {
        let iconType = 'icon';
        let iconUrl = '';
        
        if (icon.tagName === 'SVG') {
          iconType = 'SVG';
          iconUrl = icon.outerHTML;
        } else if (icon.tagName === 'IMG') {
          iconType = 'image';
          iconUrl = (icon as HTMLImageElement).src;
        } else {
          iconType = 'font-icon';
          iconUrl = icon.className;
        }
        
        iconElements.push({
          id: `icon-${iconElements.length}`,
          url: iconUrl,
          alt: icon.getAttribute('title') || icon.className || `Icon ${iconElements.length + 1}`,
          type: iconType,
          element: icon
        });
      });
    });

    const mediaItems: MediaItem[] = [];
    if (sectionType === 'carousel') {
      imageElements.forEach((img, index) => {
        mediaItems.push({
          id: `media-${index}`,
          type: 'image',
          url: img.url,
          caption: img.alt || `Image ${index + 1}`,
          thumbnail: img.url
        });
      });
    }

    return { textElements, imageElements, iconElements, mediaItems };
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
      console.log('Saving changes:', editData);
      // Here you would save to your backend and update the DOM
      setShowEditModal(false);
      setEditData(null);
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  // Render functions (same as before but simplified for space)
  const renderContentTab = () => (
    <div className="space-y-4">
      {editData?.textElements?.map((textEl, index) => (
        <div key={textEl.id} className="p-4 bg-white border border-gray-200 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {textEl.label || textEl.tag.toUpperCase()}
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
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      ))}
    </div>
  );

  const renderImagesTab = () => (
    <div className="space-y-4">
      {editData?.imageElements?.map((imgEl, index) => (
        <div key={imgEl.id} className="p-4 border border-gray-200 rounded-lg">
          <h4 className="font-medium mb-2">{imgEl.alt || `Image ${index + 1}`}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && editData) {
                    const imageUrl = URL.createObjectURL(file);
                    const updated = editData.imageElements?.map(el => 
                      el.id === imgEl.id ? { ...el, url: imageUrl } : el
                    );
                    setEditData({ ...editData, imageElements: updated });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
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
                placeholder="Or paste URL"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-2"
              />
            </div>
            <div>
              {imgEl.url && (
                <img
                  src={imgEl.url}
                  alt={imgEl.alt}
                  className="w-32 h-24 object-cover rounded"
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMediaTab = () => (
    <div className="space-y-4">
      <button
        onClick={addMediaItem}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg"
      >
        <Plus className="w-4 h-4 inline mr-2" />
        Add Media
      </button>
      {editData?.mediaItems?.map((mediaItem, index) => (
        <div key={mediaItem.id} className="p-4 border border-gray-200 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Media Item {index + 1}</h4>
            <button
              onClick={() => removeMediaItem(mediaItem.id)}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <select
              value={mediaItem.type}
              onChange={(e) => updateMediaItem(mediaItem.id, { type: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="youtube">YouTube</option>
            </select>
            <div className="col-span-2">
              {mediaItem.type === 'youtube' ? (
                <input
                  type="url"
                  value={mediaItem.url}
                  onChange={(e) => updateMediaItem(mediaItem.id, { url: e.target.value })}
                  placeholder="YouTube URL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              ) : (
                <input
                  type="file"
                  accept={mediaItem.type === 'image' ? 'image/*' : 'video/*'}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const fileUrl = URL.createObjectURL(file);
                      updateMediaItem(mediaItem.id, { url: fileUrl });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              )}
            </div>
          </div>
          <input
            type="text"
            value={mediaItem.caption || ''}
            onChange={(e) => updateMediaItem(mediaItem.id, { caption: e.target.value })}
            placeholder="Caption"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-2"
          />
          {mediaItem.url && (
            <div className="mt-2">
              <div className="w-32 h-24 bg-gray-100 rounded overflow-hidden">
                {mediaItem.type === 'image' ? (
                  <img src={mediaItem.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    {mediaItem.type === 'youtube' ? <Youtube className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Edit Control */}
      <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
        <button 
          onClick={() => setIsEditMode(!isEditMode)}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
            isEditMode 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          {isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
        </button>
        <div className="mt-2 text-xs text-gray-500 text-center">
          CMS Mode
        </div>
      </div>

      {isEditMode && (
        <div className="fixed top-20 right-4 z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-700">
              <span className="font-medium">✅ Edit Mode Active</span>
            </p>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <span className="px-2 py-1 bg-blue-100 rounded text-xs">📝 Text</span>
            <span className="px-2 py-1 bg-green-100 rounded text-xs">🖼️ Images</span>
            <span className="px-2 py-1 bg-purple-100 rounded text-xs">🎠 Media</span>
          </div>
        </div>
      )}
      
      {/* Render the actual homepage */}
      <div className="relative" id="homepage-content">
        <RayoLanding 
          htmlPath="/static/index.html" 
          onLoginClick={() => {}} 
          user={null} 
          onLogout={() => {}} 
        />
      </div>

      {/* Edit Modal */}
      {showEditModal && editData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Edit {editData.title}</h2>
              <button onClick={() => setShowEditModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="border-b">
              <div className="flex space-x-8 px-6">
                {['content', 'images', 'media'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'content' && renderContentTab()}
              {activeTab === 'images' && renderImagesTab()}
              {activeTab === 'media' && renderMediaTab()}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
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

export default DirectHomepageCMS;