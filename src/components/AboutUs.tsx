import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, Target, Zap } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export function AboutUs() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const values = [
    {
      icon: Zap,
      title: 'Speed',
      description: 'Settlement in 24 hours, not days. Built for businesses that move fast.'
    },
    {
      icon: Target,
      title: 'Transparency',
      description: 'No hidden fees. Real-time FX rates. Complete visibility into every transaction.'
    },
    {
      icon: Users,
      title: 'Compliance',
      description: 'Enterprise-grade AML screening. Regulatory-first approach. Built for trust.'
    },
    {
      icon: MapPin,
      title: 'Focus',
      description: 'One corridor, done right. Ghana–Nigeria first, then we expand.'
    }
  ];

  return (
    <motion.div
      className="min-h-screen font-sans text-gray-900 overflow-x-hidden"
      style={{ backgroundColor: '#F5F1E9' }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Navbar />
      
      <main>
{/* Hero Section */}
<section className="relative py-20 sm:py-24 lg:py-32">
  <div className="container-saas relative">
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="max-w-2xl"
    >
      <h1
        className="font-extrabold mb-6 leading-[1.08]"
        style={{
          letterSpacing: '-0.03em',
          fontSize: 'clamp(40px, 4.5vw, 58px)',
          color: '#0E2F1C',
        }}
      >
        Building infrastructure for{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-forest-600 to-gold-600">
          African trade
        </span>
      </h1>

      <p
        className="leading-relaxed"
        style={{ fontSize: 18, color: '#4B5563' }}
      >
        We’re solving cross-border payments one corridor at a time. Starting with Ghana–Nigeria.
      </p>
    </motion.div>
  </div>
</section>


        {/* Story Section */}
        <section className="bg-white relative py-12 sm:py-16 lg:py-20">
          <div className="container-saas w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-5" style={{ color: '#0E2F1C' }}>
                  Why we exist
                </h2>
                <div className="space-y-4 leading-relaxed" style={{ fontSize: 18, color: '#4B5563' }}>
                  <p>
                    African businesses trade billions across borders every year. Yet payment infrastructure remains fragmented, slow, and expensive.
                  </p>
                  <p>
                    We started Obeam to fix this. Not with hype, but with infrastructure. Real compliance. Real settlement rails. Real transparency.
                  </p>
                  <p>
                    We're focusing on the Ghana–Nigeria corridor first—one of West Africa's most active trade routes. Once we've solved it deeply, we'll expand.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="aspect-[4/5] max-h-[420px] rounded-2xl overflow-hidden shadow-xl bg-white">
                  <img
                    src="/about-us-clear.png"
                    alt="African business professional"
                    className="w-full h-full object-cover object-center"
                    fetchPriority="high"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="bg-gradient-to-b from-white to-cream-50/50 py-12 sm:py-16 lg:py-20">
          <div className="container-saas w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3" style={{ color: '#0E2F1C' }}>
                What drives us
              </h2>
              <p className="max-w-2xl mx-auto" style={{ fontSize: 18, color: '#4B5563' }}>
                Four principles that guide everything we build
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow p-5 sm:p-6 lg:p-7"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center mb-6">
                    <value.icon size={28} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#0E2F1C' }}>
                    {value.title}
                  </h3>
                  <p className="leading-relaxed" style={{ fontSize: 16, color: '#4B5563' }}>
                    {value.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="bg-white py-12 sm:py-16 lg:py-20">
          <div className="container-saas w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3" style={{ color: '#0E2F1C' }}>
                Built by Africans, for Africa
              </h2>
              <p className="max-w-2xl mx-auto" style={{ fontSize: 18, color: '#4B5563' }}>
                We understand the challenges because we've lived them
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
              {[
                {
                  role: 'Co-founder & CEO',
                  image: 'https://api.dicebear.com/7.x/notionists/svg?seed=CEO&backgroundColor=ffffff&strokeColor=0a0a0a'
                },
                {
                  role: 'Co-founder & CTO',
                  image: 'https://api.dicebear.com/7.x/notionists/svg?seed=CTO&backgroundColor=ffffff&strokeColor=0a0a0a'
                },
                {
                  role: 'Head of Compliance',
                  image: 'https://api.dicebear.com/7.x/notionists/svg?seed=Compliance&backgroundColor=ffffff&strokeColor=0a0a0a'
                }
              ].map((member, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group flex flex-col h-full"
                >
                  <div className="flex-shrink-0 w-full max-w-[200px] sm:max-w-[220px] md:max-w-[260px] mx-auto flex items-center justify-center rounded-xl sm:rounded-2xl overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow bg-white border border-gray-100 group-hover:border-gold-300 transition-colors p-4 sm:p-5 md:p-6 aspect-[3/4]">
                    <img
                      src={member.image}
                      alt={member.role}
                      className="max-w-full max-h-full w-auto h-auto object-contain object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="flex-shrink-0 font-medium text-center text-sm sm:text-base pt-3 sm:pt-4 w-full" style={{ color: '#4B5563' }}>
                    {member.role}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-br from-forest-900 to-forest-950 text-white" style={{ paddingTop: 80, paddingBottom: 80 }}>
          <div className="container-saas w-full max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-5">
                Ready to join us?
              </h2>
              <p className="mb-6" style={{ fontSize: 18, color: 'rgba(255,255,255,0.92)' }}>
                We're building the future of African cross-border payments. If you're passionate about infrastructure, compliance, and solving real problems, we'd love to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.a
                  href="#"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gold-500 text-forest-900 font-bold py-4 px-8 rounded-xl shadow-xl hover:bg-gold-400 transition-colors"
                >
                  View Open Roles
                </motion.a>
                <motion.a
                  href="#"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold py-4 px-8 rounded-xl hover:bg-white/20 transition-colors"
                >
                  Get in Touch
                </motion.a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </motion.div>
  );
}
