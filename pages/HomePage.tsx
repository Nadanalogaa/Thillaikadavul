
import React from 'react';
import RayoLanding from '../static_react/src/RayoLanding.jsx';
import type { User } from '../types';

interface HomePageProps {
  onLoginClick: () => void;
  user?: User | null;
  onLogout?: () => void;
}

// Native React homepage component - no iframe, direct rendering with static assets
const HomePage: React.FC<HomePageProps> = ({ onLoginClick, user = null, onLogout }) => {
  return <RayoLanding htmlPath="/static/index.html" onLoginClick={onLoginClick} user={user} onLogout={onLogout} />;
};

export default HomePage;
