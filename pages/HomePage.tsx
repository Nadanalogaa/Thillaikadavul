
import React from 'react';
import NativeHomepage from '../components/NativeHomepage';

interface HomePageProps {
  onLoginClick: () => void;
}

// Native React homepage component - no iframe, direct rendering with static assets
const HomePage: React.FC<HomePageProps> = ({ onLoginClick }) => {
  return (
    <NativeHomepage onLoginClick={onLoginClick} />
  );
};

export default HomePage;
