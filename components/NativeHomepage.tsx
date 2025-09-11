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
      {/* Menu & Menu Hamburger */}
      <nav className="mxd-nav__wrap" data-lenis-prevent="">
        <div className="mxd-nav__contain loading__fade">
          <a href="#0" className="mxd-nav__hamburger">
            <div className="hamburger__base"></div>
            <div className="hamburger__line"></div>
            <div className="hamburger__line"></div>
          </a>
        </div>
        <div className="mxd-menu__wrapper">
          <div className="mxd-menu__base"></div>
          <div className="mxd-menu__contain">
            <div className="mxd-menu__inner">
              <div className="mxd-menu__left">
                <p className="mxd-menu__caption menu-fade-in">🎭 Traditional arts<br/>with modern teaching</p>
                <div className="main-menu">
                  <nav className="main-menu__content">
                    <ul id="main-menu" className="main-menu__accordion">
                      <li className="main-menu__item">
                        <div className="main-menu__toggle">
                          <span className="main-menu__link btn btn-anim">
                            <span className="btn-caption">Home</span>
                          </span>
                        </div>
                        <ul className="submenu">
                          <li className="submenu__item active">
                            <a href="/">Academy Home</a>
                          </li>
                        </ul>
                      </li>
                      <li className="main-menu__item">
                        <div className="main-menu__toggle">
                          <span className="main-menu__link btn btn-anim">
                            <span className="btn-caption">Programs</span>
                          </span>
                        </div>
                        <ul className="submenu">
                          <li className="submenu__item">
                            <a href="/courses">All Courses</a>
                          </li>
                          <li className="submenu__item">
                            <a href="/courses/bharatanatyam">Bharatanatyam</a>
                          </li>
                          <li className="submenu__item">
                            <a href="/courses/vocal">Vocal Music</a>
                          </li>
                          <li className="submenu__item">
                            <a href="/courses/drawing">Drawing</a>
                          </li>
                          <li className="submenu__item">
                            <a href="/courses/abacus">Abacus</a>
                          </li>
                        </ul>
                      </li>
                      <li className="main-menu__item">
                        <div className="main-menu__toggle">
                          <span className="main-menu__link btn btn-anim">
                            <span className="btn-caption">Academy</span>
                          </span>
                        </div>
                        <ul className="submenu">
                          <li className="submenu__item">
                            <a href="/about">About Us</a>
                          </li>
                          <li className="submenu__item">
                            <a href="/teachers">Our Teachers</a>
                          </li>
                          <li className="submenu__item">
                            <a href="/gallery">Gallery</a>
                          </li>
                          <li className="submenu__item">
                            <a href="/events">Events</a>
                          </li>
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
              <div className="mxd-menu__right">
                <div className="mxd-menu__info">
                  <div className="mxd-menu__info-item menu-fade-in">
                    <h6>Contact</h6>
                    <p>
                      <a href="mailto:info@nadanaloga.com">info@nadanaloga.com</a><br/>
                      <a href="tel:+919876543210">+91 98765 43210</a>
                    </p>
                  </div>
                  <div className="mxd-menu__info-item menu-fade-in">
                    <h6>Address</h6>
                    <p>
                      Nadanaloga Fine Arts Academy<br/>
                      Thillaikadavul, Tamil Nadu<br/>
                      India
                    </p>
                  </div>
                  <div className="mxd-menu__info-item menu-fade-in">
                    <h6>Follow Us</h6>
                    <div className="mxd-menu__socials">
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <i className="ph-bold ph-instagram-logo"></i>
                      </a>
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <i className="ph-bold ph-facebook-logo"></i>
                      </a>
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <i className="ph-bold ph-youtube-logo"></i>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header id="header" className="mxd-header">
        <div className="mxd-header__logo loading__fade">
          <a href="/" className="mxd-logo">
            <svg className="mxd-logo__image" version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 56 56" xmlSpace="preserve">
              <path className="mxd-logo__bg" d="M56,28c0,11.1-2.9,28-28,28S0,39.1,0,28S2.9,0,28,0S56,16.9,56,28z" fill="var(--base-opp)"></path>
              <g>
                <defs>
                  <path id="mxd-logo__clippath" d="M28,0C2.9,0,0,16.9,0,28s2.9,28,28,28s28-16.9,28-28S53.1,0,28,0z"></path>
                </defs>
                <clipPath id="mxd-logo__id">
                  <use href="#mxd-logo__clippath" style={{overflow:'visible'}}></use>
                </clipPath>
                <path className="mxd-logo__cat" d="M33.6,34.5h0.9c0.5,0,0.9,0.4,0.9,0.9v3.7c0,0.5-0.4,0.9-0.9,0.9h-0.9c-0.5,0-0.9-0.4-0.9-0.9v-3.7C32.7,34.9,33.1,34.5,33.6,34.5z M20.5,37.3v1.9c0,0.5,0.4,0.9,0.9,0.9h0.9c0.5,0,0.9-0.4,0.9-0.9v-3.7c0-0.5-0.4-0.9-0.9-0.9h-0.9c-0.5,0-0.9,0.4-0.9,0.9V37.3L20.5,37.3z M39.2,21.5v0.9c0,0.5-0.4,0.9-0.9,0.9h-0.9c-0.5,0-0.9-0.4-0.9-0.9v-0.9c0-0.5,0.4-0.9,0.9-0.9h0.9C38.8,20.5,39.2,21,39.2,21.5z M34.5,26.1h0.9c0.5,0,0.9-0.4,0.9-0.9v-0.9c0-0.5-0.4-0.9-0.9-0.9h-0.9c-0.5,0-0.9,0.4-0.9,0.9v0.9C33.6,25.7,34,26.1,34.5,26.1z" fill="var(--base)" clipPath="url(#mxd-logo__id)"></path>
              </g>
            </svg>
            <span className="mxd-logo__text">Nadanaloga<br />Academy</span>
          </a>
        </div>
        <div className="mxd-header__controls loading__fade">
          <button id="color-switcher" className="mxd-color-switcher" type="button" role="switch" aria-label="light/dark mode" aria-checked="true"></button>
          <a className="btn btn-anim btn-default btn-mobile-icon btn-outline slide-right-up" href="/contact">
            <span className="btn-caption">Say Hello</span>
            <i className="ph-bold ph-arrow-up-right"></i>
          </a>
        </div>
      </header>

      {/* Primary CTAs - this was missing! */}
      <section className="nad-cta" aria-label="Primary actions">
        <div className="nad-cta__wrap">
          <div className="nad-cta__card demo">
            <div className="nad-cta__content">
              <h2 className="nad-cta__title">Experience Our Academy</h2>
              <p className="nad-cta__text">Watch live classes and see our teaching methodology</p>
            </div>
            <div className="nad-cta__actions">
              <a className="nad-btn nad-btn--primary" href="/demo">Watch Demo</a>
              <a className="nad-btn nad-btn--ghost" href="/gallery">View Gallery</a>
            </div>
          </div>
          <div className="nad-cta__card auth">
            <div className="nad-cta__content">
              <h2 className="nad-cta__title">Join Nadanaloga</h2>
              <p className="nad-cta__text">Start your journey in fine arts with expert guidance</p>
            </div>
            <div className="nad-cta__actions nad-cta__actions--split">
              <a className="nad-btn nad-btn--ghost" href="/register">Enroll Now</a>
              <a className="nad-btn nad-btn--dark" href="/login" onClick={onLoginClick}>Student Login</a>
            </div>
          </div>
        </div>
      </section>

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