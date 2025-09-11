import React, { useEffect, useState } from 'react';
import { loadAllStaticAssets, cleanupStaticEffects } from '../utils/staticAssets';

interface ExactStaticHomepageProps {
  onLoginClick: () => void;
}

const ExactStaticHomepage: React.FC<ExactStaticHomepageProps> = ({ onLoginClick }) => {
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  // Load static assets on mount
  useEffect(() => {
    loadAllStaticAssets({
      onLoad: () => {
        setAssetsLoaded(true);
        // Hide loader after a delay
        setTimeout(() => {
          setShowLoader(false);
        }, 2000);
      },
      onError: (error) => {
        console.error('Error loading static assets:', error);
        setAssetsLoaded(true);
        setShowLoader(false);
      }
    });

    // Add CSS variables and styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      :root {
        --base: #000000;
        --base-opp: #ffffff;
        --brand-primary: #4F46E5;
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      cleanupStaticEffects();
      if (styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  // Show loader while assets are loading
  if (!assetsLoaded || showLoader) {
    return (
      <div id="loader" className="loader">
        <div className="loader__wrapper">
          <div className="loader__content">
            <div className="loader__count">
              <span className="count__text">0</span>
              <span className="count__percent">%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="exact-static-homepage">
      {/* Exact copy of static HTML structure */}
      
      {/* Menu & Menu Hamburger Start */}
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
                <p className="mxd-menu__caption menu-fade-in">🦄 Innovative design<br/>and cutting-edge development</p>
                <div className="main-menu">
                  <nav className="main-menu__content">
                    <ul id="main-menu" className="main-menu__accordion">
                      <li className="main-menu__item">
                        <div className="main-menu__toggle">
                          <span className="main-menu__link btn btn-anim">
                            <span className="btn-caption">Home</span>
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" version="1.1" viewBox="0 0 20 20">
                            <path d="M19.6,9.6h-3.9c-.4,0-1.8-.2-1.8-.2-.6,0-1.1-.2-1.6-.6-.5-.3-.9-.8-1.2-1.2-.3-.4-.4-.9-.5-1.4,0,0,0-1.1-.2-1.5V.4c0-.2-.2-.4-.4-.4s-.4.2-.4.4v4.4c0,.4-.2,1.5-.2,1.5,0,.5-.2,1-.5,1.4-.3.5-.7.9-1.2,1.2s-1,.5-1.6.6c0,0-1.2,0-1.7.2H.4c-.2,0-.4.2-.4.4s.2.4.4.4h4.1c.4,0,1.7.2,1.7.2.6,0,1.1.2,1.6.6.4.3.8.7,1.1,1.1.3.5.5,1,.6,1.6,0,0,0,1.3.2,1.7v4.1c0,.2.2.4.4.4s.4-.2.4-.4v-4.1c0-.4.2-1.7.2-1.7,0-.6.2-1.1.6-1.6.3-.4.7-.8,1.1-1.1.5-.3,1-.5,1.6-.6,0,0,1.3,0,1.8-.2h3.9c.2,0,.4-.2.4-.4s-.2-.4-.4-.4h0Z"></path>
                          </svg>
                        </div>
                        <ul className="submenu">
                          <li className="submenu__item active">
                            <a href="/">Main home</a>
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
                            <a href="/courses">Our Courses</a>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
      {/* Menu & Menu Hamburger End */}

      {/* Header Start */}
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
                  <use href="#mxd-logo__clippath"></use>
                </clipPath>
                <path className="mxd-logo__cat" d="M33.6,34.5h0.9c0.5,0,0.9,0.4,0.9,0.9v3.7c0,0.5-0.4,0.9-0.9,0.9h-0.9c-0.5,0-0.9-0.4-0.9-0.9v-3.7C32.7,34.9,33.1,34.5,33.6,34.5z M20.5,37.3v1.9c0,0.5,0.4,0.9,0.9,0.9h0.9c0.5,0,0.9-0.4,0.9-0.9v-3.7c0-0.5-0.4-0.9-0.9-0.9h-0.9c-0.5,0-0.9,0.4-0.9,0.9V37.3L20.5,37.3z M39.2,21.5v0.9c0,0.5-0.4,0.9-0.9,0.9h-0.9c-0.5,0-0.9-0.4-0.9-0.9v-0.9c0-0.5,0.4-0.9,0.9-0.9h0.9C38.8,20.5,39.2,21,39.2,21.5z M34.5,26.1h0.9c0.5,0,0.9-0.4,0.9-0.9v-0.9c0-0.5-0.4-0.9-0.9-0.9h-0.9c-0.5,0-0.9,0.4-0.9,0.9v0.9C33.6,25.7,34,26.1,34.5,26.1z" fill="var(--base)" clipPath="url(#mxd-logo__id)"></path>
              </g>
            </svg>
            <span className="mxd-logo__text">Nadanaloga<br/>Academy</span>
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
      {/* Header End */}

      {/* Primary CTAs */}
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

      {/* Page Content Start */}
      <main id="mxd-page-content" className="mxd-page-content">

        {/* Hero Section Start */}
        <div className="mxd-section mxd-hero-section mxd-hero-fullheight">
          <div className="mxd-hero-01">
            <div className="mxd-hero-01__wrap loading-wrap">
              {/* top group */}
              <div className="mxd-hero-01__top">
                <div className="mxd-hero-01__title-wrap">
                  {/* title images */}
                  <div className="mxd-hero-01__images mxd-floating-img">
                    <div className="hero-01-image image-01 mxd-floating-img__item loading__fade">
                      <img className="mxd-pulse" src="/static/images/01_hero-img.webp" alt="Hero Image" />
                    </div>
                    <div className="hero-01-image image-02 mxd-floating-img__item loading__fade">
                      <img className="mxd-move" src="/static/images/02_hero-img.webp" alt="Hero Image" />
                    </div>
                    <div className="hero-01-image image-03 mxd-floating-img__item loading__fade">
                      <img className="mxd-rotate" src="/static/images/03_hero-img.webp" alt="Hero Image" />
                    </div>
                  </div>
                  {/* title marquee */}
                  <div className="mxd-hero-01__marquee loading__item">
                    <div className="marquee marquee-right--gsap">
                      <div className="marquee__toright marquee-flex">
                        <div className="marquee__item item-regular text">
                          <p>Traditional Arts</p>
                          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="currentColor">
                            <path fill="currentColor" d="M78.4,38.4c0,0-11.8,0-15.8,0c-1.6,0-4.8-0.2-7.1-0.8c-2.3-0.6-4.3-0.8-6.3-2.4c-2-1.2-3.5-3.2-4.7-4.8c-1.2-1.6-1.6-3.6-2-5.5c-0.3-1.5-0.7-4.3-0.8-5.9c-0.2-4.3,0-17.4,0-17.4C41.8,0.8,41,0,40.2,0s-1.6,0.8-1.6,1.6c0,0,0,13.1,0,17.4c0,1.6-0.6,4.3-0.8,5.9c-0.3,2-0.8,4-2,5.5c-1.2,2-2.8,3.6-4.7,4.8s-4,1.8-6.3,2.4c-1.9,0.5-4.7,0.6-6.7,0.8c-3.9,0.4-16.6,0-16.6,0C0.8,38.4,0,39.2,0,40c0,0.8,0.8,1.6,1.6,1.6c0,0,12.2,0,16.6,0c1.6,0,4.8,0.3,6.7,0.8c2.3,0.6,4.3,0.8,6.3,2.4c1.6,1.2,3.2,2.8,4.3,4.4c1.2,2,2.1,3.9,2.4,6.3c0.2,1.7,0.7,4.7,0.8,6.7c0.2,4,0,16.2,0,16.2c0,0.8,0.8,1.6,1.6,1.6s1.6-0.8,1.6-1.6c0,0,0-12.3,0-16.2c0-1.6,0.5-5.1,0.8-6.7c0.5-2.3,0.8-4.4,2.4-6.3c1.2-1.6,2.8-3.2,4.3-4.4c2-1.2,3.9-2,6.3-2.4c1.8-0.3,5.1-0.7,7.1-0.8c3.5-0.2,15.8,0,15.8,0c0.8,0,1.6-0.8,1.6-1.6C80,39.2,79.2,38.4,78.4,38.4C78.4,38.4,78.4,38.4,78.4,38.4z"></path>
                          </svg>
                        </div>
                        <div className="marquee__item item-regular text">
                          <p>Expert Teachers</p>
                          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="currentColor">
                            <path fill="currentColor" d="M78.4,38.4c0,0-11.8,0-15.8,0c-1.6,0-4.8-0.2-7.1-0.8c-2.3-0.6-4.3-0.8-6.3-2.4c-2-1.2-3.5-3.2-4.7-4.8c-1.2-1.6-1.6-3.6-2-5.5c-0.3-1.5-0.7-4.3-0.8-5.9c-0.2-4.3,0-17.4,0-17.4C41.8,0.8,41,0,40.2,0s-1.6,0.8-1.6,1.6c0,0,0,13.1,0,17.4c0,1.6-0.6,4.3-0.8,5.9c-0.3,2-0.8,4-2,5.5c-1.2,2-2.8,3.6-4.7,4.8s-4,1.8-6.3,2.4c-1.9,0.5-4.7,0.6-6.7,0.8c-3.9,0.4-16.6,0-16.6,0C0.8,38.4,0,39.2,0,40c0,0.8,0.8,1.6,1.6,1.6c0,0,12.2,0,16.6,0c1.6,0,4.8,0.3,6.7,0.8c2.3,0.6,4.3,0.8,6.3,2.4c1.6,1.2,3.2,2.8,4.3,4.4c1.2,2,2.1,3.9,2.4,6.3c0.2,1.7,0.7,4.7,0.8,6.7c0.2,4,0,16.2,0,16.2c0,0.8,0.8,1.6,1.6,1.6s1.6-0.8,1.6-1.6c0,0,0-12.3,0-16.2c0-1.6,0.5-5.1,0.8-6.7c0.5-2.3,0.8-4.4,2.4-6.3c1.2-1.6,2.8-3.2,4.3-4.4c2-1.2,3.9-2,6.3-2.4c1.8-0.3,5.1-0.7,7.1-0.8c3.5-0.2,15.8,0,15.8,0c0.8,0,1.6-0.8,1.6-1.6C80,39.2,79.2,38.4,78.4,38.4C78.4,38.4,78.4,38.4,78.4,38.4z"></path>
                          </svg>
                        </div>
                        <div className="marquee__item item-regular text">
                          <p>Modern Methods</p>
                          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="currentColor">
                            <path fill="currentColor" d="M78.4,38.4c0,0-11.8,0-15.8,0c-1.6,0-4.8-0.2-7.1-0.8c-2.3-0.6-4.3-0.8-6.3-2.4c-2-1.2-3.5-3.2-4.7-4.8c-1.2-1.6-1.6-3.6-2-5.5c-0.3-1.5-0.7-4.3-0.8-5.9c-0.2-4.3,0-17.4,0-17.4C41.8,0.8,41,0,40.2,0s-1.6,0.8-1.6,1.6c0,0,0,13.1,0,17.4c0,1.6-0.6,4.3-0.8,5.9c-0.3,2-0.8,4-2,5.5c-1.2,2-2.8,3.6-4.7,4.8s-4,1.8-6.3,2.4c-1.9,0.5-4.7,0.6-6.7,0.8c-3.9,0.4-16.6,0-16.6,0C0.8,38.4,0,39.2,0,40c0,0.8,0.8,1.6,1.6,1.6c0,0,12.2,0,16.6,0c1.6,0,4.8,0.3,6.7,0.8c2.3,0.6,4.3,0.8,6.3,2.4c1.6,1.2,3.2,2.8,4.3,4.4c1.2,2,2.1,3.9,2.4,6.3c0.2,1.7,0.7,4.7,0.8,6.7c0.2,4,0,16.2,0,16.2c0,0.8,0.8,1.6,1.6,1.6s1.6-0.8,1.6-1.6c0,0,0-12.3,0-16.2c0-1.6,0.5-5.1,0.8-6.7c0.5-2.3,0.8-4.4,2.4-6.3c1.2-1.6,2.8-3.2,4.3-4.4c2-1.2,3.9-2,6.3-2.4c1.8-0.3,5.1-0.7,7.1-0.8c3.5-0.2,15.8,0,15.8,0c0.8,0,1.6-0.8,1.6-1.6C80,39.2,79.2,38.4,78.4,38.4C78.4,38.4,78.4,38.4,78.4,38.4z"></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* title text */}
                <h1 className="hero-01-title">
                  <span className="hero-01-title__row loading__item">
                    <em className="hero-01-title__item">Nadanaloga</em>
                    <em className="hero-01-title__item title-item-transparent">Fine Arts</em>
                  </span>
                  <span className="hero-01-title__row loading__item">
                    <em className="hero-01-title__item title-item-image">
                      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20 20">
                        <path d="M19.6,9.6h-3.9c-.4,0-1.8-.2-1.8-.2-.6,0-1.1-.2-1.6-.6-.5-.3-.9-.8-1.2-1.2-.3-.4-.4-.9-.5-1.4,0,0,0-1.1-.2-1.5V.4c0-.2-.2-.4-.4-.4s-.4.2-.4.4v4.4c0,.4-.2,1.5-.2,1.5,0,.5-.2,1-.5,1.4-.3.5-.7.9-1.2,1.2s-1,.5-1.6.6c0,0-1.2,0-1.7.2H.4c-.2,0-.4.2-.4.4s.2.4.4.4h4.1c.4,0,1.7.2,1.7.2.6,0,1.1.2,1.6.6.4.3.8.7,1.1,1.1.3.5.5,1,.6,1.6,0,0,0,1.3.2,1.7v4.1c0,.2.2.4.4.4s.4-.2.4-.4v-4.1c0-.4.2-1.7.2-1.7,0-.6.2-1.1.6-1.6.3-.4.7-.8,1.1-1.1.5-.3,1-.5,1.6-.6,0,0,1.3,0,1.8-.2h3.9c.2,0,.4-.2.4-.4s-.2-.4-.4-.4h0Z"></path>
                      </svg>
                    </em>
                    <em className="hero-01-title__item">Academy</em>
                  </span>
                </h1>
              </div>
              {/* bottom group */}
              <div className="mxd-hero-01__bottom">
                <div className="mxd-hero-01__data-wrap">
                  <div className="mxd-hero-01__dash-line dash-line loading__fade"></div>
                  <div className="mxd-hero-01__data-btn loading__fade">
                    <a href="#projects" className="btn-rotating btn-rotating-120-160">
                      <svg version="1.1" id="scrollDown" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" xmlSpace="preserve" className="btn-rotating__text animate-rotation" data-value="360">
                        <defs>
                          <path id="textPath" d="M149.7,80c0,38.5-31.2,69.7-69.7,69.7S10.3,118.5,10.3,80S41.5,10.3,80,10.3S149.7,41.5,149.7,80z"></path>
                        </defs>
                        <g>
                          <use href="#textPath" fill="none"></use>
                          <text>
                            <textPath href="#textPath">Scroll for More * Scroll for More * Scroll for More * </textPath>
                          </text>
                        </g>
                      </svg>
                      <img className="btn-rotating__image" src="/static/images/300x300_obj-btn-01.webp" alt="Object" />
                    </a>
                  </div>
                  <div className="mxd-hero-01__data-descr loading__fade">
                    <p className="t-bright">We are a fine arts academy specializing in traditional Indian arts with modern teaching methods.</p>
                  </div>
                  <div className="mxd-hero-01__data-socials loading__fade">
                    <ul>
                      <li>
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="currentColor">
                          <path fill="currentColor" d="M78.4,38.4c0,0-11.8,0-15.8,0c-1.6,0-4.8-0.2-7.1-0.8c-2.3-0.6-4.3-0.8-6.3-2.4c-2-1.2-3.5-3.2-4.7-4.8c-1.2-1.6-1.6-3.6-2-5.5c-0.3-1.5-0.7-4.3-0.8-5.9c-0.2-4.3,0-17.4,0-17.4C41.8,0.8,41,0,40.2,0s-1.6,0.8-1.6,1.6c0,0,0,13.1,0,17.4c0,1.6-0.6,4.3-0.8,5.9c-0.3,2-0.8,4-2,5.5c-1.2,2-2.8,3.6-4.7,4.8s-4,1.8-6.3,2.4c-1.9,0.5-4.7,0.6-6.7,0.8c-3.9,0.4-16.6,0-16.6,0C0.8,38.4,0,39.2,0,40c0,0.8,0.8,1.6,1.6,1.6c0,0,12.2,0,16.6,0c1.6,0,4.8,0.3,6.7,0.8c2.3,0.6,4.3,0.8,6.3,2.4c1.6,1.2,3.2,2.8,4.3,4.4c1.2,2,2.1,3.9,2.4,6.3c0.2,1.7,0.7,4.7,0.8,6.7c0.2,4,0,16.2,0,16.2c0,0.8,0.8,1.6,1.6,1.6s1.6-0.8,1.6-1.6c0,0,0-12.3,0-16.2c0-1.6,0.5-5.1,0.8-6.7c0.5-2.3,0.8-4.4,2.4-6.3c1.2-1.6,2.8-3.2,4.3-4.4c2-1.2,3.9-2,6.3-2.4c1.8-0.3,5.1-0.7,7.1-0.8c3.5-0.2,15.8,0,15.8,0c0.8,0,1.6-0.8,1.6-1.6C80,39.2,79.2,38.4,78.4,38.4C78.4,38.4,78.4,38.4,78.4,38.4z"></path>
                        </svg>
                        <a href="/gallery" target="_parent">Gallery</a>
                      </li>
                      <li>
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="currentColor">
                          <path fill="currentColor" d="M78.4,38.4c0,0-11.8,0-15.8,0c-1.6,0-4.8-0.2-7.1-0.8c-2.3-0.6-4.3-0.8-6.3-2.4c-2-1.2-3.5-3.2-4.7-4.8c-1.2-1.6-1.6-3.6-2-5.5c-0.3-1.5-0.7-4.3-0.8-5.9c-0.2-4.3,0-17.4,0-17.4C41.8,0.8,41,0,40.2,0s-1.6,0.8-1.6,1.6c0,0,0,13.1,0,17.4c0,1.6-0.6,4.3-0.8,5.9c-0.3,2-0.8,4-2,5.5c-1.2,2-2.8,3.6-4.7,4.8s-4,1.8-6.3,2.4c-1.9,0.5-4.7,0.6-6.7,0.8c-3.9,0.4-16.6,0-16.6,0C0.8,38.4,0,39.2,0,40c0,0.8,0.8,1.6,1.6,1.6c0,0,12.2,0,16.6,0c1.6,0,4.8,0.3,6.7,0.8c2.3,0.6,4.3,0.8,6.3,2.4c1.6,1.2,3.2,2.8,4.3,4.4c1.2,2,2.1,3.9,2.4,6.3c0.2,1.7,0.7,4.7,0.8,6.7c0.2,4,0,16.2,0,16.2c0,0.8,0.8,1.6,1.6,1.6s1.6-0.8,1.6-1.6c0,0,0-12.3,0-16.2c0-1.6,0.5-5.1,0.8-6.7c0.5-2.3,0.8-4.4,2.4-6.3c1.2-1.6,2.8-3.2,4.3-4.4c2-1.2,3.9-2,6.3-2.4c1.8-0.3,5.1-0.7,7.1-0.8c3.5-0.2,15.8,0,15.8,0c0.8,0,1.6-0.8,1.6-1.6C80,39.2,79.2,38.4,78.4,38.4C78.4,38.4,78.4,38.4,78.4,38.4z"></path>
                        </svg>
                        <a href="/about" target="_parent">About</a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Hero Section End */}

      </main>
      {/* Page Content End */}

    </div>
  );
};

export default ExactStaticHomepage;