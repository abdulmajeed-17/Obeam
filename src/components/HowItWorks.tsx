import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export function HowItWorks() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start center', 'end center']
  });

  return (
    <section
      id="how-it-works"
      ref={containerRef}
      className="py-12 sm:py-16 lg:py-20 relative overflow-hidden bg-white">

      <div className="container-saas w-full relative z-10">
        {/* Photo Section - Two Photos with Text in Middle */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-12 sm:mb-16 lg:mb-20 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 items-center"
        >
          {/* Left Photo - Solo artist / small business vibe */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative order-2 lg:order-1"
          >
            <motion.div
              className="relative rounded-2xl overflow-hidden shadow-2xl"
              whileHover={{ scale: 1.03, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="aspect-[3/4] bg-gradient-to-br from-forest-100 to-gold-100 relative overflow-hidden">
                <img
                  src="/home-left.png"
                  alt="Professional in office"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Middle Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="space-y-6 text-center lg:text-left order-1 lg:order-2"
          >
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-forest-900">
              A platform for you, whether you're a big business or a solo artist.
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Built for businesses of all sizes. From startups to enterprises, we've got the tools you need to pay suppliers and grow your business.
            </p>
          </motion.div>

          {/* Right Photo - Big business / office vibe */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative order-3"
          >
            <motion.div
              className="relative rounded-2xl overflow-hidden shadow-2xl"
              whileHover={{ scale: 1.03, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="aspect-[3/4] bg-gradient-to-br from-forest-100 to-gold-100 relative overflow-hidden">
                <img
                  src="/home-right.png"
                  alt="African market - artisan trade"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Process Section - Less Generic Design */}
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-forest-900 mb-3 sm:mb-4">
              How it works
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Three steps. No complexity. Real settlement.
            </p>
          </motion.div>

          <div className="relative">
            {/* Vertical line for mobile, horizontal for desktop */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold-200 to-transparent"></div>
            <div className="md:hidden absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-gold-200 to-transparent -translate-x-1/2"></div>

            <div className="space-y-12 md:space-y-0 md:grid md:grid-cols-3 md:gap-8 relative">
              {[
                {
                  step: '1',
                  title: 'Enter amount',
                  description: 'Tell us how much you want to send. We\'ll show you exactly what your supplier receives.',
                  color: 'from-blue-500 to-blue-600'
                },
                {
                  step: '2',
                  title: 'We convert instantly',
                  description: 'We convert your Naira to Cedis at the best mid-market rate available in seconds.',
                  color: 'from-gold-500 to-gold-600'
                },
                {
                  step: '3',
                  title: 'Supplier gets paid',
                  description: 'Your supplier receives Cedis directly in their bank account or mobile money wallet.',
                  color: 'from-green-500 to-green-600'
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="relative bg-white rounded-xl max-w-[340px] mx-auto md:mx-0 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow group"
                  style={{ padding: 28 }}
                >
                  <div className={`absolute top-0 left-8 w-12 h-1 bg-gradient-to-r ${item.color} rounded-full opacity-0 group-hover:opacity-100 transition-opacity md:hidden`}></div>
                  <div className={`absolute top-8 left-0 w-1 h-12 bg-gradient-to-b ${item.color} rounded-full opacity-0 group-hover:opacity-100 transition-opacity hidden md:block`}></div>
                  
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} text-white text-2xl font-bold mb-6 shadow-lg`}>
                    {item.step}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-forest-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>);
}
