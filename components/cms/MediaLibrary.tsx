import React, { useState } from 'react';
import { Upload, Search, Grid, List, Trash2, Eye, Download } from 'lucide-react';

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  type: 'image' | 'video' | 'document';
  size: number;
  uploadDate: string;
}

interface MediaLibraryProps {
  onSelectMedia?: (media: MediaItem) => void;
  allowMultiple?: boolean;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({
  onSelectMedia,
  allowMultiple = false
}) => {
  const [mediaItems] = useState<MediaItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Media Library</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
          <Upload className="w-4 h-4" />
          <span>Upload Media</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search media..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900">{mediaItems.length}</div>
          <div className="text-sm text-gray-600">Total Files</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">
            {mediaItems.filter(m => m.type === 'image').length}
          </div>
          <div className="text-sm text-gray-600">Images</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">
            {mediaItems.filter(m => m.type === 'video').length}
          </div>
          <div className="text-sm text-gray-600">Videos</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-purple-600">
            {mediaItems.filter(m => m.type === 'document').length}
          </div>
          <div className="text-sm text-gray-600">Documents</div>
        </div>
      </div>

      {/* Media Grid/List */}
      {mediaItems.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No media files</h3>
          <p className="text-gray-600 mb-4">Upload your first media file to get started</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Upload Media</span>
          </button>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Media Library</h3>
          <p className="text-gray-600">Media files will appear here once uploaded</p>
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;