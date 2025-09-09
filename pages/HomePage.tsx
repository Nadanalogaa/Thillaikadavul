

import React from 'react';

interface HomePageProps {
  onLoginClick: () => void;
}

// Render the static landing template (with loader & parallax) in an isolated iframe.
const HomePage: React.FC<HomePageProps> = () => {
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
};

export default HomePage;
