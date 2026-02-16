import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FileText, Link2 } from 'lucide-react';

export function Features() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });

  const y = useTransform(scrollYProgress, [0, 1], [30, -30]);

  const features = [
    {
      icon: FileText,
      title: 'Invoices',
      description: 'Generate professional invoices for your customers and get paid from anywhere.',
      linkText: 'Get started',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Link2,
      title: 'Payment links',
      description: 'Receive one-off or recurring payments from anyone, anywhere, via your unique payment link.',
      linkText: 'Learn more',
      color: 'from-gold-500 to-gold-600',
      bgColor: 'bg-gold-50'
    }
  ];

  return (
    <section
      ref={containerRef}
      className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-white to-cream-50/30 relative overflow-hidden">
      
      <div className="container-saas w-full relative z-10">
        <motion.div
          style={{ y }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
          
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              whileHover={{ y: -4 }}
              className={`group relative ${feature.bgColor} rounded-2xl sm:rounded-3xl border border-transparent hover:border-gold-200 transition-all duration-300 p-5 sm:p-6 lg:p-7`}
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                <feature.icon size={28} className="text-white w-6 h-6 sm:w-7 sm:h-7" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-forest-900 mb-2 sm:mb-3">
                {feature.title}
              </h3>
              
              <p className="text-gray-700 mb-6 leading-relaxed">
                {feature.description}
              </p>

              <a
                href="#"
                className={`inline-flex items-center text-forest-900 font-semibold hover:text-gold-600 transition-colors group/link`}
              >
                {feature.linkText}
                <motion.svg
                  className="ml-2"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  whileHover={{ x: 4 }}
                >
                  <path
                    d="M6 12L10 8L6 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              </a>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
