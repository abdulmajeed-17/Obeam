import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Star } from 'lucide-react';
const testimonials = [
{
  id: 1,
  content:
  "Beam has completely transformed how we handle our cross-border payments. What used to take 3-4 days now happens in hours. It's magic.",
  author: 'Chidi Okeke',
  role: 'CEO, ImportCo Nigeria',
  company: 'ImportCo',
  image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chidi'
},
{
  id: 2,
  content:
  'The rates are unbeatable and the transparency is refreshing. I know exactly what my suppliers in Accra will receive down to the last Cedi.',
  author: 'Sarah Mensah',
  role: 'Procurement Director',
  company: 'WestAfrica Trade',
  image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
},
{
  id: 3,
  content:
  'Customer support is actually responsive. When I had an issue with a large transfer, they resolved it within minutes. Highly recommended.',
  author: 'David Okafor',
  role: 'Operations Lead',
  company: 'TechLogistics',
  image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David'
}];

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-cream-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-10 left-10 w-20 h-20 bg-gold-500/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-forest-500/10 rounded-full blur-xl"></div>
      </div>

      <div className="container-saas w-full relative z-10">
        <div className="text-center mb-10 sm:mb-16">
          <motion.h2
            initial={{
              opacity: 0,
              y: 20
            }}
            whileInView={{
              opacity: 1,
              y: 0
            }}
            viewport={{
              once: true
            }}
            className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-forest-900 mb-3 sm:mb-4">

            Don't just take our word for it
          </motion.h2>
          <motion.p
            initial={{
              opacity: 0,
              y: 20
            }}
            whileInView={{
              opacity: 1,
              y: 0
            }}
            viewport={{
              once: true
            }}
            transition={{
              delay: 0.1
            }}
            className="text-lg text-gray-600">

            Join thousands of businesses moving faster with Beam.
          </motion.p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative h-[400px] md:h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{
                  opacity: 0,
                  x: 50,
                  scale: 0.95
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: 1
                }}
                exit={{
                  opacity: 0,
                  x: -50,
                  scale: 0.95
                }}
                transition={{
                  duration: 0.5,
                  ease: 'circOut'
                }}
                className="absolute inset-0">

                <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-12 shadow-xl border border-gold-500/10 h-full flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Quote size={120} className="text-forest-900" />
                  </div>

                  <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-full border-4 border-gold-100 overflow-hidden shadow-md">
                        <img
                          src={testimonials[currentIndex].image}
                          alt={testimonials[currentIndex].author}
                          className="w-full h-full object-cover" />

                      </div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <div className="flex justify-center md:justify-start gap-1 text-gold-500 mb-4">
                        {[...Array(5)].map((_, i) =>
                        <Star key={i} size={16} fill="currentColor" />
                        )}
                      </div>
                      <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-forest-900 mb-4 sm:mb-6 leading-relaxed">
                        "{testimonials[currentIndex].content}"
                      </p>
                      <div>
                        <h4 className="font-bold text-forest-900 text-lg">
                          {testimonials[currentIndex].author}
                        </h4>
                        <p className="text-gray-500">
                          {testimonials[currentIndex].role}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Indicators — smaller dots on mobile, centred */}
          <div className="w-full flex justify-center gap-2 sm:gap-3 mt-6 sm:mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`rounded-full transition-all duration-300 flex items-center justify-center min-w-[32px] min-h-[32px] sm:min-w-[44px] sm:min-h-[44px] ${index === currentIndex ? 'bg-forest-900 w-3 h-3 sm:w-3.5 sm:h-3.5' : 'bg-gray-300 hover:bg-gray-400 w-2 h-2 sm:w-2.5 sm:h-2.5'}`}
                aria-label={`Go to testimonial ${index + 1}`}
                aria-current={index === currentIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </section>);

}