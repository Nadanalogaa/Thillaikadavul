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
    // Better text extraction - filter out single letters and empty content
    const textElements = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div'))
      .filter(el => {
        const text = el.textContent?.trim() || '';
        // Skip elements that are:
        // - Single letters or very short
        // - Empty or whitespace only
        // - Hidden elements
        // - Elements that are likely containers (no direct text)
        const hasDirectText = Array.from(el.childNodes).some(node => 
          node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
        );
        const isVisible = !el.closest('[style*="display: none"], [hidden]');
        
        return text.length > 2 && hasDirectText && isVisible;
      })
      .map((el, index) => {
        const text = el.textContent?.trim() || '';
        const tag = el.tagName.toLowerCase();
        
        // Create more descriptive labels
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

    // Better image extraction with thumbnails and descriptions
    const imageElements = Array.from(element.querySelectorAll('img'))
      .filter(img => {
        // Filter out tiny icons, loading gifs, etc.
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

    // Better icon extraction - look for SVG icons, font icons, etc.
    const iconSelectors = [
      'svg', 
      '.icon', 
      '[class*="icon"]', 
      '.fa', 
      '[class*="fa-"]',
      '[class*="ph-"]',
      'i[class*="icon"]',
      'i[class*="fa"]',
      'i[class*="ph"]'
    ];
    
    const iconElements = [];
    iconSelectors.forEach(selector => {
      const icons = Array.from(element.querySelectorAll(selector))
        .filter((icon, index, arr) => {
          // Avoid duplicates and ensure it's actually an icon
          const isVisible = !icon.closest('[style*="display: none"], [hidden]');
          const isDuplicate = arr.slice(0, index).some(prev => prev.isEqualNode(icon));
          
          return isVisible && !isDuplicate;
        });
      
      icons.forEach((icon, index) => {
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
      {editData?.textElements && editData.textElements.length > 0 ? (
        editData.textElements.map((textEl, index) => (
          <div key={textEl.id} className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Type className="w-4 h-4 mr-2 text-blue-600" />
                {(textEl as any).label || textEl.tag.toUpperCase()} Content
              </label>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {textEl.content.length} chars
              </span>
            </div>
            
            {/* Preview of current content */}
            <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600 italic">
              Current: "{(textEl as any).preview || textEl.content}"
            </div>
            
            <textarea
              value={textEl.content}
              onChange={(e) => {
                if (!editData) return;
                const updated = editData.textElements?.map(el => 
                  el.id === textEl.id ? { ...el, content: e.target.value } : el
                );
                setEditData({ ...editData, textElements: updated });
              }}
              rows={textEl.tag === 'p' ? 4 : textEl.content.length > 100 ? 3 : 2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder={`Enter ${(textEl as any).label || textEl.tag} content...`}
            />
          </div>
        ))
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Type className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No editable text found</h3>
          <p className="text-gray-600">This section may contain only images or other non-text content.</p>
        </div>
      )}
    </div>
  );

  const renderImagesTab = () => (
    <div className="space-y-6">
      {editData?.imageElements && editData.imageElements.length > 0 ? (
        editData.imageElements.map((imgEl, index) => (
          <div key={imgEl.id} className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Image className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{imgEl.alt || `Image ${index + 1}`}</h4>
                  <p className="text-sm text-gray-500">
                    {(imgEl as any).width && (imgEl as any).height ? 
                      `${(imgEl as any).width}x${(imgEl as any).height}px` : 
                      'Click to replace this image'
                    }
                  </p>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            
            {/* Current Image Preview */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Image</label>
              <div className="relative">
                {imgEl.url ? (
                  <div className="relative group">
                    <img
                      src={imgEl.url}
                      alt={imgEl.alt}
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-medium">Current Image</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No image found</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Upload className="w-4 h-4 inline mr-2" />
                  Replace with New Image
                </label>
                
                {/* File Upload */}
                <div className="mb-4">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                
                {/* URL Input */}
                <div>
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
                    placeholder="Or paste image URL here..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Image Details</label>
                
                {/* Alt Text */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-600 mb-1">Alt Text (for accessibility)</label>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Describe this image..."
                  />
                </div>
                
                {/* Image Info */}
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>File size:</span>
                    <span>Auto-optimized</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span>JPG, PNG, WebP</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max size:</span>
                    <span>5MB recommended</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
          <p className="text-gray-600">This section doesn't contain any editable images.</p>
        </div>
      )}
    </div>
  );

  const renderIconsTab = () => (
    <div className="space-y-6">
      {editData?.iconElements && editData.iconElements.length > 0 ? (
        editData.iconElements.map((iconEl, index) => (
          <div key={iconEl.id} className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <div className="w-5 h-5 text-purple-600">⭐</div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{iconEl.alt || `Icon ${index + 1}`}</h4>
                  <p className="text-sm text-gray-500 capitalize">
                    {(iconEl as any).type || 'icon'} {(iconEl as any).type === 'font-icon' ? '(Font Icon)' : (iconEl as any).type === 'SVG' ? '(SVG)' : '(Image)'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Current Icon Preview */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Icon</label>
              <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                {iconEl.url ? (
                  (iconEl as any).type === 'SVG' ? (
                    <div dangerouslySetInnerHTML={{ __html: iconEl.url }} className="w-16 h-16" />
                  ) : (iconEl as any).type === 'font-icon' ? (
                    <div className={`${iconEl.url} text-4xl text-gray-700`} title={iconEl.alt} />
                  ) : (
                    <img
                      src={iconEl.url}
                      alt={iconEl.alt}
                      className="w-16 h-16 object-contain"
                    />
                  )
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <div className="text-2xl">⭐</div>
                    </div>
                    <p className="text-gray-500 text-sm">No icon found</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Upload className="w-4 h-4 inline mr-2" />
                  Replace Icon
                </label>
                
                {/* File Upload */}
                <div className="mb-4">
                  <input
                    type="file"
                    accept="image/*,.svg,.ico"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && editData) {
                        const iconUrl = URL.createObjectURL(file);
                        const updated = editData.iconElements?.map(el => 
                          el.id === iconEl.id ? { ...el, url: iconUrl, type: file.type.includes('svg') ? 'SVG' : 'image' } : el
                        );
                        setEditData({ ...editData, iconElements: updated });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                </div>
                
                {/* URL Input */}
                <div>
                  <input
                    type="url"
                    value={(iconEl as any).type === 'font-icon' ? '' : iconEl.url}
                    onChange={(e) => {
                      if (!editData) return;
                      const updated = editData.iconElements?.map(el => 
                        el.id === iconEl.id ? { ...el, url: e.target.value, type: 'image' } : el
                      );
                      setEditData({ ...editData, iconElements: updated });
                    }}
                    placeholder="Or paste icon/SVG URL here..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Icon Details</label>
                
                {/* Icon Alt/Title */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-600 mb-1">Icon Description</label>
                  <input
                    type="text"
                    value={iconEl.alt}
                    onChange={(e) => {
                      if (!editData) return;
                      const updated = editData.iconElements?.map(el => 
                        el.id === iconEl.id ? { ...el, alt: e.target.value } : el
                      );
                      setEditData({ ...editData, iconElements: updated });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Describe this icon..."
                  />
                </div>
                
                {/* Font Icon Class (if applicable) */}
                {(iconEl as any).type === 'font-icon' && (
                  <div className="mb-4">
                    <label className="block text-xs text-gray-600 mb-1">Font Icon Class</label>
                    <input
                      type="text"
                      value={iconEl.url}
                      onChange={(e) => {
                        if (!editData) return;
                        const updated = editData.iconElements?.map(el => 
                          el.id === iconEl.id ? { ...el, url: e.target.value } : el
                        );
                        setEditData({ ...editData, iconElements: updated });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                      placeholder="fa-home, ph-house, etc."
                    />
                  </div>
                )}
                
                {/* Icon Info */}
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Formats:</span>
                    <span>SVG, PNG, ICO</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Best size:</span>
                    <span>24x24px - 64x64px</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Background:</span>
                    <span>Transparent preferred</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="w-12 h-12 text-gray-400 mx-auto mb-4 text-3xl">⭐</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No icons found</h3>
          <p className="text-gray-600">This section doesn't contain any editable icons.</p>
        </div>
      )}
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