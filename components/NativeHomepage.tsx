import React, { useEffect, useState } from 'react';
import { loadAllStaticAssets, cleanupStaticEffects } from '../utils/staticAssets';
import { useHomepageData } from '../hooks/useHomepageData';

// Import section components
import LoaderScreen from './homepage/LoaderScreen';
import NavigationMenu from './homepage/NavigationMenu';
import HeroSection from './homepage/HeroSection';
import AboutSection from './homepage/AboutSection';
import ProgramsSection from './homepage/ProgramsSection';
import GalleryMarquee from './homepage/GalleryMarquee';
import CTASection from './homepage/CTASection';

interface NativeHomepageProps {
  onLoginClick: () => void;
}

const NativeHomepage: React.FC<NativeHomepageProps> = ({ onLoginClick }) => {
  const { data, loading, error } = useHomepageData();
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  // Load static assets on mount
  useEffect(() => {
    loadAllStaticAssets({
      onLoad: () => {
        setAssetsLoaded(true);
      },
      onError: (error) => {
        console.error('Error loading static assets:', error);
        setAssetsLoaded(true); // Continue even if some assets fail
      }
    });

    // Add custom CSS for CTA styling (from static template)
    const customStyles = document.createElement('style');
    customStyles.textContent = `
      .tkd-cta-row{position:absolute;left:0;right:0;top:56%;transform:translateY(-50%);display:flex;justify-content:space-between;gap:24px;padding:0 24px;pointer-events:none}
      .tkd-cta{pointer-events:auto;flex:0 1 420px;max-width:44%;border-radius:20px;padding:20px 24px;color:#fff;box-shadow:0 12px 30px rgba(16,24,40,.25);backdrop-filter:blur(8px)}
      .tkd-cta h3{margin:0 0 8px 0;font-size:22px;line-height:1.25}
      .tkd-cta p{margin:0 0 16px 0;opacity:.9}
      .tkd-cta .btns{display:flex;gap:12px;flex-wrap:wrap}
      .tkd-cta .btn{display:inline-flex;align-items:center;justify-content:center;height:42px;padding:0 18px;border-radius:12px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,.35);transition:all .2s ease}
      .tkd-cta .btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(16,24,40,.2)}
      .tkd-cta.demo{background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)}
      .tkd-cta.auth{background:linear-gradient(135deg,#7C3AED 0%,#4338CA 100%)}
      .tkd-cta .btn.light{background:#fff;color:#4338CA;border-color:#fff}
      .tkd-cta .btn.ghost{background:transparent;color:#fff}
      @media (max-width: 1024px){.tkd-cta-row{top:auto;transform:none;position:static;margin:24px 0 0;flex-direction:column;align-items:stretch}.tkd-cta{max-width:100%;flex-basis:auto}}
    `;
    document.head.appendChild(customStyles);

    // Cleanup on unmount
    return () => {
      cleanupStaticEffects();
      if (customStyles.parentNode) {
        customStyles.parentNode.removeChild(customStyles);
      }
    };
  }, []);

  const handleLoaderComplete = () => {
    setShowLoader(false);
  };

  // Show loader while data or assets are loading
  if (loading || !assetsLoaded || showLoader) {
    return <LoaderScreen onComplete={handleLoaderComplete} />;
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Unable to load homepage
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'Homepage data not available'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="native-homepage">
      {/* Navigation Menu */}
      <NavigationMenu
        logo={data.navigation.logo}
        navigationLinks={data.navigation.links}
        onLoginClick={onLoginClick}
      />

      {/* Main Page Content */}
      <main id="mxd-page-content" className="mxd-page-content">
        
        {/* Hero Section */}
        <HeroSection
          title={data.hero.title}
          description={data.hero.description}
          media={data.hero.media}
          marqueeItems={data.hero.marqueeItems}
          links={data.hero.links}
        />

        {/* About Section */}
        <AboutSection
          title={data.about.title}
          subtitle={data.about.subtitle}
          description={data.about.description}
          link={data.about.link}
        />

        {/* Programs Section */}
        {data.programs.length > 0 && (
          <ProgramsSection
            programs={data.programs}
            title="Our Programs"
            subtitle="What we offer"
            description="Explore courses that blend tradition with engaging, modern teaching"
            viewAllLink="/courses"
          />
        )}

        {/* Gallery Marquee */}
        {data.gallery.media.length > 0 && (
          <GalleryMarquee
            media={data.gallery.media}
            title={data.gallery.title}
            subtitle={data.gallery.subtitle}
          />
        )}

        {/* CTA Section */}
        {data.cta.map((cta, index) => (
          <CTASection
            key={index}
            title={cta.title}
            description={cta.description}
            links={cta.links}
          />
        ))}
      </main>

      {/* Footer */}
      <footer className="mxd-footer">
        <div className="mxd-container">
          <div className="mxd-footer__content">
            <p>© 2024 Nadanaloga Fine Arts Academy. All rights reserved.</p>
            <div className="mxd-footer__links">
              <a href="/privacy" target="_parent" className="mxd-footer__link">
                Privacy Policy
              </a>
              <a href="/terms" target="_parent" className="mxd-footer__link">
                Terms of Service
              </a>
              <a href="/contact" target="_parent" className="mxd-footer__link">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NativeHomepage;