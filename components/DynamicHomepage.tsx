import React, { useState, useEffect } from 'react';

interface MediaItem {
    type: 'image' | 'video' | 'youtube';
    url: string;
    altText?: string;
    caption?: string;
    youtubeId?: string;
}

interface ContentBlock {
    id: string;
    sectionId: string;
    sectionType: string;
    title?: string;
    subtitle?: string;
    description?: string;
    content?: any;
    media?: MediaItem[];
    links?: Array<{
        label: string;
        url: string;
        type: 'internal' | 'external' | 'phone' | 'email';
        target?: string;
    }>;
    settings: {
        visible: boolean;
        order: number;
        className?: string;
        customStyles?: string;
    };
    seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
        ogImage?: string;
    };
}

interface HomepageData {
    content: ContentBlock[];
    settings: Record<string, any>;
}

interface DynamicHomepageProps {
    onLoginClick: () => void;
}

const DynamicHomepage: React.FC<DynamicHomepageProps> = ({ onLoginClick }) => {
    const [homepageData, setHomepageData] = useState<HomepageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHomepageData = async () => {
            try {
                const response = await fetch('/api/homepage');
                
                // Check if response is HTML (server might be returning error page)
                const contentType = response.headers.get('content-type');
                if (!response.ok || !contentType?.includes('application/json')) {
                    throw new Error(`Server returned ${response.status}: ${response.statusText || 'Invalid response format'}`);
                }
                
                const data = await response.json();
                
                // Validate that we have the expected data structure
                if (!data || !data.content || !Array.isArray(data.content)) {
                    throw new Error('Invalid homepage data structure');
                }
                
                setHomepageData(data);
                
                // Load external scripts after data is loaded
                loadExternalScripts();
                
            } catch (err) {
                console.error('Error fetching homepage data:', err);
                
                // More specific error messages
                let errorMessage = 'Unable to load homepage content';
                if (err instanceof Error) {
                    if (err.message.includes('fetch')) {
                        errorMessage = 'Server is not responding. Please check if the backend is running.';
                    } else if (err.message.includes('JSON')) {
                        errorMessage = 'Server returned invalid data format.';
                    } else {
                        errorMessage = err.message;
                    }
                }
                
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchHomepageData();
    }, []);

    const loadExternalScripts = () => {
        // Check if already loaded to prevent duplicate loading
        if (document.querySelector('link[href="/static/css/main.min.css"]')) {
            return;
        }

        // Load the same CSS files as in the static version
        const cssFiles = [
            '/static/css/loader.min.css',
            '/static/css/plugins.min.css',
            '/static/css/main.min.css',
            '/static/css/custom.css'
        ];

        cssFiles.forEach(href => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = href;
            document.head.appendChild(link);
        });

        // Load JavaScript files after a small delay to ensure CSS is loaded first
        setTimeout(() => {
            const jsFiles = [
                '/static/js/plugins.min.js',
                '/static/js/main.min.js'
            ];

            jsFiles.forEach(src => {
                if (!document.querySelector(`script[src="${src}"]`)) {
                    const script = document.createElement('script');
                    script.src = src;
                    script.async = true;
                    document.body.appendChild(script);
                }
            });

            // Initialize animations and effects after scripts load
            setTimeout(() => {
                if (window.gsap) {
                    // Reinitialize GSAP animations
                    window.gsap.fromTo('.loading__fade', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 });
                    window.gsap.fromTo('.loading__item', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1, stagger: 0.2 });
                }
            }, 500);
        }, 100);
    };

    const getContentByType = (type: string): ContentBlock | null => {
        if (!homepageData) return null;
        return homepageData.content.find(block => 
            block.sectionType === type && block.settings.visible
        ) || null;
    };

    const getContentsByType = (type: string): ContentBlock[] => {
        if (!homepageData) return [];
        return homepageData.content.filter(block => 
            block.sectionType === type && block.settings.visible
        ).sort((a, b) => a.settings.order - b.settings.order);
    };

    if (loading) {
        return (
            <>
                <link rel="stylesheet" type="text/css" href="/static/css/loader.min.css" />
                <link rel="stylesheet" type="text/css" href="/static/css/plugins.min.css" />
                <link rel="stylesheet" type="text/css" href="/static/css/main.min.css" />
                <link rel="stylesheet" type="text/css" href="/static/css/custom.css" />
                
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
                
                <script dangerouslySetInnerHTML={{
                    __html: `
                        // Simple loader animation
                        let count = 0;
                        const countElement = document.querySelector('.count__text');
                        const loader = document.getElementById('loader');
                        
                        const interval = setInterval(() => {
                            count += Math.random() * 15;
                            if (count > 100) count = 100;
                            if (countElement) countElement.textContent = Math.floor(count);
                            if (count >= 100) {
                                clearInterval(interval);
                                setTimeout(() => {
                                    if (loader) loader.style.opacity = '0';
                                    setTimeout(() => {
                                        if (loader) loader.style.display = 'none';
                                    }, 500);
                                }, 200);
                            }
                        }, 50);
                    `
                }} />
            </>
        );
    }

    if (error || !homepageData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center max-w-md mx-auto p-6">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">
                        Unable to load homepage
                    </h1>
                    <p className="text-gray-600 mb-6">
                        {error || 'Homepage data not available'}
                    </p>
                    <div className="space-y-3">
                        <button 
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 w-full"
                        >
                            Retry Loading
                        </button>
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm text-blue-800">
                                <strong>Troubleshooting:</strong> Make sure both servers are running:
                            </p>
                            <ul className="text-sm text-blue-700 mt-2 space-y-1">
                                <li>• Backend: <code className="bg-blue-100 px-1 rounded">cd server && npm start</code></li>
                                <li>• Frontend: <code className="bg-blue-100 px-1 rounded">npm run dev</code></li>
                            </ul>
                            <p className="text-xs text-blue-600 mt-2">
                                The frontend needs to proxy API calls to the backend server.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const headerData = getContentByType('header');
    const ctaData = getContentsByType('cta');
    const heroData = getContentByType('hero');
    const aboutData = getContentByType('about');
    const statisticsData = getContentsByType('statistics');
    const programsData = getContentsByType('programs');
    const servicesData = getContentsByType('services');
    const approachData = getContentByType('approach');
    const galleryData = getContentByType('gallery');
    const awardsData = getContentsByType('awards');
    const testimonialsData = getContentsByType('testimonials');
    const partnersData = getContentByType('partners');
    const blogData = getContentsByType('blog');
    const finalCtaData = getContentByType('final-cta');
    const footerData = getContentByType('footer');

    return (
        <>
            {/* Head section - Dynamic SEO */}
            <head>
                <title>{homepageData.settings.siteTitle || 'Nadanaloga Fine Arts Academy — Bharatanatyam, Vocal, Drawing, Abacus'}</title>
                <meta name="description" content={homepageData.settings.siteDescription || 'Nadanaloga Fine Arts Academy nurtures creativity and culture through Bharatanatyam, Vocal music, Drawing and Abacus training.'} />
                <meta name="keywords" content={homepageData.settings.siteKeywords || 'Nadanaloga, Fine Arts Academy, Bharatanatyam, Vocal, Drawing, Abacus'} />
            </head>

            <div className="dynamic-homepage">
                {/* Loader */}
                <div id="loader" className="loader" style={{ display: 'none' }}>
                    <div className="loader__wrapper">
                        <div className="loader__content">
                            <div className="loader__count">
                                <span className="count__text">0</span>
                                <span className="count__percent">%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Header */}
                {headerData && (
                    <header id="header" className="mxd-header mxd-header--modern">
                        <div className="mxd-header__logo loading__fade">
                            <a href="/" className="mxd-logo" target="_parent">
                                {headerData.media?.[0] ? (
                                    <img src={headerData.media[0].url} alt={headerData.media[0].altText || 'Logo'} className="mxd-logo__image" />
                                ) : (
                                    <svg className="mxd-logo__image" version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 56 56">
                                        {/* Original SVG content */}
                                        <path className="mxd-logo__bg" d="M56,28c0,11.1-2.9,28-28,28S0,39.1,0,28S2.9,0,28,0S56,16.9,56,28z" fill="var(--base-opp)"></path>
                                    </svg>
                                )}
                                <span className="mxd-logo__text">{headerData.title || 'Nadanaloga<br>Academy'}</span>
                            </a>
                        </div>
                        
                        {/* Navigation */}
                        <nav className="mxd-header__nav loading__fade">
                            <ul className="mxd-nav-list">
                                {headerData.links?.map((link, index) => (
                                    <li key={index} className="mxd-nav-item">
                                        <a 
                                            href={link.url} 
                                            className="mxd-nav-link btn-anim" 
                                            target={link.target || '_parent'}
                                        >
                                            <span className="btn-caption">{link.label}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                        
                        {/* Header controls */}
                        <div className="mxd-header__controls loading__fade">
                            <button id="color-switcher" className="mxd-color-switcher" type="button" role="switch" aria-label="light/dark mode" aria-checked="true"></button>
                            <a className="btn btn-anim btn-default btn-mobile-icon btn-ghost slide-right-up" href="/login" target="_parent">
                                <span className="btn-caption">Login</span>
                                <i className="ph-bold ph-sign-in"></i>
                            </a>
                            <a className="btn btn-anim btn-default btn-mobile-icon btn-outline slide-right-up" href="/register" target="_parent">
                                <span className="btn-caption">Enroll Now</span>
                                <i className="ph-bold ph-arrow-up-right"></i>
                            </a>
                        </div>
                        
                        {/* Mobile Menu Button */}
                        <button className="mxd-header__mobile-toggle loading__fade" type="button">
                            <span className="mobile-toggle__line"></span>
                            <span className="mobile-toggle__line"></span>
                            <span className="mobile-toggle__line"></span>
                        </button>
                    </header>
                )}

                {/* Page Content */}
                <main id="mxd-page-content" className="mxd-page-content">
                    
                    {/* CTA Section */}
                    {ctaData.length > 0 && (
                        <div className="mxd-section nad-cta loading-wrap">
                            <div className="nad-cta__wrap">
                                {ctaData.map((cta, index) => (
                                    <div key={cta.id} className="nad-cta__card loading__item">
                                        <div>
                                            <h2 className="nad-cta__title">{cta.title}</h2>
                                            <p className="nad-cta__text">{cta.description}</p>
                                        </div>
                                        <div className="nad-cta__actions nad-cta__actions--split">
                                            {cta.links?.map((link, linkIndex) => (
                                                <a 
                                                    key={linkIndex}
                                                    href={link.url} 
                                                    className={`nad-btn ${linkIndex === 0 ? 'nad-btn--primary' : 'nad-btn--ghost'}`}
                                                    target={link.target}
                                                >
                                                    <i className="ph-bold ph-calendar-check"></i>
                                                    {link.label}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Hero Section */}
                    {heroData && (
                        <div className="mxd-section mxd-hero-section mxd-hero-fullheight">
                            <div className="mxd-hero-01">
                                <div className="mxd-hero-01__wrap loading-wrap">
                                    <div className="mxd-hero-01__top">
                                        <div className="mxd-hero-01__title-wrap">
                                            {/* Hero Images */}
                                            <div className="mxd-hero-01__images mxd-floating-img">
                                                {heroData.media?.slice(0, 3).map((media, index) => (
                                                    <div key={index} className={`hero-01-image image-0${index + 1} mxd-floating-img__item loading__fade`}>
                                                        <img 
                                                            className={index === 0 ? 'mxd-pulse' : index === 1 ? 'mxd-move' : 'mxd-rotate'} 
                                                            src={media.url} 
                                                            alt={media.altText || `Hero image ${index + 1}`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {/* Hero Marquee */}
                                            <div className="mxd-hero-01__marquee loading__item">
                                                <div className="marquee marquee-right--gsap">
                                                    <div className="marquee__toright marquee-flex">
                                                        {heroData.content?.marqueeItems?.map((item: string, index: number) => (
                                                            <div key={index} className="marquee__item item-regular text">
                                                                <p>{item}</p>
                                                                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="currentColor">
                                                                    <path fill="currentColor" d="M78.4,38.4c0,0-11.8,0-15.8,0c-1.6,0-4.8-0.2-7.1-0.8c-2.3-0.6-4.3-0.8-6.3-2.4c-2-1.2-3.5-3.2-4.7-4.8c-1.2-1.6-1.6-3.6-2-5.5c-0.3-1.5-0.7-4.3-0.8-5.9c-0.2-4.3,0-17.4,0-17.4C41.8,0.8,41,0,40.2,0s-1.6,0.8-1.6,1.6c0,0,0,13.1,0,17.4c0,1.6-0.6,4.3-0.8,5.9c-0.3,2-0.8,4-2,5.5c-1.2,2-2.8,3.6-4.7,4.8s-4,1.8-6.3,2.4c-1.9,0.5-4.7,0.6-6.7,0.8c-3.9,0.4-16.6,0-16.6,0C0.8,38.4,0,39.2,0,40c0,0.8,0.8,1.6,1.6,1.6c0,0,12.2,0,16.6,0c1.6,0,4.8,0.3,6.7,0.8c2.3,0.6,4.3,0.8,6.3,2.4c1.6,1.2,3.2,2.8,4.3,4.4c1.2,2,2.1,3.9,2.4,6.3c0.2,1.7,0.7,4.7,0.8,6.7c0.2,4,0,16.2,0,16.2c0,0.8,0.8,1.6,1.6,1.6s1.6-0.8,1.6-1.6c0,0,0-12.3,0-16.2c0-1.6,0.5-5.1,0.8-6.7c0.5-2.3,0.8-4.4,2.4-6.3c1.2-1.6,2.8-3.2,4.3-4.4c2-1.2,3.9-2,6.3-2.4c1.8-0.3,5.1-0.7,7.1-0.8c3.5-0.2,15.8,0,15.8,0c0.8,0,1.6-0.8,1.6-1.6C80,39.2,79.2,38.4,78.4,38.4C78.4,38.4,78.4,38.4,78.4,38.4z"></path>
                                                                </svg>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Hero Title */}
                                        <h1 className="hero-01-title">
                                            <div className="mxd-reveal reveal-type" data-text={heroData.title}>
                                                {heroData.title}
                                            </div>
                                        </h1>
                                    </div>

                                    {/* Hero Bottom */}
                                    <div className="mxd-hero-01__bottom">
                                        <div className="mxd-hero-01__descr-wrap">
                                            <p className="hero-01-descr loading__item">
                                                {heroData.description}
                                            </p>
                                        </div>
                                        
                                        {/* Hero Links */}
                                        <div className="mxd-hero-01__links loading__item">
                                            {heroData.links?.map((link, index) => (
                                                <a 
                                                    key={index}
                                                    href={link.url} 
                                                    className="btn btn-anim btn-default btn-outline slide-right-up"
                                                    target={link.target}
                                                >
                                                    <span className="btn-caption">{link.label}</span>
                                                    <i className="ph-bold ph-arrow-up-right"></i>
                                                </a>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Hero Media - Video Background */}
                                    {heroData.media?.find(m => m.type === 'video') && (
                                        <div className="mxd-hero-01__media">
                                            <video 
                                                className="mxd-hero-01__video" 
                                                autoPlay 
                                                muted 
                                                loop
                                                poster={heroData.media.find(m => m.type === 'image')?.url}
                                            >
                                                <source src={heroData.media.find(m => m.type === 'video')?.url} type="video/mp4" />
                                            </video>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* About Section */}
                    {aboutData && (
                        <div className="mxd-section padding-hero-01 padding-pre-manifest mobile-point-subtitle">
                            <div className="mxd-container no-padding-container">
                                <div className="mxd-block">
                                    <div className="mxd-manifest">
                                        <h6 className="mxd-manifest__subtitle anim-uni-in-up">
                                            {aboutData.subtitle || 'Who we are'}
                                        </h6>
                                        <div className="mxd-manifest__text anim-uni-in-up">
                                            <p>{aboutData.description}</p>
                                        </div>
                                        {aboutData.links?.[0] && (
                                            <div className="mxd-manifest__controls anim-uni-in-up">
                                                <a 
                                                    href={aboutData.links[0].url}
                                                    className="btn btn-anim btn-default btn-outline slide-right-up"
                                                    target={aboutData.links[0].target}
                                                >
                                                    <span className="btn-caption">{aboutData.links[0].label}</span>
                                                    <i className="ph-bold ph-arrow-up-right"></i>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Statistics/Programs Section */}
                    {programsData.length > 0 && (
                        <div className="mxd-section padding-pre-stack">
                            <div className="mxd-container no-padding-container">
                                <div className="mxd-block">
                                    <div className="mxd-pinned-projects">
                                        <div className="container-fluid px-0">
                                            <div className="row gx-0">
                                                <div className="col-12 col-xl-5 mxd-pinned-projects__static">
                                                    <div className="mxd-pinned-projects__static-inner no-margin">
                                                        <div className="mxd-section-title no-margin-desktop">
                                                            <div className="container-fluid p-0">
                                                                <div className="row g-0">
                                                                    <div className="col-12 mxd-grid-item no-margin">
                                                                        <div className="mxd-section-title__title anim-uni-in-up">
                                                                            <h2 className="reveal-type">Our<br />Programs</h2>
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-12 mxd-grid-item no-margin">
                                                                        <div className="mxd-section-title__descr anim-uni-in-up">
                                                                            <p>Explore courses that blend tradition<br />with engaging, modern teaching</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-12 mxd-grid-item no-margin">
                                                                        <div className="mxd-section-title__controls anim-uni-in-up">
                                                                            <a className="btn btn-anim btn-default btn-outline slide-right-up" href="/gallery" target="_parent">
                                                                                <span className="btn-caption">All Programs</span>
                                                                                <i className="ph-bold ph-arrow-up-right"></i>
                                                                            </a>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-12 col-xl-7 mxd-pinned-projects__scroll">
                                                    <div className="mxd-pinned-projects__scroll-inner mxd-grid-item no-margin">
                                                        {programsData.map((program, index) => (
                                                            <div key={program.id} className="mxd-project-item">
                                                                <a className="mxd-project-item__media anim-uni-in-up" href="/gallery" target="_parent">
                                                                    <div 
                                                                        className="mxd-project-item__preview preview-image-1 parallax-img-small" 
                                                                        style={{
                                                                            backgroundImage: `url('${program.media?.[0]?.url || '/images/placeholder.png'}')`,
                                                                            backgroundSize: 'cover',
                                                                            backgroundPosition: 'center'
                                                                        }}
                                                                    ></div>
                                                                    <div className="mxd-project-item__tags">
                                                                        {program.content?.programs?.[0]?.tags?.map((tag: string, tagIndex: number) => (
                                                                            <span key={tagIndex} className="tag tag-default tag-permanent">{tag}</span>
                                                                        ))}
                                                                    </div>
                                                                </a>
                                                                <div className="mxd-project-item__promo">
                                                                    <h3 className="mxd-project-item__title anim-uni-in-up">
                                                                        <a href="/gallery" target="_parent">{program.title}</a>
                                                                    </h3>
                                                                    <p className="mxd-project-item__descr anim-uni-in-up">
                                                                        {program.description}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Gallery Section */}
                    {galleryData && galleryData.media && galleryData.media.length > 0 && (
                        <div className="mxd-section padding-pre-title">
                            <div className="mxd-container no-padding-container">
                                <div className="mxd-block">
                                    <div className="mxd-image-marquee">
                                        <div className="marquee marquee-left--gsap">
                                            <div className="marquee__toleft marquee-flex">
                                                {galleryData.media.map((media, index) => (
                                                    <div key={index} className="marquee__item">
                                                        <div className="mxd-image-marquee__item">
                                                            <img src={media.url} alt={media.altText || `Gallery image ${index + 1}`} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Final CTA Section */}
                    {finalCtaData && (
                        <div className="mxd-section overflow-hidden">
                            <div className="mxd-container no-padding-container">
                                <div className="mxd-block">
                                    <div className="mxd-cta-block">
                                        <div className="mxd-cta-block__content">
                                            <h2 className="mxd-cta-block__title anim-uni-in-up">
                                                {finalCtaData.title || "Let's talk about your project!"}
                                            </h2>
                                            {finalCtaData.links?.[0] && (
                                                <div className="mxd-cta-block__controls anim-uni-in-up">
                                                    <a 
                                                        href={finalCtaData.links[0].url}
                                                        className="btn btn-anim btn-default btn-outline slide-right-up"
                                                        target={finalCtaData.links[0].target}
                                                    >
                                                        <span className="btn-caption">{finalCtaData.links[0].label}</span>
                                                        <i className="ph-bold ph-arrow-up-right"></i>
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                </main>

                {/* Footer */}
                {footerData && (
                    <footer className="mxd-footer">
                        <div className="mxd-container">
                            <div className="mxd-footer__content">
                                <p>{footerData.content?.copyright || '© 2024 Nadanaloga Fine Arts Academy'}</p>
                                {footerData.links && (
                                    <div className="mxd-footer__links">
                                        {footerData.links.map((link, index) => (
                                            <a 
                                                key={index}
                                                href={link.url}
                                                target={link.target}
                                                className="mxd-footer__link"
                                            >
                                                {link.label}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </footer>
                )}
            </div>
        </>
    );
};

export default DynamicHomepage;