import { useState, useEffect } from 'react';

interface MediaItem {
  type: 'image' | 'video' | 'youtube';
  url: string;
  title?: string;
  description?: string;
}

interface Program {
  id: string;
  title: string;
  description: string;
  image?: string;
  tags?: string[];
  link?: string;
}

interface HomepageData {
  hero: {
    title: string;
    description: string;
    media: MediaItem[];
    marqueeItems: string[];
    links: Array<{
      label: string;
      url: string;
      target?: string;
    }>;
  };
  about: {
    title?: string;
    subtitle?: string;
    description: string;
    link?: {
      label: string;
      url: string;
      target?: string;
    };
  };
  programs: Program[];
  gallery: {
    media: MediaItem[];
    title?: string;
    subtitle?: string;
  };
  cta: Array<{
    title: string;
    description?: string;
    links: Array<{
      label: string;
      url: string;
      target?: string;
      type?: 'primary' | 'secondary' | 'ghost';
    }>;
  }>;
  navigation: {
    logo?: {
      image?: string;
      text: string;
    };
    links: Array<{
      label: string;
      url: string;
      target?: string;
    }>;
  };
}

export const useHomepageData = () => {
  const [data, setData] = useState<HomepageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHomepageData = async () => {
      try {
        setLoading(true);
        setError(null);

        let mediaItems: MediaItem[] = [];
        let courses = [];

        // Try to fetch data from API, but fall back to static data if it fails
        try {
          const mediaResponse = await fetch('/api/media-items');
          const contentType = mediaResponse.headers.get('content-type');
          
          if (mediaResponse.ok && contentType?.includes('application/json')) {
            mediaItems = await mediaResponse.json();
          } else {
            throw new Error('API returned HTML instead of JSON - using fallback data');
          }
        } catch (error) {
          console.log('Using fallback media data:', error);
          // Use fallback media data
          mediaItems = createFallbackMediaItems();
        }

        try {
          const coursesResponse = await fetch('/api/courses');
          const contentType = coursesResponse.headers.get('content-type');
          
          if (coursesResponse.ok && contentType?.includes('application/json')) {
            courses = await coursesResponse.json();
          } else {
            throw new Error('API returned HTML instead of JSON - using fallback data');
          }
        } catch (error) {
          console.log('Using fallback courses data:', error);
          // Use fallback courses data
          courses = createFallbackCourses();
        }

        // Transform courses into programs format
        const programs: Program[] = courses.map((course: any) => ({
          id: course.id,
          title: course.name,
          description: course.description || 'Discover the art and beauty of this traditional form',
          image: course.image || course.icon_url || `/static/images/courses/${course.name.toLowerCase()}.webp`,
          tags: [course.name, 'Traditional', 'Fine Arts'],
          link: `/courses/${course.name.toLowerCase()}`
        }));

        // Separate media by type for different sections
        const heroImages = mediaItems.filter(m => m.type === 'image').slice(0, 3);
        const heroVideo = mediaItems.find(m => m.type === 'video');
        const galleryImages = mediaItems.filter(m => m.type === 'image');

        // Build homepage data structure
        const homepageData: HomepageData = {
          hero: {
            title: "Nadanaloga<br>Fine Arts Academy",
            description: "Where tradition meets innovation. Discover the beauty of Bharatanatyam, vocal music, drawing, and abacus through expert guidance and personalized learning.",
            media: [
              ...heroImages,
              ...(heroVideo ? [heroVideo] : [])
            ],
            marqueeItems: [
              "Traditional Arts",
              "Expert Teachers", 
              "Personalized Learning",
              "Cultural Heritage",
              "Modern Methods"
            ],
            links: [
              {
                label: "Explore Programs",
                url: "/courses",
                target: "_parent"
              },
              {
                label: "Watch Demo",
                url: "/demo",
                target: "_parent"
              }
            ]
          },
          about: {
            subtitle: "Who we are",
            description: "Nadanaloga Fine Arts Academy is dedicated to preserving and teaching traditional Indian arts through innovative teaching methods. Our experienced instructors guide students of all ages in discovering their artistic potential while honoring cultural heritage.",
            link: {
              label: "Learn More About Us",
              url: "/about",
              target: "_parent"
            }
          },
          programs: programs.slice(0, 4), // Show top 4 programs
          gallery: {
            media: galleryImages,
            title: "Our Gallery",
            subtitle: "Moments from our academy"
          },
          cta: [
            {
              title: "Ready to begin your artistic journey?",
              description: "Join thousands of students who have discovered their passion for traditional arts with us.",
              links: [
                {
                  label: "Enroll Now",
                  url: "/register",
                  target: "_parent",
                  type: "primary"
                },
                {
                  label: "Contact Us",
                  url: "/contact",
                  target: "_parent",
                  type: "secondary"
                }
              ]
            }
          ],
          navigation: {
            logo: {
              text: "Nadanaloga<br>Academy"
            },
            links: [
              {
                label: "About",
                url: "/about",
                target: "_parent"
              },
              {
                label: "Contact",
                url: "/contact", 
                target: "_parent"
              }
            ]
          }
        };

        setData(homepageData);
      } catch (err) {
        console.error('Error fetching homepage data:', err);
        console.log('Using complete fallback data');
        
        // Always use fallback data in production if API fails
        setData(createFallbackData());
      } finally {
        setLoading(false);
      }
    };

    fetchHomepageData();
  }, []);

  return { data, loading, error, refetch: () => window.location.reload() };
};

// Helper functions for fallback data
const createFallbackMediaItems = (): MediaItem[] => [
  {
    type: 'image',
    url: '/static/images/01_hero-img.webp',
    title: 'Bharatanatyam Performance',
    description: 'Traditional dance performance'
  },
  {
    type: 'image',
    url: '/static/images/02_hero-img.webp', 
    title: 'Vocal Music Class',
    description: 'Students learning Carnatic music'
  },
  {
    type: 'image',
    url: '/static/images/03_hero-img.webp',
    title: 'Drawing Session',
    description: 'Art class in progress'
  },
  {
    type: 'video',
    url: '/static/media/540x310_video-01.mp4',
    title: 'Academy Overview',
    description: 'Welcome to our academy'
  },
  // Gallery images for marquee
  {
    type: 'image',
    url: '/static/images/1200x1000_marquee-01.webp',
    title: 'Student Performance 1',
    description: 'Annual day celebration'
  },
  {
    type: 'image', 
    url: '/static/images/1200x1000_marquee-02.webp',
    title: 'Student Performance 2',
    description: 'Dance recital'
  },
  {
    type: 'image',
    url: '/static/images/1200x1000_marquee-03.webp',
    title: 'Student Performance 3', 
    description: 'Music concert'
  },
  {
    type: 'image',
    url: '/static/images/1200x1000_marquee-04.webp',
    title: 'Student Performance 4',
    description: 'Art exhibition'
  },
  {
    type: 'image',
    url: '/static/images/1200x1000_marquee-05.webp',
    title: 'Student Performance 5',
    description: 'Cultural program'
  },
  {
    type: 'image',
    url: '/static/images/1200x1000_marquee-06.webp',
    title: 'Student Performance 6',
    description: 'Traditional ceremony'
  },
  {
    type: 'image',
    url: '/static/images/1200x1000_marquee-07.webp',
    title: 'Student Performance 7',
    description: 'Workshop session'
  },
  {
    type: 'image',
    url: '/static/images/1200x1000_marquee-08.webp',
    title: 'Student Performance 8',
    description: 'Special event'
  }
];

const createFallbackCourses = () => [
  {
    id: '1',
    name: 'Bharatanatyam',
    description: 'Explore the divine art of classical Indian dance with graceful movements and expressive storytelling',
    icon: 'Bharatanatyam',
    image: '/static/images/1000x1000_ser-01.webp',
    icon_url: null
  },
  {
    id: '2',
    name: 'Vocal',
    description: 'Develop your voice with traditional Carnatic vocal music techniques and classical compositions',
    icon: 'Vocal',
    image: '/static/images/1000x1000_ser-02.webp',
    icon_url: null
  },
  {
    id: '3',
    name: 'Drawing',
    description: 'Learn to express creativity through various drawing techniques and artistic mediums',
    icon: 'Drawing',
    image: '/static/images/1000x1000_ser-03.webp',
    icon_url: null
  },
  {
    id: '4',
    name: 'Abacus',
    description: 'Master mental arithmetic and boost mathematical skills with traditional abacus methods',
    icon: 'Abacus',
    image: '/static/images/1000x1000_ser-04.webp',
    icon_url: null
  }
];

// Fallback data for development/error states
const createFallbackData = (): HomepageData => ({
  hero: {
    title: "Nadanaloga<br>Fine Arts Academy",
    description: "Where tradition meets innovation. Discover the beauty of Bharatanatyam, vocal music, drawing, and abacus through expert guidance and personalized learning.",
    media: [
      {
        type: 'image',
        url: '/static/images/01_hero-img.webp',
        title: 'Hero Image 1'
      },
      {
        type: 'image', 
        url: '/static/images/02_hero-img.webp',
        title: 'Hero Image 2'
      },
      {
        type: 'image',
        url: '/static/images/03_hero-img.webp', 
        title: 'Hero Image 3'
      },
      {
        type: 'video',
        url: '/static/media/540x310_video-01.mp4',
        title: 'Hero Video'
      }
    ],
    marqueeItems: [
      "Traditional Arts",
      "Expert Teachers",
      "Personalized Learning", 
      "Cultural Heritage",
      "Modern Methods"
    ],
    links: [
      {
        label: "Explore Programs",
        url: "/courses",
        target: "_parent"
      },
      {
        label: "Watch Demo",
        url: "/demo",
        target: "_parent"
      }
    ]
  },
  about: {
    subtitle: "Who we are",
    description: "Nadanaloga Fine Arts Academy is dedicated to preserving and teaching traditional Indian arts through innovative teaching methods. Our experienced instructors guide students of all ages in discovering their artistic potential while honoring cultural heritage.",
    link: {
      label: "Learn More About Us",
      url: "/about",
      target: "_parent"
    }
  },
  programs: [
    {
      id: '1',
      title: 'Bharatanatyam',
      description: 'Explore the divine art of classical Indian dance with graceful movements and expressive storytelling',
      image: '/static/images/1000x1000_ser-01.webp',
      tags: ['Dance', 'Classical', 'Traditional'],
      link: '/courses/bharatanatyam'
    },
    {
      id: '2', 
      title: 'Vocal Music',
      description: 'Develop your voice with traditional Carnatic vocal music techniques and classical compositions',
      image: '/static/images/1000x1000_ser-02.webp',
      tags: ['Music', 'Vocal', 'Carnatic'],
      link: '/courses/vocal'
    },
    {
      id: '3',
      title: 'Drawing',
      description: 'Learn to express creativity through various drawing techniques and artistic mediums',
      image: '/static/images/1000x1000_ser-03.webp', 
      tags: ['Art', 'Drawing', 'Creative'],
      link: '/courses/drawing'
    },
    {
      id: '4',
      title: 'Abacus',
      description: 'Master mental arithmetic and boost mathematical skills with traditional abacus methods',
      image: '/static/images/1000x1000_ser-04.webp',
      tags: ['Math', 'Abacus', 'Mental'],
      link: '/courses/abacus'
    }
  ],
  gallery: {
    media: [
      {
        type: 'image',
        url: '/static/images/1200x1000_marquee-01.webp',
        title: 'Gallery Image 1'
      },
      {
        type: 'image',
        url: '/static/images/1200x1000_marquee-02.webp',
        title: 'Gallery Image 2'
      },
      {
        type: 'image',
        url: '/static/images/1200x1000_marquee-03.webp',
        title: 'Gallery Image 3'
      },
      {
        type: 'image',
        url: '/static/images/1200x1000_marquee-04.webp',
        title: 'Gallery Image 4'
      },
      {
        type: 'image',
        url: '/static/images/1200x1000_marquee-05.webp',
        title: 'Gallery Image 5'
      }
    ],
    title: "Our Gallery",
    subtitle: "Moments from our academy"
  },
  cta: [
    {
      title: "Ready to begin your artistic journey?",
      description: "Join thousands of students who have discovered their passion for traditional arts with us.",
      links: [
        {
          label: "Enroll Now",
          url: "/register",
          target: "_parent",
          type: "primary"
        },
        {
          label: "Contact Us", 
          url: "/contact",
          target: "_parent",
          type: "secondary"
        }
      ]
    }
  ],
  navigation: {
    logo: {
      text: "Nadanaloga<br>Academy"
    },
    links: [
      {
        label: "About",
        url: "/about",
        target: "_parent"
      },
      {
        label: "Contact",
        url: "/contact",
        target: "_parent"
      }
    ]
  }
});