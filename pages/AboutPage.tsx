
import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="nad-content">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl">About Nadanaloga</h1>
        <p className="mt-6 leading-8 nad-muted">
          Nadanaloga is more than just an arts school; it's a sanctuary for creativity, culture, and personal growth. Our mission is to preserve and promote traditional art forms while adapting to contemporary learning methods.
        </p>
      </div>

      <div className="mt-12">
        <img 
          src="https://placehold.co/1200x600/e8eaf6/1a237e?text=Our+Studio" 
          alt="Nadanaloga Studio" 
          className="aspect-[2/1] w-full rounded-2xl object-cover shadow-lg"
        />
      </div>

      <div className="mt-16 grid gap-12 md:grid-cols-2">
        <div>
          <h2 className="text-xl">Our Vision</h2>
          <p className="mt-4 nad-muted">
            We envision a world where art is an integral part of everyone's life, fostering discipline, joy, and a deep connection to culture. We strive to be a leading institution where students of all ages can discover their passion and unlock their potential under the guidance of world-class instructors.
          </p>
        </div>
        <div>
          <h2 className="text-xl">Our Approach</h2>
          <p className="mt-4 nad-muted">
            Our curriculum is built on a foundation of authentic traditions, ensuring that students receive a comprehensive education in their chosen art form. We blend time-honored techniques with modern pedagogical tools, offering both in-person and online classes to provide a flexible and enriching learning experience for our global community of students.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
