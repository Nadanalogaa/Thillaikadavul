

import React, { useState } from 'react';
import DynamicHomepage from '../components/DynamicHomepage';

interface HomePageProps {
  onLoginClick: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onLoginClick }) => {
  const [fallbackMode, setFallbackMode] = useState(false);
  const [cmsAttempted, setCmsAttempted] = useState(false);

  // Check if we should start with static mode (e.g., if server is known to be down)
  React.useEffect(() => {
    // Add a listener for when DynamicHomepage fails to load
    const handleCMSError = () => {
      setCmsAttempted(true);
    };

    window.addEventListener('cms-load-error', handleCMSError);
    return () => window.removeEventListener('cms-load-error', handleCMSError);
  }, []);

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
      
      {/* Show fallback option if CMS failed to load */}
      {cmsAttempted && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setFallbackMode(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 shadow-lg"
            title="Switch to static version if CMS is not working"
          >
            Use Static Version
          </button>
        </div>
      )}
    </div>
  );
};

export default HomePage;
