import React from 'react';

interface MediaItem {
  type: 'image' | 'video' | 'youtube';
  url: string;
  title?: string;
  description?: string;
}

interface GalleryMarqueeProps {
  media: MediaItem[];
  title?: string;
  subtitle?: string;
}

const GalleryMarquee: React.FC<GalleryMarqueeProps> = ({
  media,
  title = "Our Gallery",
  subtitle = "Moments from our academy"
}) => {
  // Filter for images and ensure we have at least some content
  const galleryImages = media.filter(m => m.type === 'image');
  
  if (galleryImages.length === 0) {
    return null;
  }

  // Duplicate images for seamless marquee effect
  const extendedImages = [...galleryImages, ...galleryImages];

  return (
    <div className="mxd-section padding-pre-title">
      <div className="mxd-container no-padding-container">
        <div className="mxd-block">
          {/* Optional title section */}
          {(title || subtitle) && (
            <div className="mxd-section-title text-center mb-8">
              {subtitle && (
                <h6 className="mxd-manifest__subtitle anim-uni-in-up">
                  {subtitle}
                </h6>
              )}
              {title && (
                <h2 className="mxd-section-title__title anim-uni-in-up reveal-type">
                  {title}
                </h2>
              )}
            </div>
          )}

          {/* Image Marquee */}
          <div className="mxd-image-marquee">
            <div className="marquee marquee-left--gsap">
              <div className="marquee__toleft marquee-flex">
                {extendedImages.map((media, index) => (
                  <div key={`${media.url}-${index}`} className="marquee__item">
                    <div className="mxd-image-marquee__item">
                      <img 
                        src={media.url} 
                        alt={media.title || media.description || `Gallery image ${index + 1}`}
                        loading="lazy"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GalleryMarquee;