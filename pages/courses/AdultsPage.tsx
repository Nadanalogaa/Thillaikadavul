import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Users,
  Clock,
  Heart,
  Award,
  Star,
  Target,
  BookOpen,
  Calendar,
  IndianRupee,
  Check,
  ArrowRight,
  Music,
  Sparkles,
  Brain,
  Activity,
  Coffee,
  Smile
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const AdultsPage: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1 });
  const { theme } = useTheme();

  const adultPrograms = [
    {
      name: 'Classical Dance for Adults',
      icon: Users,
      description: 'Discover the beauty of Bharatanatyam with age-appropriate techniques and modifications',
      ageGroup: '25+ years',
      duration: '1.5 hours per session',
      focus: 'Grace, posture, and cultural appreciation'
    },
    {
      name: 'Vocal Music for Adults',
      icon: Music,
      description: 'Learn Carnatic vocal music with emphasis on devotional songs and classical compositions',
      ageGroup: '18+ years',
      duration: '1 hour per session',
      focus: 'Voice training and spiritual music'
    },
    {
      name: 'Beginner-Friendly Workshops',
      icon: Sparkles,
      description: 'Special introductory workshops designed for absolute beginners with no prior experience',
      ageGroup: 'All ages 18+',
      duration: 'Weekend workshops',
      focus: 'Foundation building and confidence'
    },
    {
      name: 'Wellness Through Arts',
      icon: Heart,
      description: 'Therapeutic approach combining dance, music, and mindfulness for holistic well-being',
      ageGroup: '30+ years',
      duration: '1 hour per session',
      focus: 'Stress relief and mental wellness'
    }
  ];

  const courseFeatures = [
    {
      icon: Users,
      title: 'Adult-Friendly Environment',
      description: 'Comfortable learning atmosphere designed specifically for adult learners with patience and understanding'
    },
    {
      icon: Clock,
      title: 'Flexible Scheduling',
      description: 'Evening and weekend classes designed to accommodate working professionals and busy schedules'
    },
    {
      icon: Heart,
      title: 'Wellness Focus',
      description: 'Emphasis on physical and mental well-being through traditional arts and cultural practices'
    },
    {
      icon: Target,
      title: 'Personal Goals',
      description: 'Customized learning paths based on individual interests, abilities, and personal objectives'
    },
    {
      icon: BookOpen,
      title: 'Cultural Education',
      description: 'Deep dive into Indian culture, traditions, and history through arts and music education'
    },
    {
      icon: Activity,
      title: 'Fitness Benefits',
      description: 'Improve flexibility, balance, coordination, and overall physical fitness through dance movements'
    }
  ];

  const curriculumLevels = [
    {
      level: 'Introduction Phase (1-3 months)',
      skills: [
        'Basic posture and body alignment techniques',
        'Simple hand gestures (mudras) and expressions',
        'Elementary steps and movement patterns',
        'Breathing exercises and relaxation techniques',
        'Cultural context and historical background'
      ],
      outcomes: 'Adults develop basic movement vocabulary and cultural understanding while building confidence'
    },
    {
      level: 'Foundation Building (3-8 months)',
      skills: [
        'Intermediate dance sequences and combinations',
        'Storytelling through dance expressions',
        'Basic rhythm patterns and musicality',
        'Flexibility and strength building exercises',
        'Performance of simple classical pieces'
      ],
      outcomes: 'Students can perform basic classical items with proper technique and emotional expression'
    },
    {
      level: 'Cultural Integration (8-18 months)',
      skills: [
        'Advanced expressions and character portrayal',
        'Classical compositions and traditional pieces',
        'Understanding of ragas and talas in dance',
        'Stage presence and performance skills',
        'Teaching and sharing knowledge with others'
      ],
      outcomes: 'Adults become confident performers and cultural ambassadors of Indian classical arts'
    }
  ];

  const classSchedules = [
    {
      program: 'Classical Dance for Adults',
      weekday: 'Tuesday & Thursday - 7:00 PM to 8:30 PM',
      weekend: 'Saturday - 10:00 AM to 11:30 AM',
      special: 'Sunday workshops available on request'
    },
    {
      program: 'Vocal Music for Adults',
      weekday: 'Monday & Wednesday - 6:30 PM to 7:30 PM',
      weekend: 'Saturday - 5:00 PM to 6:00 PM',
      special: 'Online sessions available for remote learners'
    },
    {
      program: 'Wellness Through Arts',
      weekday: 'Wednesday - 7:00 PM to 8:00 PM',
      weekend: 'Sunday - 9:00 AM to 10:00 AM',
      special: 'Monthly meditation and arts retreat'
    }
  ];

  const uniqueBenefits = [
    'Stress reduction and mental relaxation after work hours',
    'Cultural connection and spiritual enrichment',
    'Social interaction with like-minded adult learners',
    'Improved posture and body awareness for desk workers',
    'Creative expression and artistic fulfillment',
    'Enhanced concentration and mindfulness practices',
    'Opportunity to learn with children or grandchildren',
    'Performance opportunities in community events',
    'Therapeutic benefits for physical and emotional health',
    'Lifelong learning and personal growth achievement'
  ];

  const testimonials = [
    {
      name: 'Priya Sharma',
      age: '34',
      profession: 'Software Engineer',
      quote: 'Learning Bharatanatyam as an adult has been incredibly fulfilling. The flexible schedule works perfectly with my job, and I feel more connected to my cultural roots.'
    },
    {
      name: 'Rajesh Kumar',
      age: '42',
      profession: 'Doctor',
      quote: 'The vocal music classes have become my meditation after long hospital shifts. The teachers are very patient with adult learners like me.'
    },
    {
      name: 'Meera Patel',
      age: '28',
      profession: 'Marketing Manager',
      quote: 'I started with no experience, and now I can perform classical pieces. The adult-friendly environment made all the difference.'
    }
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-900 via-purple-900 to-indigo-900 text-white py-20">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0 bg-[url('/danceImages/adults-dance-bg.jpg')] bg-cover bg-center opacity-30"></div>

        <div className="relative container mx-auto px-6 text-center" ref={ref}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Classes for Adults
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed">
              Discover the joy of Indian classical arts in a supportive, adult-friendly learning environment
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-8 py-3 rounded-full font-semibold hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 transform hover:scale-105"
              >
                Join Adult Classes
              </Link>
              <Link
                to="/courses"
                className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-rose-900 transition-all duration-300"
              >
                View All Courses
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Course Overview */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className={`text-3xl md:text-4xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              Arts Education for Adults
            </h2>
            <p className={`text-lg leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              It's never too late to explore your artistic side! Our adult classes are specially designed to accommodate
              the unique needs, schedules, and learning styles of adult students. Whether you're seeking cultural connection,
              stress relief, or personal enrichment, our programs offer a welcoming space for growth and discovery.
            </p>
          </div>

          {/* Programs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {adultPrograms.map((program, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`p-6 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-50 hover:bg-white shadow-lg hover:shadow-xl'
                } transition-all duration-300 transform hover:scale-105`}
              >
                <program.icon className="w-12 h-12 text-rose-600 mb-4" />
                <h3 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {program.name}
                </h3>
                <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {program.description}
                </p>
                <div className="space-y-2 text-sm">
                  <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Users className="w-4 h-4" />
                    <span>{program.ageGroup}</span>
                  </div>
                  <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Clock className="w-4 h-4" />
                    <span>{program.duration}</span>
                  </div>
                  <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Target className="w-4 h-4" />
                    <span>{program.focus}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Features */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Why Adults Choose Our Classes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courseFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`p-6 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-gray-800 hover:bg-gray-700'
                    : 'bg-white hover:bg-gray-50 shadow-lg hover:shadow-xl'
                } transition-all duration-300`}
              >
                <feature.icon className="w-12 h-12 text-rose-600 mb-4" />
                <h3 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {feature.title}
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Curriculum */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Adult Learning Journey
          </h2>

          <div className="space-y-8 max-w-5xl mx-auto">
            {curriculumLevels.map((level, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className={`p-8 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-gray-700'
                    : 'bg-gray-50 shadow-lg'
                }`}
              >
                <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {level.level}
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className={`text-lg font-semibold mb-3 text-rose-600`}>Learning Components</h4>
                    <ul className="space-y-2">
                      {level.skills.map((skill, skillIndex) => (
                        <li key={skillIndex} className={`flex items-start gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{skill}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className={`text-lg font-semibold mb-3 text-rose-600`}>Expected Outcomes</h4>
                    <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {level.outcomes}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Class Schedules */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Flexible Class Schedules
          </h2>

          <div className="max-w-4xl mx-auto space-y-6">
            {classSchedules.map((schedule, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`p-6 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-gray-800 border border-gray-700'
                    : 'bg-white shadow-lg border border-gray-200'
                }`}
              >
                <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {schedule.program}
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-semibold text-blue-600 mb-2">Weekday Classes</h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {schedule.weekday}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-600 mb-2">Weekend Classes</h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {schedule.weekend}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-600 mb-2">Special Options</h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {schedule.special}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Fee Structure */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Fee Structure
          </h2>

          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className={`p-8 rounded-xl ${
                theme === 'dark'
                  ? 'bg-gray-700 border border-gray-600'
                  : 'bg-gradient-to-br from-rose-50 to-purple-50 border border-rose-200'
              }`}
            >
              <div className="text-center mb-8">
                <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  Adult Classes
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Flexible programs designed for adult learners
                </p>
              </div>

              <div className="space-y-6">
                <div className={`flex justify-between items-center p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-600' : 'bg-white'
                }`}>
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Registration Fee
                  </span>
                  <span className="flex items-center text-2xl font-bold text-rose-600">
                    <IndianRupee className="w-6 h-6" />
                    800
                  </span>
                </div>

                <div className={`flex justify-between items-center p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-600' : 'bg-white'
                }`}>
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Monthly Fee
                  </span>
                  <span className="flex items-center text-2xl font-bold text-rose-600">
                    <IndianRupee className="w-6 h-6" />
                    2,000
                  </span>
                </div>

                <div className={`p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-600' : 'bg-rose-50'
                } border-l-4 border-rose-600`}>
                  <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    What's Included:
                  </h4>
                  <ul className={`space-y-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    <li>• Flexible class timings (weekdays/weekends)</li>
                    <li>• Personalized attention and progress tracking</li>
                    <li>• Access to practice sessions and workshops</li>
                    <li>• Performance opportunities in adult showcases</li>
                    <li>• Wellness and meditation sessions</li>
                    <li>• Cultural education and context</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            What Our Adult Students Say
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className={`p-6 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-gray-800 border border-gray-700'
                    : 'bg-white shadow-lg border border-gray-200'
                }`}
              >
                <div className="mb-4">
                  <div className="flex text-yellow-400 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                  <p className={`italic ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    "{testimonial.quote}"
                  </p>
                </div>
                <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pt-4`}>
                  <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    {testimonial.name}
                  </h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Age {testimonial.age} | {testimonial.profession}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Benefits for Adult Learners
          </h2>

          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
            {uniqueBenefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`flex items-start gap-3 p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50 shadow-md'
                }`}
              >
                <Smile className="w-6 h-6 text-yellow-500 mt-1 flex-shrink-0" />
                <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {benefit}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 bg-gradient-to-r from-rose-600 to-purple-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              It's Never Too Late to Start Your Artistic Journey
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join our growing community of adult learners and discover the joy, wellness, and cultural enrichment that comes with learning Indian classical arts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="bg-white text-rose-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
              >
                Start Your Journey Today
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/courses"
                className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-rose-600 transition-all duration-300"
              >
                Explore All Courses
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AdultsPage;