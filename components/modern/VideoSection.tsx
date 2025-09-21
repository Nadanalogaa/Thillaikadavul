import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Play, ExternalLink, Youtube } from 'lucide-react';

const VideoSection: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1 });
  const [selectedVideo, setSelectedVideo] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Real videos from Nadanaloga YouTube channel
  const videos = [
    {
      id: '2AF-8tmMIbM', // Nadanaloga Salaingai Pooja 2025
      title: 'Nadanaloga Salaingai Pooja 2025',
      description: 'A sacred ceremony marking the beginning of dance training, celebrating the divine bond between student and art.',
      thumbnail: '/danceImages/responsive/large/EGM_7361_DxO.webp',
      duration: '8:45'
    },
    {
      id: '5ur6tleXvxU', // Bharathanatya Arangetram highlights
      title: 'Bharatanatyam Arangetram Highlights Sep 2024',
      description: 'Spectacular highlights from our student\'s debut solo performance, showcasing years of dedicated training.',
      thumbnail: '/danceImages/responsive/large/DSC02946~2.webp',
      duration: '12:30'
    },
    {
      id: '72RndUdKpcM', // Salangai pooja 2024 highlights
      title: 'Salangai Pooja 2024 Highlights',
      description: 'Beautiful moments from our annual Salangai Pooja ceremony, a milestone in every dancer\'s journey.',
      thumbnail: '/danceImages/responsive/large/EGM_7524_DxO.webp',
      duration: '6:22'
    },
    {
      id: '8_CXrWRvti8', // Thiruppavai pasuram
      title: 'Thiruppavai Pasuram by Dhivyasri',
      description: 'A devotional performance of Thiruppavai, beautifully rendered by our talented student Dhivyasri.',
      thumbnail: '/danceImages/responsive/large/PRAP3795_DxO.webp',
      duration: '4:15'
    },
    {
      id: 'B64PzE_R5sI', // Manikkavasagar thiruvembavai
      title: 'Manikkavasagar Thiruvembavai - Margazhi Special',
      description: 'A soulful performance during the auspicious month of Margazhi, dedicated to Lord Shiva.',
      thumbnail: '/danceImages/responsive/large/EGM_7698_DxO.webp',
      duration: '5:38'
    },
    {
      id: 'Qq8ylYlpDnA', // New Nadanaloga video
      title: 'Classical Dance Performance',
      description: 'Beautiful classical dance performance showcasing traditional artistry and grace.',
      thumbnail: '/danceImages/responsive/large/EGM_7745_DxO.webp',
      duration: '5:30'
    },
    {
      id: 'RHpD9_TFg-0', // New Nadanaloga video
      title: 'Student Showcase Performance',
      description: 'Our talented students demonstrating their skills in this captivating performance.',
      thumbnail: '/danceImages/responsive/large/EGM_7611_DxO.webp',
      duration: '6:45'
    },
    {
      id: 'kWNR1R2fZkU', // New Nadanaloga video
      title: 'Traditional Dance Ensemble',
      description: 'A mesmerizing ensemble performance highlighting the beauty of classical Indian dance.',
      thumbnail: '/danceImages/responsive/large/EGM_7634_DxO.webp',
      duration: '8:20'
    },
    {
      id: 'dNpgLtW1hag', // New Nadanaloga video
      title: 'Cultural Heritage Performance',
      description: 'Celebrating our rich cultural heritage through expressive dance and storytelling.',
      thumbnail: '/danceImages/responsive/large/PRAP2427_DxO.webp',
      duration: '7:15'
    }
  ];

  const handleVideoSelect = (index: number) => {
    setSelectedVideo(index);
    setIsVideoLoaded(false);
  };

  return (
    <section className="py-12 bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900" ref={ref}>
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <Youtube className="w-8 h-8 text-red-500" />
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Watch Our <span className="bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">Performances</span>
            </h2>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Experience the beauty and grace of classical Indian dance through our carefully curated video collection.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Video Player - Left Side */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="lg:col-span-2"
          >
            {/* YouTube Embed */}
            <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl mb-6 bg-black">
              <iframe
                key={selectedVideo} // Force re-render on video change
                src={`https://www.youtube.com/embed/${videos[selectedVideo].id}?autoplay=0&rel=0&modestbranding=1&showinfo=0`}
                title={videos[selectedVideo].title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
                onLoad={() => setIsVideoLoaded(true)}
              />
            </div>

            {/* Video Info */}
            <motion.div
              key={selectedVideo}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
            >
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {videos[selectedVideo].title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                {videos[selectedVideo].description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Duration: {videos[selectedVideo].duration}
                </span>
                <motion.a
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href={`https://www.youtube.com/watch?v=${videos[selectedVideo].id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  Watch on YouTube
                </motion.a>
              </div>
            </motion.div>

            {/* Channel CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8"
            >
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href="https://www.youtube.com/@Nadanaloga"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gradient-to-r from-red-500 to-pink-600 text-white p-6 rounded-xl hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-bold mb-2">Subscribe to Nadanaloga</h4>
                    <p className="opacity-90">Join our community and never miss a performance</p>
                  </div>
                  <Youtube className="w-12 h-12" />
                </div>
              </motion.a>
            </motion.div>
          </motion.div>

          {/* Video Grid - Right Side */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">More Videos</h3>
            <div className="max-h-[650px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent space-y-4 pr-2">
            {videos.map((video, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  scale: 1.02, 
                  y: -4,
                  transition: { duration: 0.2 }
                }}
                className={`relative cursor-pointer rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform ${
                  selectedVideo === index 
                    ? 'ring-4 ring-red-500 bg-red-50 dark:bg-red-900/20 shadow-red-500/30' 
                    : 'hover:shadow-purple-500/20'
                }`}
                onClick={() => handleVideoSelect(index)}
              >
                {/* Video Thumbnail */}
                <motion.div 
                  className="flex gap-3 p-3 bg-white dark:bg-gray-800"
                  whileHover={{ backgroundColor: "rgba(139, 69, 19, 0.05)" }}
                >
                  <div className="relative w-28 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                    <motion.img
                      src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                    />
                    
                    {/* Play Button Overlay */}
                    <motion.div 
                      className="absolute inset-0 bg-black/30 flex items-center justify-center group"
                      whileHover={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                    >
                      <motion.div
                        whileHover={{ 
                          scale: 1.2,
                          boxShadow: "0 0 20px rgba(239, 68, 68, 0.6)"
                        }}
                        whileTap={{ scale: 0.9 }}
                        className="bg-red-500 text-white p-2 rounded-full shadow-lg group-hover:bg-red-600 transition-colors"
                      >
                        <Play className="w-4 h-4 ml-0.5" />
                      </motion.div>
                    </motion.div>
                    
                    {/* Duration Badge */}
                    <div className="absolute bottom-1 right-1 bg-black/80 text-white px-1 py-0.5 rounded text-xs">
                      {video.duration}
                    </div>
                  </div>

                  {/* Video Info */}
                  <motion.div 
                    className="flex-1 min-w-0"
                    initial={{ opacity: 0.8 }}
                    whileHover={{ opacity: 1 }}
                  >
                    <motion.h4 
                      className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 leading-tight"
                      whileHover={{ color: "#ef4444" }}
                      transition={{ duration: 0.2 }}
                    >
                      {video.title}
                    </motion.h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {video.description}
                    </p>
                  </motion.div>
                </motion.div>
              </motion.div>
            ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default VideoSection;