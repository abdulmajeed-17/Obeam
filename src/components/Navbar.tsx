import React, { useState } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence } from
'framer-motion';
import { Menu, X } from 'lucide-react';
export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  
  // Match hero section warm beige - no white rectangle
  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ['rgba(245, 238, 219, 1)', 'rgba(245, 238, 219, 1)']
  );
  const backdropBlur = useTransform(
    scrollY,
    [0, 100],
    [0, 0]
  );
  const shadowOpacity = useTransform(
    scrollY,
    [0, 100],
    [0, 0.1]
  );
  const borderOpacity = useTransform(
    scrollY,
    [0, 100],
    [0, 0.5]
  );
  const paddingY = useTransform(
    scrollY,
    [0, 100],
    [24, 16]
  );
  const navLinks = [
  {
    name: 'How it works',
    href: '#how-it-works'
  },
  {
    name: 'Pricing',
    href: '#pricing'
  },
  {
    name: 'FAQ',
    href: '#faq'
  }];

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backgroundColor: 'rgba(243, 239, 231, 0.8)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        boxShadow: 'none',
        borderBottom: 'none',
        paddingTop: paddingY,
        paddingBottom: paddingY
      }}
      initial={{
        y: -100
      }}
      animate={{
        y: 0
      }}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 20
      }}>

      <div className="container-saas w-full">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="flex items-center gap-2 group">
              <motion.div
                className="w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/20"
                whileHover={{
                  rotate: 180
                }}
                transition={{
                  duration: 0.5,
                  type: 'spring'
                }}>

                <div className="w-3 h-5 bg-cream-50 rounded-full" />
              </motion.div>
              <span className="text-2xl font-extrabold text-forest-900 tracking-tight">
                beam
              </span>
            </a>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) =>
            <motion.a
              key={link.name}
              href={link.href}
              className="relative text-forest-900/80 hover:text-forest-900 font-medium transition-colors px-2 py-1"
              whileHover="hover"
              initial="initial">

                {link.name}
                <motion.div
                className="absolute bottom-0 left-0 w-full h-0.5 bg-gold-500 rounded-full"
                variants={{
                  initial: {
                    scaleX: 0,
                    opacity: 0
                  },
                  hover: {
                    scaleX: 1,
                    opacity: 1
                  }
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20
                }} />

              </motion.a>
            )}

            <motion.a
              href="/signup"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-forest-900 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-forest-900/20 hover:shadow-xl hover:shadow-forest-900/30 transition-all"
            >
              Start sending
            </motion.a>
          </div>

          {/* Mobile Menu Button — touch-friendly 44px target */}
          <div className="md:hidden touch-target">
            <button
              type="button"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-forest-900 p-3 -m-1 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen &&
        <motion.div
          initial={{
            opacity: 0,
            height: 0
          }}
          animate={{
            opacity: 1,
            height: 'auto'
          }}
          exit={{
            opacity: 0,
            height: 0
          }}
          className="md:hidden overflow-hidden"
          style={{ backgroundColor: '#FBF9F4' }}
        >
            <div className="container-saas pt-4 pb-8 space-y-1 flex flex-col">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="touch-target text-lg font-medium text-forest-900 py-3 px-4 hover:bg-gray-50 rounded-xl transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <a
                href="/signup"
                className="touch-target bg-forest-900 text-white font-bold py-4 px-6 rounded-xl text-center mt-4 shadow-lg shadow-forest-900/20"
              >
                Start sending
              </a>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </motion.nav>);

}