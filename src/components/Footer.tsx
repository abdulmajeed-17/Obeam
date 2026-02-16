import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Twitter, Linkedin, Instagram, ArrowUpRight, ChevronDown } from 'lucide-react';

export function Footer() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const sections = [
    {
      id: 'product',
      title: 'Product',
      links: [
        { name: 'How It Works', href: '#how-it-works' },
        { name: 'Pricing', href: '#pricing' },
        { name: 'Send a Payment', href: '#' },
        { name: 'Track a Transfer', href: '#' },
        { name: 'Security', href: '#' },
        { name: 'API', href: '#', badge: 'Coming Soon' }
      ]
    },
    {
      id: 'company',
      title: 'Company',
      links: [
        { name: 'About Us', href: '/about' },
        { name: 'Why Ghana–Nigeria', href: '#' },
        { name: 'Blog', href: '#' },
        { name: 'Careers', href: '#' },
        { name: 'Press', href: '#' }
      ]
    },
    {
      id: 'legal',
      title: 'Legal',
      links: [
        { name: 'Terms of Service', href: '#' },
        { name: 'Privacy Policy', href: '#' },
        { name: 'Compliance & AML', href: '#' },
        { name: 'Security', href: '#' },
        { name: 'Regulatory Disclosures', href: '#' }
      ]
    },
    {
      id: 'resources',
      title: 'Resources',
      links: [
        { name: 'Supported Corridors', href: '#' },
        { name: 'FX Transparency', href: '#' },
        { name: 'FAQs', href: '#faq' },
        { name: 'Status Page', href: '#' }
      ]
    }
  ];

  return (
    <footer className="bg-forest-950 text-cream-100 pt-12 sm:pt-16 lg:pt-20 pb-6 sm:pb-8 overflow-hidden relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-forest-900/50 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="container-saas w-full relative z-10">
        {/* CTA Section — 60px 40px, radius 24px */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-br from-gold-400 to-gold-600 rounded-2xl sm:rounded-[24px] text-center mb-10 sm:mb-12 relative overflow-hidden shadow-2xl shadow-gold-900/20 py-10 px-6 sm:py-12 sm:px-8 lg:py-[60px] lg:px-10"
        >

          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold text-forest-950 mb-4 sm:mb-6 tracking-tight leading-tight">
              Ready to simplify your <br className="hidden md:block" />{' '}
              cross-border payments?
            </h2>
            <p className="text-forest-900/80 text-base sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto font-medium">
              Join thousands of businesses sending money to Ghana faster,
              cheaper, and safer.
            </p>
            <motion.a
              href="/signup"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="touch-target inline-block bg-forest-950 text-white font-bold py-4 px-8 sm:px-10 rounded-2xl shadow-xl hover:bg-forest-900 transition-colors text-base sm:text-lg"
            >
              Start sending now
            </motion.a>
          </div>
        </motion.div>

        {/* Footer Content */}
        <div className="mb-12 border-b border-forest-800/50 pb-12">
          {/* Desktop: Grid Layout */}
          <div className="hidden md:grid grid-cols-5 gap-8">
            {/* Left Side - Brand */}
            <div className="col-span-1">
              <a href="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center">
                  <div className="w-3 h-5 bg-forest-950 rounded-full" />
                </div>
                <span className="text-2xl font-extrabold text-white tracking-tight">
                  beam
                </span>
              </a>
              <p className="text-gray-400 mb-3 leading-relaxed text-sm">
                Infrastructure for compliant Ghana–Nigeria business payments.
              </p>
              <p className="text-gray-500 mb-6 leading-relaxed text-xs">
                Powering secure, transparent cross-border settlement for African SMEs.
              </p>
              <div className="flex gap-3">
                {[Twitter, Linkedin, Instagram].map((Icon, i) =>
                  <a
                    key={i}
                    href="#"
                    className="w-9 h-9 rounded-full bg-forest-900 flex items-center justify-center text-gray-400 hover:bg-gold-500 hover:text-forest-950 transition-all duration-300">
                    <Icon size={16} />
                  </a>
                )}
              </div>
            </div>

            {/* Sections */}
            {sections.map((section) => (
              <div key={section.id}>
                <h4 className="font-bold text-white mb-5 text-base">
                  {section.title}
                </h4>
                <ul className="space-y-3">
                  {section.links.map((link) =>
                    <li key={link.name}>
                      <a
                        href={link.href}
                        className="text-gray-400 hover:text-gold-500 transition-colors flex items-center gap-1.5 text-sm group"
                      >
                        {link.name}
                        {link.badge && (
                          <span className="px-1.5 py-0.5 bg-forest-800 text-xs text-gold-400 rounded">
                            {link.badge}
                          </span>
                        )}
                        <ArrowUpRight
                          size={11}
                          className="opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all mt-0.5 flex-shrink-0" />
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>

          {/* Mobile: Accordion Layout */}
          <div className="md:hidden space-y-3">
            <div className="mb-6">
              <a href="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center">
                  <div className="w-3 h-5 bg-forest-950 rounded-full" />
                </div>
                <span className="text-2xl font-extrabold text-white tracking-tight">
                  beam
                </span>
              </a>
              <p className="text-gray-400 mb-2 leading-relaxed text-sm">
                Infrastructure for compliant Ghana–Nigeria business payments.
              </p>
              <p className="text-gray-500 mb-4 leading-relaxed text-xs">
                Powering secure, transparent cross-border settlement for African SMEs.
              </p>
              <div className="flex gap-3">
                {[Twitter, Linkedin, Instagram].map((Icon, i) =>
                  <a
                    key={i}
                    href="#"
                    className="w-9 h-9 rounded-full bg-forest-900 flex items-center justify-center text-gray-400 hover:bg-gold-500 hover:text-forest-950 transition-all duration-300">
                    <Icon size={16} />
                  </a>
                )}
              </div>
            </div>

            {sections.map((section) => (
              <div key={section.id} className="border-b border-forest-800/50">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between py-3 text-left group"
                >
                  <h4 className="font-bold text-white text-base">
                    {section.title}
                  </h4>
                  <motion.div
                    animate={{
                      rotate: openSections[section.id] ? 180 : 0
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown size={18} className="text-gray-400 group-hover:text-gold-500 transition-colors" />
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {openSections[section.id] && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="pb-3 space-y-3">
                        {section.links.map((link) => (
                          <li key={link.name}>
                            <a
                              href={link.href}
                              className="text-gray-400 hover:text-gold-500 transition-colors flex items-center gap-2 group/link text-sm"
                            >
                              {link.name}
                              {link.badge && (
                                <span className="px-1.5 py-0.5 bg-forest-800 text-xs text-gold-400 rounded">
                                  {link.badge}
                                </span>
                              )}
                              <ArrowUpRight
                                size={11}
                                className="opacity-0 -translate-y-0.5 translate-x-0.5 group-hover/link:opacity-100 group-hover/link:translate-y-0 group-hover/link:translate-x-0 transition-all"
                              />
                            </a>
                          </li>
                        ))}
                      </div>
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row gap-3 text-xs text-gray-500">
            <p>© 2025 Beam Financial Technologies. Built for Africa.</p>
            <span className="hidden md:inline">•</span>
            <p className="text-gold-400">Licensed & Partnered Financial Institutions</p>
          </div>
        </div>
      </div>
    </footer>);
}
