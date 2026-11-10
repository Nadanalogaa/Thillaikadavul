// The course cards shown on the home page and on /courses: one list, so the
// two never drift apart. Illustrations are shown whole on a soft background;
// photos are cropped to fill.
export interface CourseCard {
  title: string;
  description: string;
  image: string;
  illustration?: boolean;
  level: string;
  features: string[];
  type: 'instrument' | 'regular';
}

export const COURSE_CARDS: CourseCard[] = [
    {
      title: 'Bharatanatyam Fundamentals',
      description: 'Learn the basic postures, hand gestures, and movements of this classical dance form',
      image: '/danceImages/responsive/large/DSC03395_DxO.webp',
      level: 'Beginner',
      features: ['Basic Adavus', 'Hand Gestures', 'Posture Training', 'Cultural Context'],
      type: 'regular' as const
    },
    {
      title: 'Advanced Bharatanatyam',
      description: 'Master complex choreographies and expressive storytelling through dance',
      image: '/danceImages/responsive/large/EGM_7524_DxO.webp',
      level: 'Advanced',
      features: ['Complex Choreography', 'Abhinaya', 'Performance Skills', 'Competition Prep'],
      type: 'regular' as const
    },
    {
      title: 'Drawing Classes',
      description: 'Develop your artistic skills through structured drawing lessons and creative expression',
      image: '/images/drawing.png',
      illustration: true,
      level: 'All Levels',
      features: ['Basic Sketching', 'Color Theory', 'Creative Expression', 'Portfolio Development'],
      type: 'regular' as const
    },
    {
      title: 'Carnatic Vocal',
      description: 'Learn classical Carnatic music: voice training, ragas and compositions',
      image: '/images/vocal.png',
      illustration: true,
      level: 'All Levels',
      features: ['Carnatic Basics', 'Ragas', 'Compositions', 'Voice Training'],
      type: 'regular' as const
    },
    {
      title: 'Semi Classical Dance',
      description: 'Graceful, expressive dance that blends classical technique with popular music',
      image: '/images/semi_classical.png',
      illustration: true,
      level: 'All Levels',
      features: ['Rhythm & Expression', 'Choreography', 'Stage Confidence', 'Fitness'],
      type: 'regular' as const
    },
    {
      title: 'Veena',
      description: 'Learn the classical veena: posture, plucking technique, ragas and compositions',
      image: '/images/veena.svg',
      illustration: true,
      level: 'All Levels',
      features: ['Basic Technique', 'Ragas & Varnams', 'Compositions', 'Performance'],
      type: 'regular' as const
    },
    {
      title: 'Violin',
      description: 'Carnatic violin from the first bow stroke to accompanying and solo playing',
      image: '/images/violin.svg',
      illustration: true,
      level: 'All Levels',
      features: ['Bowing & Posture', 'Ragas & Varnams', 'Compositions', 'Performance'],
      type: 'regular' as const
    },
    {
      title: 'Keyboard',
      description: 'Keyboard for Carnatic and light music: scales, ragas, songs and chords',
      image: '/images/keyboard.svg',
      illustration: true,
      level: 'All Levels',
      features: ['Scales & Fingering', 'Ragas & Songs', 'Chords', 'Performance'],
      type: 'regular' as const
    }
];
