import React, { useState } from 'react';

interface NavigationLink {
  label: string;
  url: string;
  target?: string;
}

interface NavigationMenuProps {
  logo?: {
    image?: string;
    text: string;
  };
  navigationLinks: NavigationLink[];
  onLoginClick?: () => void;
}

const NavigationMenu: React.FC<NavigationMenuProps> = ({
  logo = { text: 'Nadanaloga<br>Academy' },
  navigationLinks,
  onLoginClick
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      {/* Main Navigation */}
      <nav className="mxd-nav__wrap" data-lenis-prevent="">
        
        {/* Hamburger Start */}
        <div className="mxd-nav__contain loading__fade">
          <a href="#0" className="mxd-nav__hamburger" onClick={toggleMenu}>
            {/* flip element */}
            <div className="hamburger__base"></div>
            <div className="hamburger__line"></div>
            <div className="hamburger__line"></div>
          </a>
        </div>
        {/* Hamburger End */}

        {/* Main Navigation Menu */}
        <div className={`mxd-menu__wrapper ${isMenuOpen ? 'is-active' : ''}`}>
          {/* background active layer */}
          <div className="mxd-menu__base"></div>
          
          {/* menu container */}
          <div className="mxd-menu__contain">
            <div className="mxd-menu__inner">
              {/* left side */}
              <div className="mxd-menu__left">
                <p className="mxd-menu__caption menu-fade-in">
                  🎭 Traditional arts<br/>with modern teaching
                </p>
                
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

                      {/* Additional navigation links from props */}
                      {navigationLinks.map((link, index) => (
                        <li key={index} className="main-menu__item">
                          <div className="main-menu__toggle">
                            <a 
                              href={link.url}
                              target={link.target || '_parent'}
                              className="main-menu__link btn btn-anim"
                            >
                              <span className="btn-caption">{link.label}</span>
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              </div>

              {/* right side */}
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
      <header id="header" className="mxd-header mxd-header--modern">
        <div className="mxd-header__logo loading__fade">
          <a href="/" className="mxd-logo" target="_parent">
            {logo.image ? (
              <img src={logo.image} alt="Nadanaloga Academy Logo" className="mxd-logo__image" />
            ) : (
              <svg className="mxd-logo__image" version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 56 56">
                <path className="mxd-logo__bg" d="M56,28c0,11.1-2.9,28-28,28S0,39.1,0,28S2.9,0,28,0S56,16.9,56,28z" fill="var(--base-opp)"></path>
                <path className="mxd-logo__text-path" d="M28,14c7.7,0,14,6.3,14,14s-6.3,14-14,14s-14-6.3-14-14S20.3,14,28,14z M28,18c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S33.5,18,28,18z" fill="var(--base)"></path>
              </svg>
            )}
            <span 
              className="mxd-logo__text"
              dangerouslySetInnerHTML={{ __html: logo.text }}
            />
          </a>
        </div>
        
        {/* Navigation (desktop) */}
        <nav className="mxd-header__nav loading__fade">
          <ul className="mxd-nav-list">
            <li className="mxd-nav-item">
              <a href="/" className="mxd-nav-link btn-anim" target="_parent">
                <span className="btn-caption">Home</span>
              </a>
            </li>
            <li className="mxd-nav-item">
              <a href="/courses" className="mxd-nav-link btn-anim" target="_parent">
                <span className="btn-caption">Programs</span>
              </a>
            </li>
            <li className="mxd-nav-item">
              <a href="/about" className="mxd-nav-link btn-anim" target="_parent">
                <span className="btn-caption">About</span>
              </a>
            </li>
            <li className="mxd-nav-item">
              <a href="/gallery" className="mxd-nav-link btn-anim" target="_parent">
                <span className="btn-caption">Gallery</span>
              </a>
            </li>
            <li className="mxd-nav-item">
              <a href="/contact" className="mxd-nav-link btn-anim" target="_parent">
                <span className="btn-caption">Contact</span>
              </a>
            </li>
          </ul>
        </nav>
        
        {/* Header controls */}
        <div className="mxd-header__controls loading__fade">
          <button 
            id="color-switcher" 
            className="mxd-color-switcher" 
            type="button" 
            role="switch" 
            aria-label="light/dark mode" 
            aria-checked="true"
          ></button>
          
          <a 
            className="btn btn-anim btn-default btn-mobile-icon btn-ghost slide-right-up" 
            href="/login" 
            target="_parent"
            onClick={onLoginClick}
          >
            <span className="btn-caption">Login</span>
            <i className="ph-bold ph-sign-in"></i>
          </a>
          
          <a 
            className="btn btn-anim btn-default btn-mobile-icon btn-outline slide-right-up" 
            href="/register" 
            target="_parent"
          >
            <span className="btn-caption">Enroll Now</span>
            <i className="ph-bold ph-arrow-up-right"></i>
          </a>
        </div>
        
        {/* Mobile Menu Button */}
        <button 
          className="mxd-header__mobile-toggle loading__fade" 
          type="button"
          onClick={toggleMenu}
        >
          <span className="mobile-toggle__line"></span>
          <span className="mobile-toggle__line"></span>
          <span className="mobile-toggle__line"></span>
        </button>
      </header>
    </>
  );
};

export default NavigationMenu;