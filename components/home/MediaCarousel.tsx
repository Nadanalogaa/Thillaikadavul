import React, { useState, useEffect } from 'react';

interface MediaItem {
  id: number;
  type: 'image' | 'video';
  url: string;
  title: string;
  uploadDate: Date;
}

interface MediaCarouselProps {
  mediaItems: MediaItem[];
}

const MediaCarousel: React.FC<MediaCarouselProps> = ({ mediaItems = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Sample data if no media items provided
  const sampleMedia: MediaItem[] = [
    {
      id: 1,
      type: 'image',
      url: '/api/placeholder/400/300',
      title: 'Bharatanatyam Performance',
      uploadDate: new Date('2024-12-01')
    },
    {
      id: 2,
      type: 'image', 
      url: '/api/placeholder/400/300',
      title: 'Vocal Music Class',
      uploadDate: new Date('2024-11-28')
    },
    {
      id: 3,
      type: 'image',
      url: '/api/placeholder/400/300',
      title: 'Drawing Exhibition',
      uploadDate: new Date('2024-11-25')
    },
    {
      id: 4,
      type: 'image',
      url: '/api/placeholder/400/300',
      title: 'Abacus Workshop',
      uploadDate: new Date('2024-11-20')
    }
  ];

  const displayMedia = mediaItems.length > 0 ? mediaItems : sampleMedia;

  // Auto-scroll carousel
  useEffect(() => {
    if (!isPlaying && displayMedia.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % displayMedia.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [displayMedia.length, isPlaying]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % displayMedia.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + displayMedia.length) % displayMedia.length);
  };

  if (displayMedia.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center">
        <div className="text-gray-400 text-lg">No media items available</div>
        <p className="text-gray-500 text-sm mt-2">Admin can upload videos and images here</p>
      </div>
    );
  }

  const carouselStyle = {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(199, 210, 254, 0.3)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  };

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Recent Media
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Explore our latest performances, classes, and events through photos and videos
        </p>
      </div>

      <div style={carouselStyle} className="rounded-3xl overflow-hidden">
        <div className="relative">
          {/* Main Media Display */}
          <div className="relative h-[400px] md:h-[500px] overflow-hidden">
            {displayMedia.map((item, index) => (
              <div
                key={item.id}
                className={`absolute inset-0 transition-all duration-700 ease-in-out transform ${
                  index === currentIndex 
                    ? 'opacity-100 translate-x-0' 
                    : index < currentIndex 
                      ? 'opacity-0 -translate-x-full'
                      : 'opacity-0 translate-x-full'
                }`}
              >
                {item.type === 'video' ? (
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    controls
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  />
                ) : (
                  <div className="w-full h-full relative">
                    <img
                      src={item.url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  </div>
                )}
                
                {/* Media Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-600">
                      Uploaded on {item.uploadDate.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          {displayMedia.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 backdrop-blur-sm hover:bg-white text-gray-800 rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-110"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 backdrop-blur-sm hover:bg-white text-gray-800 rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-110"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Strip */}
        {displayMedia.length > 1 && (
          <div className="bg-white/50 p-4">
            <div className="flex justify-center space-x-4 overflow-x-auto">
              {displayMedia.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => goToSlide(index)}
                  className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                    index === currentIndex 
                      ? 'border-indigo-500 shadow-lg scale-110' 
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  {item.type === 'video' ? (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                      </svg>
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dots Indicator */}
        <div className="flex justify-center pb-4">
          {displayMedia.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full mx-1 transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-indigo-600 scale-125' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MediaCarousel;