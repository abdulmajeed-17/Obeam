import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { TrustBar } from './components/TrustBar';
import { StatsSection } from './components/StatsSection';
import { HowItWorks } from './components/HowItWorks';
import { Features } from './components/Features';
import { Pricing } from './components/Pricing';
import { Testimonials } from './components/Testimonials';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import { AboutUs } from './components/AboutUs';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';

export function App() {
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/about') setCurrentPage('about');
    else if (path === '/dashboard') setCurrentPage('dashboard');
    else if (path === '/signup' || path === '/login') setCurrentPage(path.slice(1));
    else setCurrentPage('home');

    if (path === '/dashboard' && !localStorage.getItem('obeam_token')) {
      window.history.replaceState({}, '', '/login');
      setCurrentPage('login');
    }

    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/about') setCurrentPage('about');
      else if (path === '/dashboard') setCurrentPage('dashboard');
      else if (path === '/signup' || path === '/login') setCurrentPage(path.slice(1));
      else setCurrentPage('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor || !anchor.getAttribute('href')) return;

      const href = anchor.getAttribute('href') ?? '';

      if (href === '/about' || href === '#about') {
        e.preventDefault();
        window.history.pushState({}, '', '/about');
        setCurrentPage('about');
        return;
      }
      if (href === '/signup' || href === '/login') {
        e.preventDefault();
        window.history.pushState({}, '', href);
        setCurrentPage(href.slice(1));
        return;
      }
      if (href === '/dashboard') {
        e.preventDefault();
        window.history.pushState({}, '', '/dashboard');
        setCurrentPage('dashboard');
        return;
      }
      if (href === '/' || href === '') {
        e.preventDefault();
        if (currentPage !== 'home') {
          window.history.pushState({}, '', '/');
          setCurrentPage('home');
        }
        return;
      }

      e.preventDefault();
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [currentPage]);

  return (
    <AnimatePresence mode="wait">
      {currentPage === 'about' ? (
        <motion.div
          key="about"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="min-h-screen"
        >
          <AboutUs />
        </motion.div>
      ) : currentPage === 'signup' || currentPage === 'login' ? (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="min-h-screen"
        >
          <Auth />
        </motion.div>
      ) : currentPage === 'dashboard' ? (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="min-h-screen font-sans text-gray-900 selection:bg-gold-500/30"
        >
          <Dashboard />
        </motion.div>
      ) : (
        <motion.div
          key="home"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="min-h-screen font-sans text-gray-900 selection:bg-gold-500/30 overflow-x-hidden"
          style={{ backgroundColor: '#F5F1E9' }}
        >
          <Navbar />
          <main>
            <Hero />
            <TrustBar />
            <StatsSection />
            <HowItWorks />
            <Features />
            <Pricing />
            <Testimonials />
            <FAQ />
          </main>
          <Footer />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
