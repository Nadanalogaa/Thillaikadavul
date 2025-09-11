
import React from 'react';
import { GALLERY_IMAGES } from '../constants';

const GalleryPage: React.FC = () => {
  return (
    <div className="nad-content">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl">Gallery</h1>
        <p className="mt-4 nad-muted">
          A glimpse into the vibrant world of Nadanaloga. Explore moments from our classes, performances, and events.
        </p>
      </div>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {GALLERY_IMAGES.map((src, index) => (
          <div key={index} className="overflow-hidden rounded-xl nad-card hover:shadow-xl transition-shadow duration-300">
            <img 
              src={src} 
              alt={`Gallery image ${index + 1}`} 
              className="w-full h-full object-cover aspect-video transform hover:scale-105 transition-transform duration-300 rounded-xl"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default GalleryPage;
