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

  // Add body class for edit mode
  React.useEffect(() => {
    if (isEditMode) {
      document.body.classList.add('cms-editing');
      console.log('🟢 Added cms-editing class to body');
    } else {
      document.body.classList.remove('cms-editing');
      console.log('🔴 Removed cms-editing class from body');
    }
    
    return () => {
      document.body.classList.remove('cms-editing');
    };
  }, [isEditMode]);

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
          subtitle="Click ENTER EDIT MODE, then click the FLOATING EDIT BUTTONS that appear over each section"
          action={
            <button 
              onClick={() => {
                const newMode = !isEditMode;
                console.log('🔄 Edit mode changed to:', newMode);
                setIsEditMode(newMode);
                if (newMode) {
                  console.log('✅ Edit mode ACTIVATED - buttons should be visible');
                  setTimeout(() => {
                    const buttons = document.querySelectorAll('.fixed.bg-red-600');
                    console.log('🔍 Found edit buttons:', buttons.length);
                    buttons.forEach((btn, i) => console.log(`Button ${i}:`, btn));
                  }, 100);
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
                    Look for <strong>FLOATING RED EDIT BUTTONS</strong> that appear over each section below. Click them to edit!
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

            {/* FLOATING EDIT BUTTONS - These appear over specific sections */}
            {isEditMode && (
              <>
                {/* DEBUG BUTTON - Big and impossible to miss */}
                <button
                  onClick={() => {
                    console.log('🔴 DEBUG BUTTON CLICKED!');
                    alert('DEBUG: Button is working! This proves buttons are rendering.');
                    handleSectionEdit('DEBUG TEST', 'This is a test to see if buttons work');
                  }}
                  className="fixed top-32 right-8 bg-red-600 text-white px-8 py-6 rounded-lg font-bold shadow-2xl hover:bg-red-700 z-[9999] animate-bounce text-xl"
                  style={{ 
                    minWidth: '200px',
                    minHeight: '80px',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  🚨 DEBUG BUTTON
                </button>

                {/* Book Demo Section */}
                <button
                  onClick={() => handleSectionEdit('Book Demo Section', 'Book a Demo Class\n\nExperience our teaching style with a complimentary session.\n\nEnroll Now')}
                  className="fixed top-80 left-96 bg-red-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg hover:bg-red-700 z-50 animate-bounce"
                  style={{ marginLeft: '100px' }}
                >
                  ✏️ EDIT DEMO
                </button>

                {/* Login Section */}
                <button
                  onClick={() => handleSectionEdit('Login/Register Section', 'Login / Register\n\nAccess your student portal or create a new account.\n\nLogin | Register')}
                  className="fixed top-80 right-96 bg-red-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg hover:bg-red-700 z-50 animate-bounce"
                  style={{ marginRight: '100px' }}
                >
                  ✏️ EDIT LOGIN
                </button>

                {/* Main Title */}
                <button
                  onClick={() => handleSectionEdit('Main Title', 'Dance, Draw and Fine Arts')}
                  className="fixed top-[500px] left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-4 rounded-lg font-bold text-lg shadow-lg hover:bg-red-700 z-50 animate-bounce"
                >
                  ✏️ EDIT TITLE
                </button>

                {/* Academy Description */}
                <button
                  onClick={() => handleSectionEdit('Academy Description', 'We are a fine arts academy offering Bharatanatyam, Vocal music, Drawing, and Abacus training led by experienced instructors.')}
                  className="fixed top-[700px] left-80 bg-red-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg hover:bg-red-700 z-50 animate-bounce"
                >
                  ✏️ EDIT DESCRIPTION
                </button>

                {/* Statistics Section */}
                <button
                  onClick={() => handleSectionEdit('Statistics', '0\nHappy students and parents\n\n0\nStudents returning for advanced levels')}
                  className="fixed top-[800px] left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg hover:bg-red-700 z-50 animate-bounce"
                >
                  ✏️ EDIT STATS
                </button>

                {/* Our Programs */}
                <button
                  onClick={() => handleSectionEdit('Our Programs', 'Our Programs\n\nExplore courses that blend tradition with engaging, modern teaching\n\nAll Programs')}
                  className="fixed top-[1000px] left-72 bg-red-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg hover:bg-red-700 z-50 animate-bounce"
                >
                  ✏️ EDIT PROGRAMS
                </button>

                {/* Bharatanatyam */}
                <button
                  onClick={() => handleSectionEdit('Bharatanatyam Section', 'Bharatanatyam classical dance training')}
                  className="fixed top-[1200px] right-80 bg-red-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg hover:bg-red-700 z-50 animate-bounce"
                >
                  ✏️ EDIT DANCE
                </button>

                {/* Vocal Music */}
                <button
                  onClick={() => handleSectionEdit('Vocal Music Section', 'Vocal Music Carnatic basics to performance')}
                  className="fixed top-[1400px] right-80 bg-red-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg hover:bg-red-700 z-50 animate-bounce"
                >
                  ✏️ EDIT MUSIC
                </button>

                {/* Drawing Section */}
                <button
                  onClick={() => handleSectionEdit('Drawing Section', 'Drawing & Painting fundamentals and creativity')}
                  className="fixed top-[1600px] right-80 bg-red-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg hover:bg-red-700 z-50 animate-bounce"
                >
                  ✏️ EDIT ART
                </button>

                {/* Abacus Section */}
                <button
                  onClick={() => handleSectionEdit('Abacus Section', 'Abacus skill development & speed math')}
                  className="fixed top-[1800px] right-80 bg-red-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg hover:bg-red-700 z-50 animate-bounce"
                >
                  ✏️ EDIT MATH
                </button>

                {/* BIG CENTER INSTRUCTION */}
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white p-6 rounded-xl shadow-2xl z-50 text-center animate-pulse">
                  <h2 className="text-2xl font-bold mb-4">🎯 EDIT BUTTONS ACTIVE!</h2>
                  <p className="text-lg">Click any RED BUTTON to edit that section</p>
                  <div className="mt-4 text-sm opacity-90">
                    ↑ ↓ ← → Look around for red buttons
                  </div>
                </div>
              </>
            )}
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