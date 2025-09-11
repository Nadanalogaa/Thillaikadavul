import React from 'react';
import { Plus, Edit3, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';

interface Section {
  id: string;
  section_type?: string;
  name?: string;
  content?: {
    status?: string;
  };
  is_active?: boolean;
}

interface SimpleCMSDashboardProps {
  sections: Section[];
  onSectionSelect?: (section: Section) => void;
  onSectionCreate?: () => void;
  onSectionDelete?: (sectionId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filterType?: string;
  onFilterChange?: (filter: string) => void;
  loading?: boolean;
}

const SimpleCMSDashboard: React.FC<SimpleCMSDashboardProps> = ({
  sections,
  onSectionSelect,
  onSectionCreate,
  onSectionDelete,
  searchQuery = '',
  onSearchChange,
  filterType = 'all',
  onFilterChange,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Homepage Sections</h2>
          <p className="text-gray-600">Manage and organize your homepage content</p>
        </div>
        <button
          onClick={onSectionCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Section</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search sections..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => onFilterChange?.(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Sections</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900">{sections.length}</div>
          <div className="text-sm text-gray-600">Total Sections</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">
            {sections.filter(s => s.content?.status === 'published').length}
          </div>
          <div className="text-sm text-gray-600">Published</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-yellow-600">
            {sections.filter(s => s.content?.status === 'draft').length}
          </div>
          <div className="text-sm text-gray-600">Drafts</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-600">
            {sections.filter(s => !s.is_active).length}
          </div>
          <div className="text-sm text-gray-600">Inactive</div>
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-3">
        {sections.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
            <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Plus className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sections yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first homepage section</p>
            <button
              onClick={onSectionCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Section</span>
            </button>
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="cursor-grab hover:cursor-grabbing p-1 text-gray-400 hover:text-gray-600">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{section.name || 'Unnamed Section'}</h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {section.section_type?.replace('_', ' ') || 'Unknown Type'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    section.content?.status === 'published' 
                      ? 'bg-green-100 text-green-800'
                      : section.content?.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {section.content?.status || 'Draft'}
                  </span>
                  
                  <button
                    className={`p-1.5 rounded-md transition-colors ${
                      section.is_active
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                    title={section.is_active ? 'Section active' : 'Section inactive'}
                  >
                    {section.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={() => onSectionSelect?.(section)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Edit section"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => onSectionDelete?.(section.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete section"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SimpleCMSDashboard;