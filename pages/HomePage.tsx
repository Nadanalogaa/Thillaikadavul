

import React, { useState, useEffect } from 'react';
import HeroBoxes from '../components/home/HeroBoxes';
import MediaCarousel from '../components/home/MediaCarousel';
import AboutSection from '../components/home/AboutSection';
import TestimonialsSection from '../components/home/TestimonialsSection';
import ContactSection from '../components/home/ContactSection';
import CoursesSection from '../components/home/CoursesSection';
import { getPublicEvents, getMediaItems } from '../api';
import type { MediaItem } from '../types';

interface HomePageProps {
  onLoginClick: () => void;
}

interface Event {
  id: number;
  title: string;
  description: string;
  date: Date;
  time: string;
  isPublic: boolean;
  createdAt: Date;
}

const HomePage: React.FC<HomePageProps> = ({ onLoginClick }) => {
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    // Load recent public events
    const loadRecentEvents = async () => {
      try {
        const events = await getPublicEvents();
        const publicEvents = events
          .filter((event: Event) => event.isPublic)
          .sort((a: Event, b: Event) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map((event: Event) => ({
            id: event.id,
            title: event.title,
            description: event.description,
            postedDate: new Date(event.createdAt)
          }));
        
        setRecentEvents(publicEvents);
      } catch (error) {
        console.error('Error loading recent events:', error);
        // Fallback sample events
        setRecentEvents([
          {
            id: 1,
            title: 'Online Dance Competition',
            description: 'Annual classical dance competition',
            postedDate: new Date('2024-08-21')
          },
          {
            id: 2,
            title: 'Vocal Music Recital',
            description: 'Students showcase their vocal talents',
            postedDate: new Date('2024-08-20')
          },
          {
            id: 3,
            title: 'Art Exhibition Opening',
            description: 'Display of student artwork',
            postedDate: new Date('2024-08-19')
          }
        ]);
      }
    };

    // Load media items (will be implemented with admin upload functionality)
    const loadMediaItems = async () => {
      try {
        const items = await getMediaItems();
        setMediaItems(items);
      } catch (error) {
        console.error('Error loading media items:', error);
        setMediaItems([]);
      }
    };

    loadRecentEvents();
    loadMediaItems();
  }, []);

  return (
    <div>
      {/* Hero Boxes Section */}
      <HeroBoxes onLoginClick={onLoginClick} recentEvents={recentEvents} />
      
      {/* Media Carousel Section */}
      <MediaCarousel mediaItems={mediaItems} />
      
      {/* Existing Sections with updated styling */}
      <div className="bg-gradient-to-br from-gray-50 to-indigo-50">
        <div className="space-y-16 md:space-y-24 py-16 md:py-24">
          <AboutSection />
          <CoursesSection />
          <TestimonialsSection />
          <ContactSection />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
