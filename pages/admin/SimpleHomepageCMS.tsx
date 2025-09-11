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
      }
    };
    return defaults[elementId] || {};
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
          {/* Editing Overlay - Show Edit Buttons on Sections */}
          {isEditing && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              <style dangerouslySetInnerHTML={{
                __html: `
                  .edit-section-overlay {
                    position: absolute;
                    border: 2px dashed #3B82F6;
                    background-color: rgba(59, 130, 246, 0.05);
                    pointer-events: auto;
                  }
                  .edit-button-overlay {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: #3B82F6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 12px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    transition: all 0.2s ease;
                    pointer-events: auto;
                  }
                  .edit-button-overlay:hover {
                    background: #2563EB;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                  }
                `
              }} />
              
              {/* Hero Section Edit Overlay */}
              <div className="edit-section-overlay" style={{
                top: '100px',
                left: '0',
                right: '0',
                height: '600px'
              }}>
                <button 
                  className="edit-button-overlay"
                  onClick={() => handleElementClick('hero-section')}
                >
                  <Edit3 className="w-3 h-3" />
                  Edit Hero Section
                </button>
              </div>

              {/* About Section Edit Overlay */}
              <div className="edit-section-overlay" style={{
                top: '720px',
                left: '0',
                right: '0',
                height: '400px'
              }}>
                <button 
                  className="edit-button-overlay"
                  onClick={() => handleElementClick('about-section')}
                >
                  <Edit3 className="w-3 h-3" />
                  Edit About Section
                </button>
              </div>

              {/* Services Section Edit Overlay */}
              <div className="edit-section-overlay" style={{
                top: '1140px',
                left: '0',
                right: '0',
                height: '500px'
              }}>
                <button 
                  className="edit-button-overlay"
                  onClick={() => handleElementClick('services-section')}
                >
                  <Edit3 className="w-3 h-3" />
                  Edit Services Section
                </button>
              </div>

              {/* Gallery Section Edit Overlay */}
              <div className="edit-section-overlay" style={{
                top: '1660px',
                left: '0',
                right: '0',
                height: '400px'
              }}>
                <button 
                  className="edit-button-overlay"
                  onClick={() => handleElementClick('gallery-section')}
                >
                  <Edit3 className="w-3 h-3" />
                  Edit Gallery Section
                </button>
              </div>

              {/* Testimonials Section Edit Overlay */}
              <div className="edit-section-overlay" style={{
                top: '2080px',
                left: '0',
                right: '0',
                height: '400px'
              }}>
                <button 
                  className="edit-button-overlay"
                  onClick={() => handleElementClick('testimonials-section')}
                >
                  <Edit3 className="w-3 h-3" />
                  Edit Testimonials
                </button>
              </div>

              {/* Contact Section Edit Overlay */}
              <div className="edit-section-overlay" style={{
                top: '2500px',
                left: '0',
                right: '0',
                height: '300px'
              }}>
                <button 
                  className="edit-button-overlay"
                  onClick={() => handleElementClick('contact-section')}
                >
                  <Edit3 className="w-3 h-3" />
                  Edit Contact Section
                </button>
              </div>
            </div>
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
                handleElementClick(e.detail.elementId);
              };
              window.addEventListener('editElement', handleEditEvent);
              return () => window.removeEventListener('editElement', handleEditEvent);
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