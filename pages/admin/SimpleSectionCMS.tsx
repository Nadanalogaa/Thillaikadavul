import React, { useState } from 'react';
import { Save, Upload, Edit3, Check, X } from 'lucide-react';
import AdminNav from '../../components/admin/AdminNav';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

interface Section {
  id: string;
  name: string;
  title: string;
  content: string;
  image?: string;
  status: 'draft' | 'pending' | 'approved';
}

const SimpleSectionCMS: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([
    {
      id: 'hero-title',
      name: 'Main Hero Title',
      title: 'Dance, Draw and Fine Arts',
      content: 'Creative expression through traditional and modern arts',
      status: 'approved'
    },
    {
      id: 'hero-description',
      name: 'Academy Description', 
      title: 'About Our Academy',
      content: 'We are a fine arts academy offering Bharatanatyam, Vocal music, Drawing, and Abacus training led by experienced instructors.',
      status: 'approved'
    },
    {
      id: 'book-demo',
      name: 'Book Demo Section',
      title: 'Book a Demo',
      content: 'Experience our teaching style with a complimentary session. Book your demo class today!',
      status: 'approved'
    },
    {
      id: 'login-section',
      name: 'Login Section',
      title: 'Student Portal',
      content: 'Access your student portal or create a new account to track your progress.',
      status: 'approved'
    },
    {
      id: 'programs-header',
      name: 'Programs Header',
      title: 'Our Programs',
      content: 'Explore courses that blend tradition with engaging, modern teaching methods',
      status: 'approved'
    },
    {
      id: 'bharatanatyam',
      name: 'Bharatanatyam Section',
      title: 'Bharatanatyam',
      content: 'Classical dance training from basic steps to advanced performances. Learn the grace and beauty of this ancient art form.',
      image: '/images/dance.png',
      status: 'approved'
    },
    {
      id: 'vocal-music',
      name: 'Vocal Music Section',
      title: 'Vocal Music',
      content: 'Carnatic basics to performance level training. Develop your voice with traditional techniques and modern applications.',
      image: '/images/vocal.png',
      status: 'approved'
    },
    {
      id: 'drawing-painting',
      name: 'Drawing & Painting Section',
      title: 'Drawing & Painting',
      content: 'Fundamentals and creativity development. Express yourself through various art mediums and techniques.',
      image: '/images/drawing.png',
      status: 'approved'
    },
    {
      id: 'abacus',
      name: 'Abacus Section',
      title: 'Abacus',
      content: 'Skill development & speed math training. Enhance mathematical abilities through traditional abacus methods.',
      image: '/images/abacus.svg',
      status: 'approved'
    }
  ]);

  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleEditSection = (section: Section) => {
    setEditingSection({...section});
  };

  const handleSaveSection = () => {
    if (!editingSection) return;
    
    setSections(prev => prev.map(section => 
      section.id === editingSection.id 
        ? {...editingSection, status: 'pending'}
        : section
    ));
    
    alert(`✅ Section "${editingSection.name}" saved successfully!\n\nStatus: Pending Approval\n\nChanges will appear on the website after approval.`);
    setEditingSection(null);
  };

  const handleApproveSection = (sectionId: string) => {
    setSections(prev => prev.map(section =>
      section.id === sectionId
        ? {...section, status: 'approved'}
        : section
    ));
    alert('✅ Section approved! Changes are now live on the website.');
  };

  const handleRejectSection = (sectionId: string) => {
    setSections(prev => prev.map(section =>
      section.id === sectionId
        ? {...section, status: 'draft'}
        : section
    ));
    alert('❌ Section rejected. Please make revisions and resubmit.');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return '✅';
      case 'pending': return '⏳';
      case 'draft': return '📝';
      default: return '📝';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="ml-64">
        <AdminPageHeader 
          title="Simple Section CMS" 
          subtitle="Edit website sections with title, content, and images. All changes require approval before going live."
        />
        
        <div className="p-8">
          <div className="grid gap-6">
            {sections.map((section) => (
              <div key={section.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-gray-900">{section.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(section.status)}`}>
                        {getStatusIcon(section.status)} {section.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {section.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveSection(section.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectSection(section.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEditSection(section)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Section Title</label>
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          <p className="font-medium text-gray-900">{section.title}</p>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          <p className="text-gray-700 leading-relaxed">{section.content}</p>
                        </div>
                      </div>
                      
                      {section.image && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Current Image</label>
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            <p className="text-sm text-gray-600">{section.image}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {section.image && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Image Preview</label>
                        <div className="aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <img 
                            src={section.image} 
                            alt={section.title}
                            className="max-w-full max-h-full object-contain rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.innerHTML = '<div class="text-gray-500 text-center"><p>Image not found</p><p class="text-xs mt-1">Upload a new image</p></div>';
                            }}
                          />
                        </div>
                      </div>
                    )}
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
              <button onClick={() => setEditingSection(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-lg font-medium text-gray-700 mb-3">
                      Section Title
                    </label>
                    <input
                      type="text"
                      value={editingSection.title}
                      onChange={(e) => setEditingSection({...editingSection, title: e.target.value})}
                      className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter section title..."
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-medium text-gray-700 mb-3">
                      Content
                    </label>
                    <textarea
                      value={editingSection.content}
                      onChange={(e) => setEditingSection({...editingSection, content: e.target.value})}
                      rows={6}
                      className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter section content..."
                    />
                  </div>

                  {editingSection.image && (
                    <div>
                      <label className="block text-lg font-medium text-gray-700 mb-3">
                        Image URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingSection.image}
                          onChange={(e) => setEditingSection({...editingSection, image: e.target.value})}
                          className="flex-1 px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter image URL..."
                        />
                        <button
                          onClick={() => setShowUploadModal(true)}
                          className="flex items-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                          <Upload className="w-5 h-5" />
                          Upload
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  {editingSection.image && (
                    <div>
                      <label className="block text-lg font-medium text-gray-700 mb-3">
                        Image Preview
                      </label>
                      <div className="aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <img 
                          src={editingSection.image} 
                          alt={editingSection.title}
                          className="max-w-full max-h-full object-contain rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = '<div class="text-gray-500 text-center"><p>Image preview not available</p><p class="text-xs mt-1">Check the URL or upload a new image</p></div>';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 p-6 border-t bg-gray-50">
              <button
                onClick={() => setEditingSection(null)}
                className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSection}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-3 text-lg font-bold"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal Placeholder */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Image</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Upload functionality coming soon!</p>
                <p className="text-sm text-gray-500">For now, please use image URLs</p>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleSectionCMS;