import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Star, Users, Clock, Calendar, Award, Music, Sparkles, Target } from 'lucide-react';

const PerformanceWorkshopsPage: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true, initialInView: true });
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setHasMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const isContentVisible = hasMounted || inView;

  const workshops = [
    {
      title: 'Classical Dance Performance Workshop',
      duration: '3 Days Intensive',
      description: 'Master the art of stage performance with our comprehensive Bharatanatyam workshop focusing on expressions, stage presence, and classical repertoire.',
      features: ['Stage makeup and costume', 'Classical items and Varnams', 'Expression techniques', 'Stage presence training'],
      image: '/danceImages/bharatanatyam1.jpg',
      level: 'Intermediate to Advanced'
    },
    {
      title: 'Carnatic Vocal Performance Workshop',
      duration: '2 Days',
      description: 'Enhance your vocal performance skills with training in classical compositions, breath control, and concert presentation techniques.',
      features: ['Voice projection techniques', 'Classical compositions', 'Concert etiquette', 'Audience engagement'],
      image: '/danceImages/vocal1.jpg',
      level: 'All Levels'
    },
    {
      title: 'Competition Preparation Workshop',
      duration: '5 Days',
      description: 'Specialized workshop designed to prepare students for dance and music competitions with expert coaching and performance strategies.',
      features: ['Competition choreography', 'Judges\' expectations', 'Performance confidence', 'Winning strategies'],
      image: '/danceImages/competition.jpg',
      level: 'Advanced'
    },
    {
      title: 'Cultural Event Workshop',
      duration: '1 Day',
      description: 'Perfect for school and college cultural events, this workshop covers group performances, quick choreography, and event management.',
      features: ['Group choreography', 'Quick learning techniques', 'Event coordination', 'Costume guidance'],
      image: '/danceImages/cultural.jpg',
      level: 'Beginner to Intermediate'
    }
  ];

  const benefits = [
    {
      icon: <Star className="w-8 h-8" />,
      title: 'Expert Guidance',
      description: 'Learn from experienced performers and competition winners'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Small Batches',
      description: 'Limited participants ensure personalized attention for each student'
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: 'Certificate',
      description: 'Receive completion certificates for all workshop participants'
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Performance Ready',
      description: 'Walk away confident and ready for any performance opportunity'
    }
  ];

  const upcomingWorkshops = [
    {
      title: 'Classical Dance Intensive',
      date: 'December 15-17, 2024',
      time: '10:00 AM - 4:00 PM',
      venue: 'Head Office Branch',
      seats: '12 seats remaining'
    },
    {
      title: 'Vocal Performance Workshop',
      date: 'January 20-21, 2025',
      time: '9:00 AM - 1:00 PM',
      venue: 'Sembakkam Branch',
      seats: '8 seats remaining'
    },
    {
      title: 'Competition Prep Workshop',
      date: 'February 10-14, 2025',
      time: '2:00 PM - 6:00 PM',
      venue: 'Head Office Branch',
      seats: 'Early Bird Booking'
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            Performance <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Workshops</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed"
          >
            Intensive workshops designed to elevate your performance skills and stage presence
          </motion.p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16" ref={ref}>
        {/* Benefits Section */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isContentVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Our <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Workshops?</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Our intensive workshops are designed to fast-track your performance skills with expert guidance
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isContentVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-center"
              >
                <div className="text-purple-600 dark:text-purple-400 mb-4 flex justify-center">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Workshops Section */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isContentVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Available <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Workshops</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Choose from our range of specialized performance workshops
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {workshops.map((workshop, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isContentVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="h-48 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Music className="w-16 h-16 text-white" />
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {workshop.title}
                    </h3>
                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-3 py-1 rounded-full text-sm font-medium">
                      {workshop.duration}
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {workshop.description}
                  </p>

                  <div className="mb-4">
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      Level: {workshop.level}
                    </span>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {workshop.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <Sparkles className="w-4 h-4 text-purple-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
                  >
                    Register Now
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Upcoming Workshops */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isContentVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Upcoming <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Schedule</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Don't miss out on our upcoming workshops - limited seats available!
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {upcomingWorkshops.map((workshop, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isContentVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {workshop.title}
                </h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4 mr-2" />
                    {workshop.date}
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Clock className="w-4 h-4 mr-2" />
                    {workshop.time}
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Users className="w-4 h-4 mr-2" />
                    {workshop.venue}
                  </div>
                </div>
                <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg text-sm font-medium mb-4">
                  {workshop.seats}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full border-2 border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400 py-2 px-4 rounded-lg font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300"
                >
                  Book Now
                </motion.button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={isContentVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-12 text-white"
          >
            <h3 className="text-3xl font-bold mb-6">
              Ready to Enhance Your Performance Skills?
            </h3>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join our performance workshops and take your artistic abilities to the next level with expert guidance and hands-on training.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a
                href="tel:+919566866588"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Register: +91 95668 66588
              </motion.a>
              <motion.a
                href="mailto:nadanalogaa@gmail.com"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-all duration-300"
              >
                Email for Details
              </motion.a>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default PerformanceWorkshopsPage;
