

import React, { useState } from 'react';
import DynamicHomepage from '../components/DynamicHomepage';

interface HomePageProps {
  onLoginClick: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onLoginClick }) => {
  return (
    <div className="w-full min-h-screen">
      <DynamicHomepage onLoginClick={onLoginClick} />
    </div>
  );
};

export default HomePage;
