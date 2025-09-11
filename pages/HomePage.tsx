
import React from 'react';
import RayoLanding from '../static_react/src/RayoLanding.jsx';

interface HomePageProps {
  onLoginClick: () => void;
}

// Native React homepage component - no iframe, direct rendering with static assets
const HomePage: React.FC<HomePageProps> = ({ onLoginClick }) => {
  return <RayoLanding htmlPath="/static/index.html" onLoginClick={onLoginClick} />;
};

export default HomePage;
