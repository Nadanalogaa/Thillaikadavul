import React, { useState } from 'react';
import { X, Plus, FileText, Image, Video, Users, BarChart3, Award } from 'lucide-react';

interface AddSectionModalProps {
  onClose: () => void;
  onAddSection: (type: string, title: string) => void;
}

const sectionTypes = [
  {
    category: 'Content',
    types: [
      {
        type: 'hero',
        title: 'Hero Section',
        description: 'Main banner with title and call-to-action',
        icon: Image,
        color: 'bg-blue-500'
      },
      {
        type: 'about',
        title: 'About Section',
        description: 'Information about your organization',
        icon: FileText,
        color: 'bg-green-500'
      },
      {
        type: 'text_content',
        title: 'Text Content',
        description: 'Rich text content with formatting',
        icon: FileText,
        color: 'bg-gray-500'
      }
    ]
  },
  {
    category: 'Media',
    types: [
      {
        type: 'carousel_images',
        title: 'Image Carousel',
        description: 'Sliding gallery of images',
        icon: Image,
        color: 'bg-indigo-500'
      },
      {
        type: 'video_section',
        title: 'Video Section',
        description: 'Video player with optional text',
        icon: Video,
        color: 'bg-red-500'
      },
      {
        type: 'gallery',
        title: 'Image Gallery',
        description: 'Grid layout for multiple images',
        icon: Image,
        color: 'bg-pink-500'
      }
    ]
  },
  {
    category: 'Interactive',
    types: [
      {
        type: 'testimonials',
        title: 'Testimonials',
        description: 'Customer reviews and feedback',
        icon: Users,
        color: 'bg-teal-500'
      },
      {
        type: 'statistics',
        title: 'Statistics',
        description: 'Numbers and achievements',
        icon: BarChart3,
        color: 'bg-orange-500'
      },
      {
        type: 'awards',
        title: 'Awards',
        description: 'Recognition and certifications',
        icon: Award,
        color: 'bg-yellow-500'
      }
    ]
  }
];

const AddSectionModal: React.FC<AddSectionModalProps> = ({ onClose, onAddSection }) => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [sectionTitle, setSectionTitle] = useState<string>('');

  const handleAddSection = () => {
    if (selectedType && sectionTitle.trim()) {
      onAddSection(selectedType, sectionTitle.trim());
      onClose();
    }
  };

  const getDefaultTitle = (type: string) => {
    const allTypes = sectionTypes.flatMap(cat => cat.types);
    const typeInfo = allTypes.find(t => t.type === type);
    return typeInfo?.title || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    if (!sectionTitle) {
      setSectionTitle(getDefaultTitle(type));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add New Section</h2>
            <p className="text-gray-600">Choose a section type for your homepage</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:bg-gray-100 p-2 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-8">
            {sectionTypes.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{category.category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.types.map((sectionType) => {
                    const IconComponent = sectionType.icon;
                    return (
                      <div
                        key={sectionType.type}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          selectedType === sectionType.type
                            ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleTypeSelect(sectionType.type)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${sectionType.color}`}>
                            <IconComponent className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{sectionType.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{sectionType.description}</p>
                          </div>
                          {selectedType === sectionType.type && (
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Section Title Input */}
          {selectedType && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section Title
              </label>
              <input
                type="text"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="Enter a title for this section"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <p className="text-sm text-gray-600 mt-2">
                This title helps identify the section in your CMS
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedType ? (
              <span>Selected: <span className="font-medium">{getDefaultTitle(selectedType)}</span></span>
            ) : (
              'Please select a section type'
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSection}
              disabled={!selectedType || !sectionTitle.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Section</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSectionModal;