import React, { useState, useEffect } from 'react';
import { Save, Upload, Edit3, Check, X, FileImage } from 'lucide-react';
import AdminNav from '../../components/admin/AdminNav';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { getHomepageSections, updateSectionContent, approveSectionContent, rejectSectionContent, uploadFile, type CMSSection } from '../../api';

const SimpleSectionCMS: React.FC = () => {
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<CMSSection | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      setLoading(true);
      const data = await getHomepageSections();
      setSections(data);
    } catch (error) {
      console.error('Error loading sections:', error);
      alert('Failed to load sections. Please check your database connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSection = (section: CMSSection) => {
    setEditingSection({...section});
  };

  const handleSaveSection = async () => {
    if (!editingSection) return;
    
    try {
      setSaving(true);
      await updateSectionContent(editingSection.id, {
        title: editingSection.title,
        body_content: editingSection.body_content,
        image_url: editingSection.image_url
      });
      
      alert(`✅ Section "${editingSection.name}" saved successfully!\n\nStatus: Pending Approval\n\nChanges will appear on the website after approval.`);
      setEditingSection(null);
      await loadSections(); // Reload to show updated status
    } catch (error) {
      console.error('Error saving section:', error);
      alert('Failed to save section. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveSection = async (sectionId: string) => {
    try {
      await approveSectionContent(sectionId);
      alert('✅ Section approved! Changes are now live on the website.');
      await loadSections(); // Reload to show updated status
    } catch (error) {
      console.error('Error approving section:', error);
      alert('Failed to approve section. Please try again.');
    }
  };

  const handleRejectSection = async (sectionId: string) => {
    try {
      await rejectSectionContent(sectionId);
      alert('❌ Section rejected. Please make revisions and resubmit.');
      await loadSections(); // Reload to show updated status
    } catch (error) {
      console.error('Error rejecting section:', error);
      alert('Failed to reject section. Please try again.');
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      const fileUrl = await uploadFile(file);
      
      if (editingSection) {
        setEditingSection({
          ...editingSection,
          image_url: fileUrl
        });
      }
      
      setShowUploadModal(false);
      alert('✅ File uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 border-green-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'archived': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return '✅';
      case 'approved': return '👍';
      case 'pending_review': return '⏳';
      case 'draft': return '📝';
      case 'rejected': return '❌';
      case 'archived': return '📦';
      default: return '📝';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        <div className="ml-64 p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl text-gray-600">Loading sections from database...</div>
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
          subtitle="Edit website sections with real PostgreSQL database integration. All changes require approval before going live."
          action={
            <button
              onClick={loadSections}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🔄 Refresh
            </button>
          }
        />
        
        <div className="p-8">
          {sections.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Sections Found</h3>
              <p className="text-gray-600 mb-4">
                It looks like your database doesn't have homepage sections yet. 
                Please run the <code className="bg-gray-100 px-2 py-1 rounded">cms_fix.sql</code> file in your Supabase SQL Editor.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg mb-4 text-left">
                <h4 className="font-semibold text-blue-900 mb-2">Quick Setup Instructions:</h4>
                <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                  <li>Go to your Supabase project dashboard</li>
                  <li>Click on "SQL Editor" in the left sidebar</li>
                  <li>Copy and paste the contents of <code>cms_fix.sql</code></li>
                  <li>Click "Run" to create the CMS tables</li>
                  <li>Come back here and click "Try Again"</li>
                </ol>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={loadSections}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  🔄 Try Again
                </button>
                <button
                  onClick={() => window.open('https://supabase.com/dashboard/projects', '_blank')}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  📊 Open Supabase
                </button>
              </div>
            </div>
          ) : (
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
                        {section.status === 'pending_review' && (
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
                            <p className="font-medium text-gray-900">{section.title || section.name}</p>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            <p className="text-gray-700 leading-relaxed">
                              {section.body_content || 'No content yet'}
                            </p>
                          </div>
                        </div>
                        
                        {section.image_url && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Current Image URL</label>
                            <div className="p-3 bg-gray-50 rounded-lg border">
                              <p className="text-sm text-gray-600 break-all">{section.image_url}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Image Preview</label>
                        <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                          {section.image_url ? (
                            <img 
                              src={section.image_url} 
                              alt={section.title}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = '<div class="text-gray-500 text-center text-xs p-2"><p>Image not found</p><p>Please upload new</p></div>';
                              }}
                            />
                          ) : (
                            <div className="text-gray-500 text-center">
                              <FileImage className="w-8 h-8 mx-auto mb-1" />
                              <p className="text-xs">No image</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                      value={editingSection.body_content}
                      onChange={(e) => setEditingSection({...editingSection, body_content: e.target.value})}
                      rows={6}
                      className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter section content..."
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-medium text-gray-700 mb-3">
                      Image URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingSection.image_url || ''}
                        onChange={(e) => setEditingSection({...editingSection, image_url: e.target.value})}
                        className="flex-1 px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter image URL or upload a file..."
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
                </div>

                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-3">
                    Image Preview
                  </label>
                  <div className="w-40 h-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    {editingSection.image_url ? (
                      <img 
                        src={editingSection.image_url} 
                        alt={editingSection.title}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = '<div class="text-gray-500 text-center"><p>Image preview not available</p><p class="text-xs mt-1">Check the URL or upload a new image</p></div>';
                        }}
                      />
                    ) : (
                      <div className="text-gray-500 text-center">
                        <FileImage className="w-16 h-16 mx-auto mb-4" />
                        <p>No image selected</p>
                        <p className="text-xs mt-1">Upload or enter a URL above</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 p-6 border-t bg-gray-50">
              <button
                onClick={() => setEditingSection(null)}
                className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSection}
                disabled={saving}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-3 text-lg font-bold disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Upload Image</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={uploading}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Select an image file to upload</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="file-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer ${
                    uploading 
                      ? 'bg-gray-400 text-white' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {uploading ? 'Uploading...' : 'Choose File'}
                </label>
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                <p>• Images will be uploaded to /server/uploads/images/</p>
                <p>• Supported formats: JPG, PNG, GIF, WebP</p>
                <p>• Max file size: 5MB</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleSectionCMS;