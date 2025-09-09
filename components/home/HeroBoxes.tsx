import React from 'react';
import { Link } from 'react-router-dom';

interface HeroBoxesProps {
  onLoginClick: () => void;
  recentEvents: Array<{
    id: number;
    title: string;
    description: string;
    postedDate: Date;
  }>;
}

const HeroBoxes: React.FC<HeroBoxesProps> = ({ onLoginClick, recentEvents }) => {
  // Align with the current indigo/purple theme
  const demoClassStyle = {
    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    boxShadow: '0 20px 40px rgba(79, 70, 229, 0.28)'
  };

  const registerStyle = {
    background: 'linear-gradient(135deg, #7C3AED 0%, #4338CA 100%)',
    boxShadow: '0 20px 40px rgba(67, 56, 202, 0.28)'
  };

  const eventsStyle = {
    background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)',
    boxShadow: '0 20px 40px rgba(17, 24, 39, 0.35)'
  };

  const dancerImageStyle = {
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.25))'
  };

  const handleBookDemoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById('contact');
    if (!el) return;
    const headerOffset = 72; // approximate sticky header height
    const rect = el.getBoundingClientRect();
    const offsetTop = window.pageYOffset + rect.top - headerOffset;
    window.scrollTo({ top: offsetTop, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-orange-200 to-pink-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-br from-purple-200 to-indigo-200 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="relative container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Thillaikadavul
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Nurturing artistic talent through dedicated training in classical and contemporary arts
          </p>
        </div>

        {/* Hero Boxes Grid: focus on Demo + Register/Login; events below */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Demo Class Box */}
          <div style={demoClassStyle} className="rounded-3xl p-8 text-white overflow-hidden min-h-[320px]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
              {/* Text/CTA - first on mobile */}
              <div className="sm:col-span-2 order-1">
                <h2 className="text-3xl font-bold mb-3">Book a Demo Class</h2>
                <p className="text-base md:text-lg opacity-90 mb-6 leading-relaxed">
                  Experience our teaching style with a free demo. Choose your nearest branch or join online.
                </p>
                <a href="#contact" onClick={handleBookDemoClick} className="inline-block bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 border border-white/30">
                  Book a Demo
                </a>
              </div>
              {/* Animated visual - right on desktop, below on mobile */}
              <div className="order-2 sm:order-none justify-self-end">
                <div style={dancerImageStyle} className="w-28 h-44 sm:w-32 sm:h-52 bg-gradient-to-b from-indigo-200 to-purple-300 rounded-xl flex items-center justify-center">
                  <div className="text-4xl">🕺</div>
                </div>
              </div>
            </div>
          </div>

          {/* Register/Login Box */}
          <div style={registerStyle} className="rounded-3xl p-8 text-white overflow-hidden min-h-[320px]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
              {/* Text/CTA - first on mobile */}
              <div className="sm:col-span-2 order-1">
                <h2 className="text-3xl font-bold mb-3">Register or Login</h2>
                <p className="text-base md:text-lg opacity-90 mb-6 leading-relaxed">
                  Create your account to register for courses or sign in to continue your journey.
                </p>
                <div className="flex gap-4">
                  <Link 
                    to="/register" 
                    className="bg-white text-indigo-700 font-semibold py-3 px-6 rounded-xl hover:bg-white/90 transition-all duration-300 text-center"
                  >
                    Register
                  </Link>
                  <button 
                    onClick={onLoginClick}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 border border-white/30"
                  >
                    Login
                  </button>
                </div>
              </div>
              {/* Animated visual - right on desktop, below on mobile */}
              <div className="order-2 sm:order-none justify-self-end">
                <div style={dancerImageStyle} className="w-28 h-44 sm:w-32 sm:h-52 bg-gradient-to-b from-purple-200 to-indigo-300 rounded-xl flex items-center justify-center">
                  <div className="text-4xl">💃</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Events Box (placed below for a cleaner above-the-fold) */}
          <div style={eventsStyle} className="rounded-3xl p-6 text-white overflow-hidden min-h-[320px] flex flex-col lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Recent Events</h2>
              <div className="text-right">
                <div className="text-sm opacity-75">Posted Date</div>
                <div className="text-xs opacity-60">21Aug2025</div>
              </div>
            </div>

            <div className="flex-1 space-y-4 mb-6">
              {recentEvents.slice(0, 3).map((event, index) => (
                <div key={event.id} className="border-b border-gray-600 pb-3 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm leading-tight">{event.title}</h3>
                      <p className="text-xs opacity-75 mt-1">
                        Last Date: {event.postedDate.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-xs opacity-75">Posted Date</div>
                      <div className="text-xs">{event.postedDate.toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Link 
              to="/events" 
              className="bg-white bg-opacity-20 backdrop-blur-sm text-white font-bold py-3 px-6 rounded-xl hover:bg-opacity-30 transition-all duration-300 hover:scale-105 text-center border border-white border-opacity-30"
            >
              View all
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroBoxes;
