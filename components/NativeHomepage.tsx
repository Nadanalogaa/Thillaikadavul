import React from 'react';
import ExactStaticHomepage from './ExactStaticHomepage';

interface NativeHomepageProps {
  onLoginClick: () => void;
}

const NativeHomepage: React.FC<NativeHomepageProps> = ({ onLoginClick }) => {
  return <ExactStaticHomepage onLoginClick={onLoginClick} />;
};

export default NativeHomepage;