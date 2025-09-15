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
  const demoClassStyle = {
    background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
    boxShadow: '0 20px 40px rgba(255, 107, 53, 0.3)'
  };

  const registerStyle = {
    background: 'linear-gradient(135deg, #E91E63 0%, #AD1457 100%)',
    boxShadow: '0 20px 40px rgba(233, 30, 99, 0.3)'
  };

  const eventsStyle = {
    background: 'linear-gradient(135deg, #424242 0%, #212121 100%)',
    boxShadow: '0 20px 40px rgba(66, 66, 66, 0.3)'
  };

  const dancerImageStyle = {
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))'
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
            Nadanaloga
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Nurturing artistic talent through dedicated training in classical and contemporary arts
          </p>
        </div>

        {/* Hero Boxes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Demo Class Box */}
          <div style={demoClassStyle} className="rounded-3xl p-8 text-white relative overflow-hidden min-h-[400px] flex flex-col justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-4">It's time to Book a Demo Class</h2>
              <p className="text-lg opacity-90 mb-8 leading-relaxed">
                Discover our teaching style in a free demo. Attend at your nearest branch or online—dual time display for international students.
              </p>
            </div>
            
            {/* Dancer Image */}
            <div className="absolute right-4 top-16 w-32 h-56">
              <div style={dancerImageStyle} className="w-full h-full bg-gradient-to-b from-yellow-400 to-red-500 rounded-lg flex items-center justify-center">
                <div className="text-4xl">🕺</div>
              </div>
            </div>

            <button className="bg-white bg-opacity-20 backdrop-blur-sm text-white font-bold py-4 px-8 rounded-2xl hover:bg-opacity-30 transition-all duration-300 hover:scale-105 border border-white border-opacity-30">
              Book a Demo Class
            </button>
          </div>

          {/* Register/Login Box */}
          <div style={registerStyle} className="rounded-3xl p-8 text-white relative overflow-hidden min-h-[400px] flex flex-col justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-4">Register now and</h2>
              <p className="text-lg opacity-90 mb-8 leading-relaxed">
                Providing cheap car rental services and safe and comfortable facilities.
              </p>
            </div>

            {/* Dancer Image */}
            <div className="absolute right-4 top-16 w-32 h-56">
              <div style={dancerImageStyle} className="w-full h-full bg-gradient-to-b from-pink-400 to-purple-500 rounded-lg flex items-center justify-center">
                <div className="text-4xl">💃</div>
              </div>
            </div>

            <div className="flex gap-4">
              <Link 
                to="/register" 
                className="bg-white text-pink-600 font-bold py-3 px-6 rounded-xl hover:bg-opacity-90 transition-all duration-300 hover:scale-105 flex-1 text-center"
              >
                Register
              </Link>
              <button 
                onClick={onLoginClick}
                className="bg-black bg-opacity-30 backdrop-blur-sm text-white font-bold py-3 px-6 rounded-xl hover:bg-opacity-50 transition-all duration-300 hover:scale-105 flex-1"
              >
                Login
              </button>
            </div>
          </div>

          {/* Recent Events Box */}
          <div style={eventsStyle} className="rounded-3xl p-6 text-white relative overflow-hidden min-h-[400px] flex flex-col">
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