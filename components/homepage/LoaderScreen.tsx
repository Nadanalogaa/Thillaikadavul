import React, { useEffect, useState } from 'react';

interface LoaderScreenProps {
  onComplete?: () => void;
  duration?: number;
}

const LoaderScreen: React.FC<LoaderScreenProps> = ({
  onComplete,
  duration = 2000
}) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let animationFrame: number;
    let startTime: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      
      // Calculate progress (0 to 100)
      const progress = Math.min((elapsed / duration) * 100, 100);
      
      // Add some randomness to make it feel more natural
      const jitter = Math.random() * 3;
      const displayCount = Math.min(progress + jitter, 100);
      
      setCount(Math.floor(displayCount));

      if (progress < 100) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        // Loading complete
        setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 500); // Wait for fade out
        }, 200);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [duration, onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      id="loader" 
      className="loader"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.5s ease-out'
      }}
    >
      <div className="loader__wrapper">
        <div className="loader__content">
          <div className="loader__count">
            <span className="count__text">{count}</span>
            <span className="count__percent">%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoaderScreen;