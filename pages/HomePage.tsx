

import React, { useState } from 'react';
import DynamicHomepage from '../components/DynamicHomepage';

interface HomePageProps {
  onLoginClick: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onLoginClick }) => {
  const [fallbackMode, setFallbackMode] = useState(false);

  // If there's an error loading CMS data, fallback to static version
  if (fallbackMode) {
    return (
      <div className="w-full h-screen">
        <iframe
          title="Landing"
          src="/static/index.html"
          className="w-full h-full block"
          style={{ border: '0' }}
        />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <DynamicHomepage onLoginClick={onLoginClick} />
      
      {/* Fallback button (hidden by default, can be shown in case of errors) */}
      <div className="fixed bottom-4 right-4 z-50" style={{ display: 'none' }} id="fallback-toggle">
        <button
          onClick={() => setFallbackMode(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
        >
          Switch to Static Version
        </button>
      </div>
    </div>
  );
};

export default HomePage;
