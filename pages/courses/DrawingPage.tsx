import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Palette,
  Brush,
  PenTool,
  Image,
  Clock,
  Users,
  Award,
  CheckCircle,
  Calendar,
  Star,
  Lightbulb,
  Layers,
  Phone,
  Mail,
  BookOpen
} from 'lucide-react';

const DrawingPage: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true, initialInView: true });

  const courseFeatures = [
    {
      icon: <Palette className="w-8 h-8" />,
      title: 'Creative Expression',
      description: 'Develop your unique artistic voice and learn to express ideas through visual art'
    },
    {
      icon: <Brush className="w-8 h-8" />,
      title: 'Multiple Techniques',
      description: 'Master various drawing and painting techniques from pencil sketching to watercolors'
    },
    {
      icon: <Layers className="w-8 h-8" />,
      title: 'Progressive Skill Building',
      description: 'Structured curriculum that builds skills from basic shapes to complex compositions'
    },
    {
      icon: <Lightbulb className="w-8 h-8" />,
      title: 'Imagination Development',
      description: 'Enhance creativity, observational skills, and artistic problem-solving abilities'
    }
  ];

  const curriculumLevels = [
    {
      level: 'Beginner (Foundation)',
      duration: '3-6 months',
      topics: [
        'Basic shapes and lines',
        'Pencil grip and control',
        'Shading techniques',
        'Simple object drawing',
        'Color recognition and mixing'
      ],
      age: '5+ years'
    },
    {
      level: 'Elementary (Level 1)',
      duration: '6-9 months',
      topics: [
        'Still life drawing',
        'Introduction to perspective',
        'Basic portrait features',
        'Watercolor techniques',
        'Nature and landscape drawing'
      ],
      age: '7+ years'
    },
    {
      level: 'Intermediate (Level 2)',
      duration: '9-12 months',
      topics: [
        'Advanced shading and textures',
        'Human figure proportions',
        'Advanced color theory',
        'Mixed media techniques',
        'Composition and design principles'
      ],
      age: '10+ years'
    },
    {
      level: 'Advanced (Level 3)',
      duration: 'Ongoing',
      topics: [
        'Realistic portraits',
        'Advanced perspective drawing',
        'Digital art introduction',
        'Personal style development',
        'Portfolio preparation'
      ],
      age: '13+ years'
    }
  ];

  const artTechniques = [
    {
      technique: 'Pencil Sketching',
      description: 'Master the fundamentals with graphite pencils, from light sketches to detailed drawings',
      materials: 'Graphite pencils (2H-8B), erasers, blending stumps',
      icon: <PenTool className="w-6 h-6" />
    },
    {
      technique: 'Watercolor Painting',
      description: 'Learn wet-on-wet and wet-on-dry techniques to create beautiful transparent effects',
      materials: 'Watercolor paints, brushes, watercolor paper',
      icon: <Brush className="w-6 h-6" />
    },
    {
      technique: 'Colored Pencils',
      description: 'Develop skills in layering, blending, and creating vibrant colored pencil artworks',
      materials: 'Colored pencils, blending tools, textured paper',
      icon: <Palette className="w-6 h-6" />
    },
    {
      technique: 'Pastels & Charcoal',
      description: 'Explore dramatic contrasts and soft textures using pastels and charcoal media',
      materials: 'Soft pastels, charcoal, blending tools, toned paper',
      icon: <Image className="w-6 h-6" />
    }
  ];

  const classSchedule = [
    {
      day: 'Monday & Wednesday',
      time: '4:00 PM - 5:00 PM',
      level: 'Beginner (Ages 5-8)',
      location: 'Both Branches'
    },
    {
      day: 'Tuesday & Thursday',
      time: '5:00 PM - 6:00 PM',
      level: 'Elementary (Ages 9-12)',
      location: 'Both Branches'
    },
    {
      day: 'Friday',
      time: '6:00 PM - 7:00 PM',
      level: 'Intermediate (Ages 13+)',
      location: 'Head Office'
    },
    {
      day: 'Saturday',
      time: '10:00 AM - 12:00 PM',
      level: 'Advanced & Portfolio Prep',
      location: 'Head Office'
    }
  ];

  const projectTypes = [
    'Still life compositions',
    'Nature and landscape studies',
    'Portrait and figure drawing',
    'Imaginative and fantasy art',
    'Abstract and creative compositions',
    'Cultural and traditional themes',
    'Seasonal and festival artworks',
    'Personal expression projects'
  ];

  const feeStructure = {
    registration: '₹300',
    monthly: '₹800',
    quarterly: '₹2,200',
    materials: '₹500 - ₹1,000',
    portfolio: '₹200'
  };

  const benefits = [
    'Enhanced creativity and imagination',
    'Improved fine motor skills',
    'Better observation and attention to detail',
    'Increased patience and focus',
    'Stress relief and relaxation',
    'Boosted self-confidence',
    'Cultural and aesthetic appreciation',
    'Foundation for design careers'
  ];

  const artSupplies = [
    {
      category: 'Basic Drawing Kit',
      items: ['Pencils (2H, HB, 2B, 4B)', 'Erasers (kneaded & vinyl)', 'Blending stumps', 'Sketchbook'],
      cost: '₹500 - ₹800'
    },
    {
      category: 'Watercolor Set',
      items: ['Watercolor paints (12 colors)', 'Round brushes (sizes 2, 6, 10)', 'Watercolor paper pad', 'Water containers'],
      cost: '₹600 - ₹1,000'
    },
    {
      category: 'Advanced Kit',
      items: ['Colored pencils (24 set)', 'Pastels', 'Charcoal sticks', 'Mixed paper types'],
      cost: '₹800 - ₹1,500'
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center bg-gradient-to-br from-orange-900 via-red-900 to-pink-900 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Drawing</span> Classes
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed"
          >
            Unleash your creativity and develop artistic skills through comprehensive drawing and painting instruction
          </motion.p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16" ref={ref}>
        {/* Course Overview */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              About <span className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">Drawing</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Our drawing program is designed to nurture artistic talent in students of all ages. From basic sketching to advanced
              artistic techniques, we provide comprehensive instruction in various art mediums. Students learn to observe,
              interpret, and express their vision through visual art while developing technical skills and creative confidence.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {courseFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-orange-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-center"
              >
                <div className="text-orange-600 dark:text-orange-400 mb-4 flex justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Art Techniques */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Art <span className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">Techniques</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Master various artistic mediums and techniques throughout your learning journey
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {artTechniques.map((technique, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="text-orange-600 dark:text-orange-400 mr-4">
                    {technique.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {technique.technique}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-3">
                  {technique.description}
                </p>
                <div className="bg-orange-50 dark:bg-orange-900/30 p-3 rounded-lg">
                  <p className="text-orange-700 dark:text-orange-300 text-sm">
                    <strong>Materials:</strong> {technique.materials}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Curriculum Levels */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Learning <span className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">Levels</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Progressive curriculum designed to develop artistic skills from basic to advanced levels
            </p>
          </motion.div>

          <div className="space-y-8">
            {curriculumLevels.map((level, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-orange-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg"
              >
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {level.level}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-orange-600 dark:text-orange-400">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">{level.duration}</span>
                      </div>
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Users className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">{level.age}</span>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Learning Focus:</h4>
                    <ul className="grid md:grid-cols-2 gap-2">
                      {level.topics.map((topic, topicIndex) => (
                        <li key={topicIndex} className="flex items-start text-gray-600 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Project Types */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Project <span className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">Types</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Diverse range of artistic projects to keep students engaged and challenged
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {projectTypes.map((project, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center hover:shadow-xl transition-all duration-300"
              >
                <Image className="w-8 h-8 text-orange-600 dark:text-orange-400 mx-auto mb-3" />
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {project}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Class Schedule */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Class <span className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">Schedule</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Age-appropriate class timings for optimal learning and engagement
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {classSchedule.map((schedule, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-orange-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {schedule.level}
                  </h3>
                  <span className="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 px-3 py-1 rounded-full text-sm font-medium">
                    {schedule.location}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4 mr-2" />
                    {schedule.day}
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Clock className="w-4 h-4 mr-2" />
                    {schedule.time}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Art Supplies */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Art <span className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">Supplies</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Quality materials to support your artistic journey
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {artSupplies.map((supply, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {supply.category}
                  </h3>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {supply.cost}
                  </p>
                </div>
                <ul className="space-y-2">
                  {supply.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Fee Structure */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Fee <span className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">Structure</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Affordable pricing for comprehensive art education
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <Palette className="w-12 h-12 text-orange-600 dark:text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Registration Fee</h3>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">{feeStructure.registration}</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm">One-time payment</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <Calendar className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Monthly Fee</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">{feeStructure.monthly}</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm">4 classes per month</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <Star className="w-12 h-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Quarterly Fee</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">{feeStructure.quarterly}</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm">Save ₹200</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              <strong>Additional:</strong> Art Materials ({feeStructure.materials}), Portfolio Review ({feeStructure.portfolio})
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Basic art supplies available for purchase at the academy
            </p>
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Benefits of <span className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">Art Education</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Art education provides numerous developmental benefits for students of all ages
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="bg-gradient-to-br from-orange-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-xl shadow-lg text-center"
              >
                <Lightbulb className="w-6 h-6 text-orange-600 dark:text-orange-400 mx-auto mb-3" />
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {benefit}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center bg-gradient-to-r from-orange-600 to-pink-600 rounded-2xl p-12 text-white"
          >
            <h3 className="text-3xl font-bold mb-6">
              Start Your Artistic Journey Today
            </h3>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join our drawing classes and discover your creative potential in a supportive and inspiring environment.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a
                href="tel:+919566866588"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-orange-600 px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call: +91 95668 66588
              </motion.a>
              <motion.a
                href="mailto:nadanalogaa@gmail.com?subject=Drawing Classes Inquiry"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-orange-600 transition-all duration-300 flex items-center"
              >
                <Mail className="w-5 h-5 mr-2" />
                Email Inquiry
              </motion.a>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default DrawingPage;