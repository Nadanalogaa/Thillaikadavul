import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Users, Heart, Star, Award, MapPin, Phone, Calendar, BookOpen, Music, Palette, Calculator, Lightbulb, Activity } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const AboutPage: React.FC = () => {
  const { theme } = useTheme();

  const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [storyRef, storyInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [coursesRef, coursesInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [guruRef, guruInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [joinRef, joinInView] = useInView({ threshold: 0.1, triggerOnce: true });

  const courses = [
    { icon: Users, name: 'Bharatanatyam', description: 'Learn the beauty and discipline of this classical dance form', color: 'from-purple-500 to-pink-500' },
    { icon: Music, name: 'Carnatic Vocal', description: 'Train your voice in South Indian classical music', color: 'from-blue-500 to-indigo-500' },
    { icon: Heart, name: 'Semi-Classical Dance', description: 'A lively mix of classical and modern styles', color: 'from-pink-500 to-rose-500' },
    { icon: Palette, name: 'Drawing', description: 'Build your creativity and artistic expression', color: 'from-green-500 to-teal-500' },
    { icon: Music, name: 'Keyboard', description: 'From basics to advanced tunes, learn step by step', color: 'from-yellow-500 to-orange-500' },
    { icon: Calculator, name: 'Abacus', description: 'Improve mental maths and focus with fun learning', color: 'from-red-500 to-pink-500' },
    { icon: Lightbulb, name: 'Phoenix', description: 'Develop creative thinking and problem-solving skills', color: 'from-indigo-500 to-purple-500' },
    { icon: Activity, name: 'Yoga', description: 'Balance mind and body with guided yoga practices', color: 'from-emerald-500 to-green-500' }
  ];

  const locations = [
    { city: 'Chennai', areas: 'Sembakkam & Mambakkam' },
    { city: 'Hyderabad', areas: 'Multiple locations' }
  ];

  // SEO meta data (would be set via Helmet or similar in a real app)
  React.useEffect(() => {
    document.title = 'About Nadanaloga Fine Arts Academy - Best Bharatanatyam, Carnatic Music & Dance Classes';

    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Nadanaloga Fine Arts Academy - Premier Indian classical dance and music academy since 2008. Expert Bharatanatyam, Carnatic vocal, drawing, abacus classes in Chennai & Hyderabad. Led by renowned guru Smt. B. Tamil Thendral.');
    }

    // Set meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', 'Nadanaloga, fine arts academy, Bharatanatyam classes, Carnatic music, Tamil Thendral, classical dance, Chennai dance academy, Hyderabad dance classes, Indian classical arts, semi-classical dance, drawing classes, abacus training, yoga classes, keyboard lessons, cultural education, traditional arts, performing arts academy');
    }
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">

      {/* Hero Section */}
      <section className="relative min-h-[50vh] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-800 dark:via-gray-900 dark:to-indigo-900"></div>

          {/* Floating Elements */}
          <motion.div
            className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20"
            animate={{ y: [0, -20, 0], rotate: [0, 180, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full opacity-20"
            animate={{ y: [0, 20, 0], rotate: [360, 180, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full opacity-20"
            animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-[50vh] px-6">
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, y: 50 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center max-w-4xl"
          >
            <motion.h1
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.2 }}
              className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-8"
            >
              About Us
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.4 }}
              className={`text-xl md:text-2xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed mb-8`}
            >
              Trusted fine arts academy preserving India's rich cultural traditions for today's generation
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1, delay: 0.6 }}
              className="w-24 h-1 bg-gradient-to-r from-purple-600 to-pink-600 mx-auto rounded-full"
            />
          </motion.div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-50/30 to-transparent dark:via-gray-800/30"></div>

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            ref={storyRef}
            initial={{ opacity: 0, y: 50 }}
            animate={storyInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="max-w-6xl mx-auto"
          >
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={storyInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.2 }}
              className={`text-4xl md:text-5xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-12 text-center`}
            >
              Our Heritage & Mission
            </motion.h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={storyInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 1, delay: 0.4 }}
                className="space-y-6"
              >
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                  <strong>Nadanaloga is a trusted fine arts academy</strong> dedicated to keeping alive the rich cultural traditions of India while making them relevant for today's generation. Started by <strong>G. Palaniswamy in 2008</strong>, our goal has always been to create a platform where students of all ages can learn, grow, and shine in their chosen art forms.
                </p>
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                  Under the guidance of <strong>Smt. B. Tamil Thendral</strong>, a respected dancer, choreographer, and teacher, Nadanaloga has become a name for excellence in performing and fine arts. With branches in <strong>Chennai (Sembakkam & Mambakkam) and Hyderabad</strong>, we make quality arts education available to more students across India and even abroad.
                </p>
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                  Over the years, our students have taken part in many programs and competitions, achieving milestones that make us proud. Behind them stands a team of dedicated teachers and trainers who give personal attention to every learner, ensuring strong skills as well as confidence.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotateY: 30 }}
                animate={storyInView ? { opacity: 1, scale: 1, rotateY: 0 } : {}}
                transition={{ duration: 1.2, delay: 0.3 }}
                className="relative"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src="/danceImages/responsive/large/Logo.webp"
                    alt="Nadanaloga Fine Arts Academy - Heritage and Tradition"
                    className="w-full h-[400px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                </div>
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full opacity-80 blur-lg"
                />
              </motion.div>
            </div>

            {/* Locations */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={storyInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.6 }}
              className="text-center"
            >
              <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>Our Locations</h3>
              <div className="flex flex-wrap justify-center gap-8">
                {locations.map((location, index) => (
                  <div key={index} className={`flex items-center gap-3 p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                    <MapPin className="w-5 h-5 text-purple-600" />
                    <div className="text-left">
                      <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{location.city}</div>
                      <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{location.areas}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* About Our Guru Section */}
      <section className="py-12 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            ref={guruRef}
            initial={{ opacity: 0, y: 50 }}
            animate={guruInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="max-w-6xl mx-auto"
          >
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={guruInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.2 }}
              className={`text-4xl md:text-5xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-12 text-center`}
            >
              About Our Guru
            </motion.h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={guruInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 1, delay: 0.4 }}
                className="space-y-6"
              >
                <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
                  Smt. B. Tamil Thendral
                </h3>
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                  <strong>Smt. B. Tamil Thendral</strong> is a well-known dancer, choreographer, and performer. She trained under great gurus like <strong>Mrs. Bala Vaiduryum, Smt. Latha Balu, and Dr. Bala Nandhikumar</strong>, completing her graduation in Music with Bharatanatyam at <strong>Sri Sathguru Sangeetha Vidyalayam, Madurai (2007)</strong>. She also learned nattuvangam and folk arts under leading teachers.
                </p>
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                  Apart from Bharatanatyam, she is an expert in <strong>folk dance, Carnatic vocal, and film dance</strong>. She has also worked as an <strong>RJ with Hello FM</strong> and as a <strong>VJ with Doordarshan</strong> and other TV channels.
                </p>
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                  Nadanaloga first began in <strong>2001 by Mrs. Lakshmi Priya</strong>, and in <strong>2017, Tamil Thendral started Nadanaloga Natyalaya in Chennai</strong>, further carrying the mission forward. For us, dance and art are not just skills—they are a passion, a tradition, and a way of life.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={guruInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 1.2, delay: 0.3 }}
                className="relative"
              >
                <div className={`relative rounded-2xl overflow-hidden shadow-2xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} border-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-black/5 dark:bg-black/40">
                    <img
                      src="/NadanalogaTeachers/Mrs.B.TamilThendral_Managing%20Director.jpeg"
                      alt="Smt. B. Tamil Thendral"
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                </div>
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full opacity-80 blur-lg"
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Our Courses Section */}
      <section className="py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 dark:from-gray-800 dark:via-indigo-900 dark:to-purple-900"></div>

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            ref={coursesRef}
            initial={{ opacity: 0, y: 50 }}
            animate={coursesInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="text-center max-w-4xl mx-auto mb-16"
          >
            <h2 className={`text-4xl md:text-5xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>
              Our Courses
            </h2>
            <p className={`text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed mb-8`}>
              We offer courses for different interests and age groups. Our teaching is not just about technique—it's about helping students enjoy the arts and grow in confidence.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((course, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={coursesInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className={`relative p-6 rounded-2xl ${theme === 'dark' ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-purple-200'} border-2 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300`}
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className={`w-12 h-12 bg-gradient-to-br ${course.color} rounded-full flex items-center justify-center mb-4 mx-auto`}
                >
                  <course.icon className="w-6 h-6 text-white" />
                </motion.div>
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3 text-center`}>
                  {course.name}
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} text-center text-sm leading-relaxed`}>
                  {course.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Us Section */}
      <section className="py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-800 dark:via-indigo-900 dark:to-purple-900"></div>

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            ref={joinRef}
            initial={{ opacity: 0, y: 50 }}
            animate={joinInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={joinInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.2 }}
              className={`text-4xl md:text-5xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-8`}
            >
              Join Us
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={joinInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.4 }}
              className="space-y-6 mb-12"
            >
              <p className={`text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                Whether you are just beginning your journey or are already trained and want to improve further, <strong>Nadanaloga is the right place for you</strong>. With supportive teachers, flexible learning, and a friendly environment, every student gets the chance to explore their true potential.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={joinInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1, delay: 0.6 }}
              className={`inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
            >
              <Phone className="w-5 h-5" />
              <span className="text-lg font-semibold">Call +91-9566866588 to book your free trial class or admission enquiry</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={joinInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.8 }}
              className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm`}>
                <Star className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>Expert Instructors</h4>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Learn from qualified professionals</p>
              </div>
              <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm`}>
                <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>Flexible Learning</h4>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Online and offline classes available worldwide</p>
              </div>
              <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm`}>
                <Award className="w-8 h-8 text-green-500 mx-auto mb-3" />
                <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>Proven Results</h4>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Students excel in competitions</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Floating decorative elements */}
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-20 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full opacity-20"
        />
        <motion.div
          animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 left-20 w-12 h-12 bg-gradient-to-br from-green-400 to-teal-400 rounded-full opacity-20"
        />
      </section>
    </div>
  );
};

export default AboutPage;
