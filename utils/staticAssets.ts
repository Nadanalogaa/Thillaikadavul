/**
 * Utility functions for loading static CSS and JS assets from /static folder
 * This ensures the native React component has the same styling and animations as the iframe
 */

export interface AssetLoadingOptions {
  forceReload?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Load CSS files from /static/css/ folder
 */
export const loadStaticCSS = (options: AssetLoadingOptions = {}) => {
  const cssFiles = [
    '/static/css/loader.min.css',
    '/static/css/plugins.min.css', 
    '/static/css/main.min.css'
  ];

  let loadedCount = 0;
  const totalFiles = cssFiles.length;

  cssFiles.forEach(href => {
    // Check if already loaded unless force reload
    if (!options.forceReload && document.querySelector(`link[href="${href}"]`)) {
      loadedCount++;
      if (loadedCount === totalFiles && options.onLoad) {
        options.onLoad();
      }
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = href;
    
    link.onload = () => {
      loadedCount++;
      if (loadedCount === totalFiles && options.onLoad) {
        options.onLoad();
      }
    };
    
    link.onerror = () => {
      if (options.onError) {
        options.onError(new Error(`Failed to load CSS: ${href}`));
      }
    };
    
    document.head.appendChild(link);
  });
};

/**
 * Load JavaScript files from /static/js/ folder
 */
export const loadStaticJS = (options: AssetLoadingOptions = {}) => {
  // Only load libs.min.js for GSAP - skip app.min.js to avoid conflicts
  const jsFiles = [
    '/static/js/libs.min.js'   // Load only GSAP and essential libraries
  ];

  let loadedCount = 0;
  const totalFiles = jsFiles.length;

  const loadScript = (src: string, index: number) => {
    // Check if already loaded unless force reload
    if (!options.forceReload && document.querySelector(`script[src="${src}"]`)) {
      loadedCount++;
      if (loadedCount === totalFiles && options.onLoad) {
        options.onLoad();
      }
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false; // Ensure scripts load in order
    
    script.onload = () => {
      loadedCount++;
      
      // Load next script or call onLoad when all done
      if (index < jsFiles.length - 1) {
        loadScript(jsFiles[index + 1], index + 1);
      } else if (options.onLoad) {
        options.onLoad();
      }
    };
    
    script.onerror = () => {
      if (options.onError) {
        options.onError(new Error(`Failed to load JS: ${src}`));
      }
    };
    
    document.body.appendChild(script);
  };

  // Start loading from first script
  loadScript(jsFiles[0], 0);
};

/**
 * Initialize animations and effects after scripts are loaded
 * This replicates the initialization that happens in the static template
 */
export const initializeStaticEffects = () => {
  // Wait for DOM to be ready and React components to be mounted
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initEffects, 500); // Increased delay for React mounting
    });
  } else {
    setTimeout(initEffects, 500); // Increased delay for React mounting
  }
};

const initEffects = () => {
  // Check if GSAP is available
  if (typeof window !== 'undefined' && (window as any).gsap) {
    const gsap = (window as any).gsap;
    
    // Wait for React components to mount before initializing animations
    const checkAndInitialize = () => {
      const loadingFadeElements = document.querySelectorAll('.loading__fade');
      const loadingItemElements = document.querySelectorAll('.loading__item');
      
      // Only initialize if elements exist
      if (loadingFadeElements.length > 0) {
        gsap.fromTo('.loading__fade', 
          { opacity: 0, y: 30 }, 
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 }
        );
      }
      
      if (loadingItemElements.length > 0) {
        gsap.fromTo('.loading__item', 
          { opacity: 0, y: 50 }, 
          { opacity: 1, y: 0, duration: 1, stagger: 0.2 }
        );
      }

      // Initialize other effects
      initParallaxEffects();
      initMarqueeAnimations();
      initHeroAnimations();
    };

    // Check if elements exist, if not wait a bit more
    const loadingFadeExists = document.querySelectorAll('.loading__fade').length > 0;
    if (loadingFadeExists) {
      checkAndInitialize();
    } else {
      // Retry after React components have mounted
      setTimeout(checkAndInitialize, 1000);
    }
  }

  // Initialize other effects that don't depend on GSAP
  initScrollEffects();
  initResponsiveBehavior();
};

const initParallaxEffects = () => {
  if (typeof window !== 'undefined' && (window as any).gsap) {
    const gsap = (window as any).gsap;
    const ScrollTrigger = (window as any).ScrollTrigger;
    
    if (ScrollTrigger) {
      // Parallax for hero images
      gsap.utils.toArray('.parallax-img-small').forEach((img: any) => {
        gsap.to(img, {
          yPercent: -50,
          ease: "none",
          scrollTrigger: {
            trigger: img,
            start: "top bottom",
            end: "bottom top",
            scrub: true
          }
        });
      });

      // Floating animations for hero images
      gsap.utils.toArray('.mxd-floating-img__item').forEach((item: any, index: number) => {
        gsap.to(item, {
          y: `${-20 - (index * 10)}`,
          duration: 2 + (index * 0.5),
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1
        });
      });
    }
  }
};

const initMarqueeAnimations = () => {
  if (typeof window !== 'undefined' && (window as any).gsap) {
    const gsap = (window as any).gsap;
    
    // Marquee animations - right to left
    gsap.utils.toArray('.marquee-right--gsap .marquee__toright').forEach((marquee: any) => {
      gsap.to(marquee, {
        xPercent: -100,
        duration: 20,
        ease: "none",
        repeat: -1
      });
    });

    // Marquee animations - left to right  
    gsap.utils.toArray('.marquee-left--gsap .marquee__toleft').forEach((marquee: any) => {
      gsap.to(marquee, {
        xPercent: 100,
        duration: 25,
        ease: "none",
        repeat: -1
      });
    });
  }
};

const initHeroAnimations = () => {
  if (typeof window !== 'undefined' && (window as any).gsap) {
    const gsap = (window as any).gsap;
    
    // Hero title reveal animation
    gsap.utils.toArray('.reveal-type').forEach((element: any) => {
      gsap.fromTo(element,
        { y: 100, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: element,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });

    // Universal scroll animations
    gsap.utils.toArray('.anim-uni-in-up').forEach((element: any) => {
      gsap.fromTo(element,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: element,
            start: "top 85%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });
  }
};

const initScrollEffects = () => {
  // Smooth scroll behavior (if not handled by Lenis)
  if (typeof window !== 'undefined' && !(window as any).Lenis) {
    document.documentElement.style.scrollBehavior = 'smooth';
  }
};

const initResponsiveBehavior = () => {
  // Handle responsive navigation and mobile interactions
  const handleResize = () => {
    // Mobile menu toggle logic would go here
    // This replicates mobile responsive behavior from the static template
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
    handleResize(); // Call initially
  }
};

/**
 * Cleanup function to remove event listeners and animations
 */
export const cleanupStaticEffects = () => {
  if (typeof window !== 'undefined' && (window as any).gsap) {
    const ScrollTrigger = (window as any).ScrollTrigger;
    if (ScrollTrigger) {
      ScrollTrigger.killAll();
    }
  }
};

/**
 * Complete asset loading and initialization
 */
export const loadAllStaticAssets = (options: AssetLoadingOptions = {}) => {
  let cssLoaded = false;
  let jsLoaded = false;

  const checkComplete = () => {
    if (cssLoaded && jsLoaded) {
      initializeStaticEffects();
      if (options.onLoad) {
        options.onLoad();
      }
    }
  };

  loadStaticCSS({
    ...options,
    onLoad: () => {
      cssLoaded = true;
      checkComplete();
    }
  });

  loadStaticJS({
    ...options,
    onLoad: () => {
      jsLoaded = true;
      checkComplete();
    }
  });
};