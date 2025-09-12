import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Edit3 } from 'lucide-react';
import AdminNav from '../../components/admin/AdminNav';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import RayoLanding from '../../static_react/src/RayoLanding.jsx';

interface EditData {
  title: string;
  content: string;
  element: string;
}

const SimpleWorkingCMS: React.FC = () => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<EditData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      // Add edit mode styles
      const style = document.createElement('style');
      style.id = 'simple-cms-styles';
      style.textContent = `
        .simple-edit-btn {
          position: fixed !important;
          top: 50% !important;
          right: 20px !important;
          transform: translateY(-50%) !important;
          background: #ef4444 !important;
          color: white !important;
          border: none !important;
          padding: 12px 16px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          z-index: 9999 !important;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3) !important;
          min-width: 120px !important;
        }
        
        .simple-edit-btn:hover {
          background: #dc2626 !important;
          transform: translateY(-50%) scale(1.05) !important;
        }

        .cms-highlight {
          outline: 3px dashed #ef4444 !important;
          background: rgba(239, 68, 68, 0.1) !important;
        }
      `;
      document.head.appendChild(style);

      // Add a big red button that's impossible to miss
      setTimeout(() => {
        addBigRedButton();
      }, 1000);
    } else {
      // Remove styles and buttons
      const style = document.getElementById('simple-cms-styles');
      if (style) style.remove();
      
      const btn = document.getElementById('big-red-edit-btn');
      if (btn) btn.remove();

      // Remove highlights
      document.querySelectorAll('.cms-highlight').forEach(el => {
        el.classList.remove('cms-highlight');
      });
    }

    return () => {
      const style = document.getElementById('simple-cms-styles');
      if (style) style.remove();
      
      const btn = document.getElementById('big-red-edit-btn');
      if (btn) btn.remove();
    };
  }, [isEditMode]);

  const addBigRedButton = () => {
    // Remove existing button
    const existingBtn = document.getElementById('big-red-edit-btn');
    if (existingBtn) existingBtn.remove();

    // Create a big red button that's impossible to miss
    const bigBtn = document.createElement('button');
    bigBtn.id = 'big-red-edit-btn';
    bigBtn.className = 'simple-edit-btn';
    bigBtn.innerHTML = '🔴 EDIT SECTIONS';
    bigBtn.onclick = () => findAndHighlightSections();
    
    document.body.appendChild(bigBtn);
    console.log('✅ BIG RED BUTTON ADDED TO PAGE');
  };

  const findAndHighlightSections = () => {
    console.log('🔍 Looking for sections...');
    
    // Look for ANY elements we can edit
    const allElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const rect = el.getBoundingClientRect();
      const hasText = el.textContent && el.textContent.trim().length > 10;
      const isVisible = rect.width > 100 && rect.height > 50;
      const notScript = !['SCRIPT', 'STYLE', 'META', 'LINK'].includes(el.tagName);
      
      return hasText && isVisible && notScript;
    });

    console.log(`Found ${allElements.length} potential sections`);
    
    // Clear previous highlights
    document.querySelectorAll('.cms-highlight').forEach(el => {
      el.classList.remove('cms-highlight');
    });

    // Highlight and add click handlers to first 10 elements
    allElements.slice(0, 10).forEach((element, index) => {
      element.classList.add('cms-highlight');
      
      const clickHandler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        
        setEditData({
          title: `Section ${index + 1}`,
          content: element.textContent || '',
          element: element.tagName.toLowerCase()
        });
        setShowEditModal(true);
        
        // Remove click handlers
        allElements.forEach(el => {
          el.removeEventListener('click', clickHandler);
          el.classList.remove('cms-highlight');
        });
      };
      
      element.addEventListener('click', clickHandler);
      console.log(`✅ Added click handler to: ${element.tagName} - "${element.textContent?.substring(0, 50)}..."`);
    });

    // Update button text
    const btn = document.getElementById('big-red-edit-btn');
    if (btn) {
      btn.innerHTML = `✅ CLICK ANY RED SECTION (${allElements.slice(0, 10).length} found)`;
    }
  };

  const handleSave = () => {
    console.log('Saving:', editData);
    alert('Content saved! (This would update your backend)');
    setShowEditModal(false);
    setEditData(null);
  };

  return (
    <div className="min-h-screen bg-white">
      <AdminNav />
      <div className="ml-64">
        <AdminPageHeader 
          title="Simple Working CMS" 
          subtitle="Click the button to activate edit mode, then click on any highlighted red section"
          action={
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isEditMode 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <Edit3 className="w-5 h-5" />
              {isEditMode ? '🔴 EXIT EDIT MODE' : '🟢 ENTER EDIT MODE'}
            </button>
          }
        />
        
        <div className="p-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  {isEditMode 
                    ? '🔴 EDIT MODE ACTIVE - Look for the big red button on the right!' 
                    : '⚪ Click "ENTER EDIT MODE" to start editing'
                  }
                </p>
                {isEditMode && (
                  <p className="text-sm text-gray-600 mt-2">
                    1. Click the red "EDIT SECTIONS" button → 2. Click any red highlighted section → 3. Edit content
                  </p>
                )}
              </div>
            </div>
            
            <div className="relative" id="homepage-content">
              <RayoLanding 
                htmlPath="/static/index.html" 
                onLoginClick={() => {}} 
                user={null} 
                onLogout={() => {}} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b bg-green-50">
              <h2 className="text-xl font-semibold text-green-800">✅ SUCCESS! Editing {editData.title}</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content ({editData.element} element)
                  </label>
                  <textarea
                    value={editData.content}
                    onChange={(e) => setEditData({...editData, content: e.target.value})}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Edit your content here..."
                  />
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">🎉 This is working!</h4>
                  <p className="text-sm text-gray-600">
                    You successfully clicked on a section and opened the edit modal. 
                    This proves the CMS detection is working. You can now edit the content above.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
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

export default SimpleWorkingCMS;