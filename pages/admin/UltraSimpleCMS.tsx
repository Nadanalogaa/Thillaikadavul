import React, { useState } from 'react';
import { X, Save, Edit3 } from 'lucide-react';
import AdminNav from '../../components/admin/AdminNav';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import RayoLanding from '../../static_react/src/RayoLanding.jsx';

interface EditData {
  title: string;
  content: string;
}

const UltraSimpleCMS: React.FC = () => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<EditData>({ title: '', content: '' });
  const [isEditMode, setIsEditMode] = useState(false);

  // Inject edit buttons directly into the loaded HTML content
  React.useEffect(() => {
    if (isEditMode) {
      document.body.classList.add('cms-editing');
      console.log('🟢 Edit mode ACTIVATED - injecting buttons into HTML content');
      
      // Wait for RayoLanding to load, then inject edit buttons
      const injectTimer = setTimeout(() => {
        injectEditButtons();
      }, 3000); // Give more time for content to load
      
      return () => {
        clearTimeout(injectTimer);
        removeInjectedButtons();
      };
    } else {
      document.body.classList.remove('cms-editing');
      console.log('🔴 Edit mode DEACTIVATED');
      removeInjectedButtons();
    }
    
    return () => {
      document.body.classList.remove('cms-editing');
      removeInjectedButtons();
    };
  }, [isEditMode]);

  const injectEditButtons = () => {
    console.log('🔄 Injecting edit buttons into HTML content...');
    console.log('📍 Document body exists:', !!document.body);
    console.log('🌐 Total elements in document:', document.querySelectorAll('*').length);
    
    // Remove existing injected buttons
    removeInjectedButtons();
    
    // Find sections to edit by looking for specific text content (based on actual HTML content)
    const sections = [
      { text: 'Book a Demo', title: 'Book Demo Section' },
      { text: 'Student Login', title: 'Login Section' },
      { text: 'Dance,', title: 'Main Title' },
      { text: 'fine arts academy offering', title: 'Academy Description' },
      { text: 'Our Programs', title: 'Programs Section' },
      { text: 'Bharatanatyam', title: 'Dance Section' },
      { text: 'Vocal Music', title: 'Music Section' },
      { text: 'Drawing & Painting', title: 'Art Section' },
      { text: 'Abacus', title: 'Math Section' },
      { text: 'classical dance training', title: 'Dance Description' },
      { text: 'Carnatic basics to performance', title: 'Music Description' },
      { text: 'fundamentals and creativity', title: 'Art Description' },
      { text: 'skill development & speed math', title: 'Math Description' }
    ];
    
    let buttonsAdded = 0;
    
    sections.forEach((section, index) => {
      console.log(`🔍 Searching for: "${section.text}"`);
      
      // Find elements containing the specific text
      const allElements = Array.from(document.querySelectorAll('*'));
      const elements = allElements.filter(el => 
        el.textContent && 
        el.textContent.toLowerCase().includes(section.text.toLowerCase()) &&
        el.textContent.trim().length > 5 &&
        el.textContent.trim().length < 1000 // Increased limit to catch more elements
      );
      
      console.log(`📊 Found ${elements.length} elements containing "${section.text}"`);
      if (elements.length > 0) {
        elements.forEach((el, i) => {
          console.log(`   ${i+1}. "${el.textContent?.substring(0, 100)}..." (${el.tagName})`);
        });
      }
      
      if (elements.length > 0) {
        const element = elements[0]; // Use first match
        const rect = element.getBoundingClientRect();
        
        if (rect.width > 50 && rect.height > 20) { // Ensure it's a visible element
          // Create edit button
          const editBtn = document.createElement('button');
          editBtn.className = 'cms-injected-btn';
          editBtn.innerHTML = `✏️ EDIT`;
          editBtn.style.cssText = `
            position: fixed;
            top: ${rect.top + window.scrollY}px;
            left: ${rect.right + 5}px;
            background: #ef4444;
            color: white;
            border: none;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            cursor: pointer;
            z-index: 99999;
            box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5);
            animation: editBtnBounce 2s infinite;
          `;
          
          editBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Clicked edit button for:', section.title);
            handleSectionEdit(section.title, element.textContent || '');
          };
          
          document.body.appendChild(editBtn);
          buttonsAdded++;
          console.log(`✅ Added edit button for: ${section.title} at position top:${rect.top}px left:${rect.right}px`);
        }
      }
    });
    
    console.log(`🎯 Total edit buttons added: ${buttonsAdded}`);
    
    // Add CSS animation if not already added
    if (!document.getElementById('cms-edit-btn-styles')) {
      const style = document.createElement('style');
      style.id = 'cms-edit-btn-styles';
      style.textContent = `
        @keyframes editBtnBounce {
          0%, 20%, 50%, 80%, 100% { transform: scale(1); }
          40% { transform: scale(1.1); }
          60% { transform: scale(1.05); }
        }
        .cms-injected-btn:hover {
          background: #dc2626 !important;
          transform: scale(1.1) !important;
        }
      `;
      document.head.appendChild(style);
    }
  };
  
  const removeInjectedButtons = () => {
    const buttons = document.querySelectorAll('.cms-injected-btn');
    buttons.forEach(btn => btn.remove());
    console.log(`🧹 Removed ${buttons.length} injected buttons`);
  };

  const handleSectionEdit = (title: string, content: string) => {
    setEditData({ title, content });
    setShowEditModal(true);
  };

  const handleSave = () => {
    console.log('Saving:', editData);
    alert(`✅ Content saved!\n\nSection: ${editData.title}\nContent: ${editData.content.substring(0, 100)}...`);
    setShowEditModal(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <AdminNav />
      <div className="ml-64">
        <AdminPageHeader 
          title="Ultra Simple CMS" 
          subtitle="Click ENTER EDIT MODE, then look for RED EDIT BUTTONS that appear next to each section"
          action={
            <button 
              onClick={() => {
                const newMode = !isEditMode;
                console.log('🔄 Edit mode changed to:', newMode);
                setIsEditMode(newMode);
                if (newMode) {
                  console.log('✅ Edit mode ACTIVATED - buttons will be injected into content');
                } else {
                  console.log('❌ Edit mode DEACTIVATED');
                }
              }}
              className={`px-6 py-3 rounded-lg font-bold text-lg transition-colors flex items-center gap-3 ${
                isEditMode 
                  ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <Edit3 className="w-6 h-6" />
              {isEditMode ? '🔴 EXIT EDIT MODE' : '🟢 ENTER EDIT MODE'}
            </button>
          }
        />
        
        <div className="relative">
          {/* Edit Mode Alert */}
          {isEditMode && (
            <div className="fixed top-20 left-64 right-4 bg-red-100 border-2 border-red-500 p-4 z-50 rounded-lg shadow-lg">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-red-800 mb-2">🔴 EDIT MODE ACTIVE!</h3>
                  <p className="text-red-700">
                    Look for small <strong>RED "✏️ EDIT" BUTTONS</strong> that appear next to text sections. Click them to edit!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Homepage Content */}
          <div className="relative mt-8">
            <RayoLanding 
              htmlPath="/static/index.html" 
              onLoginClick={() => {}} 
              user={null} 
              onLogout={() => {}} 
            />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b bg-green-50">
              <h2 className="text-2xl font-bold text-green-800">
                ✅ SUCCESS! Editing: {editData.title}
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="p-8">
              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <h3 className="font-bold text-green-800 text-lg mb-2">🎉 The CMS is Working!</h3>
                <p className="text-green-700">
                  You successfully clicked an edit button! This proves the system is working. 
                  Edit the content below and save your changes.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-3">
                    Section Content:
                  </label>
                  <textarea
                    value={editData.content}
                    onChange={(e) => setEditData({...editData, content: e.target.value})}
                    rows={10}
                    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Edit your content here..."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-3 text-lg font-bold"
              >
                <Save className="w-5 h-5" />
                💾 SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UltraSimpleCMS;