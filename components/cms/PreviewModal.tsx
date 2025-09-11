import React, { useState } from 'react';
import { X, Smartphone, Tablet, Monitor, RefreshCw, ExternalLink } from 'lucide-react';

interface Section {
  id: string;
  name: string;
  section_type?: string;
  is_active?: boolean;
}

interface PreviewModalProps {
  sections: Section[];
  mode?: 'desktop' | 'tablet' | 'mobile';
  onModeChange?: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  onClose?: () => void;
}

type ViewportSize = 'mobile' | 'tablet' | 'desktop';

const PreviewModal: React.FC<PreviewModalProps> = ({ 
  sections, 
  mode = 'desktop', 
  onModeChange,
  onClose 
}) => {
  const [viewportSize, setViewportSize] = useState<ViewportSize>(mode);
  const [isLoading, setIsLoading] = useState(false);

  const viewportSizes = {
    mobile: { width: '375px', height: '667px', icon: Smartphone },
    tablet: { width: '768px', height: '1024px', icon: Tablet },
    desktop: { width: '100%', height: '100%', icon: Monitor }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleViewportChange = (size: ViewportSize) => {
    setViewportSize(size);
    onModeChange?.(size);
  };

  const getViewportStyle = () => {
    const size = viewportSizes[viewportSize];
    if (viewportSize === 'desktop') {
      return { width: '100%', height: '100%' };
    }
    return {
      width: size.width,
      height: size.height,
      margin: '0 auto',
      border: '8px solid #374151',
      borderRadius: '12px',
      overflow: 'hidden'
    };
  };

  if (onClose) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full h-full m-4 flex flex-col">
          <PreviewContent />
        </div>
      </div>
    );
  }

  function PreviewContent() {
    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white rounded-t-lg">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">Homepage Preview</h2>
            
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {Object.entries(viewportSizes).map(([size, config]) => {
                const IconComponent = config.icon;
                return (
                  <button
                    key={size}
                    onClick={() => handleViewportChange(size as ViewportSize)}
                    className={`p-2 rounded-md transition-colors ${
                      viewportSize === size
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title={`${size.charAt(0).toUpperCase() + size.slice(1)} view`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              {sections.filter(s => s.is_active).length} active sections
            </span>
            
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Refresh preview"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Viewport Size Indicator */}
        <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>
              Viewing as: <span className="font-medium capitalize">{viewportSize}</span>
              {viewportSize !== 'desktop' && (
                <span className="ml-2 text-gray-500">
                  ({viewportSizes[viewportSize].width} × {viewportSizes[viewportSize].height})
                </span>
              )}
            </span>
            <span className="text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 bg-gray-100 p-4 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading preview...</p>
              </div>
            </div>
          ) : (
            <div style={getViewportStyle()} className="bg-white shadow-lg">
              <div className="p-8 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Homepage Preview</h3>
                <div className="space-y-4">
                  {sections.filter(s => s.is_active).map((section, index) => (
                    <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{section.name}</span>
                        <span className="text-sm text-gray-500 capitalize">
                          {section.section_type?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                  {sections.filter(s => s.is_active).length === 0 && (
                    <p className="text-gray-500">No active sections to preview</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section Summary */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">
                  {sections.filter(s => s.is_active).length} Active
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-gray-600">
                  {sections.filter(s => !s.is_active).length} Inactive
                </span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return <PreviewContent />;
};

export default PreviewModal;