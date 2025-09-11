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

        // Fetch media items from PostgreSQL
        const mediaResponse = await fetch('/api/media-items');
        if (!mediaResponse.ok) {
          throw new Error('Failed to fetch media items');
        }
        const mediaItems: MediaItem[] = await mediaResponse.json();

        // Fetch courses for programs section
        const coursesResponse = await fetch('/api/courses');
        if (!coursesResponse.ok) {
          throw new Error('Failed to fetch courses');
        }
        const courses = await coursesResponse.json();

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
        setError(err instanceof Error ? err.message : 'Failed to load homepage data');
        
        // Fallback data for development
        setData(createFallbackData());
      } finally {
        setLoading(false);
      }
    };

    fetchHomepageData();
  }, []);

  return { data, loading, error, refetch: () => fetchHomepageData() };
};

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