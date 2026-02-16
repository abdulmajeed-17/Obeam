import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowRight, PlayCircle } from 'lucide-react';

const TRANSFER_NOTIFICATIONS = [
  { id: 1, amount: '₵ 15,400', label: 'Kwame Enterprises' },
  { id: 2, amount: '₵ 8,200', label: 'Accra Supplies' },
  { id: 3, amount: '₵ 22,100', label: 'Kumasi Trading' },
];

const BASE_RATE = 98.5;
function useLiveRate(intervalMs = 4000) {
  const [rate, setRate] = useState(BASE_RATE);
  useEffect(() => {
    const t = setInterval(() => {
      setRate(prev => {
        const wiggle = (Math.random() - 0.5) * 0.12;
        return Math.round((prev + wiggle) * 100) / 100;
      });
    }, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return rate;
}

export function Hero() {
  const targetRef = useRef(null);
  const [notificationIndex, setNotificationIndex] = useState(0);
  const liveRate = useLiveRate(4500);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end start']
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);
  const yCard1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const yCard2 = useTransform(scrollYProgress, [0, 1], [0, -50]);

  useEffect(() => {
    const t = setInterval(() => {
      setNotificationIndex(i => (i + 1) % TRANSFER_NOTIFICATIONS.length);
    }, 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <section
      ref={targetRef}
      className="relative overflow-hidden flex items-center pt-12 pb-10 sm:pt-16 sm:pb-14 lg:pt-20 lg:pb-20"
      style={{ minHeight: 'min(85vh, 100dvh)' }}
    >

      {/* Background — Modern African tech: #F5F1E9 + subtle warmth gradient */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'radial-gradient(at 70% 30%, rgba(193, 147, 0, 0.08), transparent 50%), #F5F1E9',
        }}
      />

      <div className="container-saas w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-24 items-center relative">
          {/* Text Content */}
          <motion.div
            style={{ y, opacity }}
            className="relative z-10 text-center lg:text-left"
          >

            <motion.div
              initial={{
                opacity: 0,
                y: 20
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                delay: 0.1,
                duration: 0.5
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-gold-500/20 text-forest-900 text-sm sm:text-base font-bold mb-6 sm:mb-8 lg:mb-10 shadow-sm hover:shadow-md transition-shadow cursor-default">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-gold-500"></span>
              </span>
              New: Instant settlements to Ghana
            </motion.div>

            <h1 className="mb-5 sm:mb-6 lg:mb-8" style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="block font-extrabold text-[clamp(28px,7vw,64px)] sm:text-[clamp(36px,5.5vw,64px)] lg:text-[clamp(42px,5vw,64px)]"
                style={{ color: '#0E2F1C' }}
              >
                Pay Ghana suppliers in 24 hours.
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="block font-medium text-[clamp(22px,5vw,52px)] sm:text-[clamp(28px,4.5vw,52px)] lg:text-[clamp(38px,4.5vw,52px)]"
                style={{ color: '#5B6B62' }}
              >
                No hidden FX. No delays.
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-base sm:text-lg mb-2 sm:mb-3 max-w-[520px] mx-auto lg:mx-0 leading-relaxed font-medium"
              style={{ color: '#4B5563' }}
            >
              Move money to Ghana — without delays.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="text-sm font-medium mb-8 sm:mb-10"
              style={{ color: '#3A3A3A' }}
            >
              Built for modern African businesses.
            </motion.p>

            <motion.div
              initial={{
                opacity: 0,
                y: 20
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                delay: 0.6,
                duration: 0.5
              }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start mb-8 sm:mb-0 lg:mb-0">

              <motion.a
                href="/signup"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group touch-target bg-[#0B3B2E] hover:bg-[#0E4A39] text-white font-bold py-3.5 px-6 sm:py-4 sm:px-8 rounded-[14px] flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden shadow-[0_8px_20px_rgba(11,59,46,0.25)] hover:shadow-[0_12px_28px_rgba(11,59,46,0.3)] text-sm sm:text-base"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start sending
                  <span className="inline-block text-gold-400 transition-transform duration-200 ease-out group-hover:translate-x-1">
                    <ArrowRight size={20} />
                  </span>
                </span>
              </motion.a>

              <motion.button
                whileHover={{
                  scale: 1.05,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)'
                }}
                whileTap={{
                  scale: 0.95
                }}
                className="touch-target bg-white/50 backdrop-blur-sm border border-gray-200 text-forest-900 font-bold py-3.5 px-6 sm:py-4 sm:px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md text-sm sm:text-base">
                <PlayCircle size={20} />
                See how it works
              </motion.button>
            </motion.div>

            {/* Trust stack — only 3 in hero. Centred on mobile so third pill isn’t cut off. */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="mt-6 sm:mt-8 lg:mt-10 w-full flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-3"
            >
              {['24hr settlement', 'Transparent FX', 'CBN licensed'].map((pill) => (
                <span
                  key={pill}
                  className="inline-flex items-center px-2.5 py-1 rounded-full bg-forest-900/5 text-forest-800 text-[11px] sm:text-xs md:text-sm font-medium border border-forest-900/10 whitespace-nowrap"
                >
                  {pill}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Hero Graphic — balanced (card 420px), height 420px */}
          <motion.div
            style={{ scale }}
            className="relative z-10 h-[320px] sm:h-[380px] lg:h-[420px] w-full flex items-center justify-center perspective-1000"
          >
            {/* Faint African pattern — bottom right, atmospheric */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04] bg-african-pattern rounded-[1.75rem]"
              aria-hidden
            />
            {/* Animated pulse behind card — live, subtle (opacity 0.06 → 0.1, 9s loop) */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none animate-card-pulse"
              style={{
                background: 'radial-gradient(circle at 70% 40%, rgba(20, 92, 59, 0.85), transparent 60%)',
              }}
            />
            {/* Main Card — Stripe-level polish: clean shadow, float on hover (4–6s calm motion) */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -6 }}
              transition={{
                opacity: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
                y: { duration: 0.4, ease: 'easeOut' },
              }}
              className="relative z-10 w-full max-w-[420px] overflow-visible p-5 sm:p-6 lg:p-7 pb-14 sm:pb-7 rounded-[16px] sm:rounded-[18px] lg:rounded-[20px]"
              style={{
                background: '#FFFFFF',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 10px 25px rgba(0,0,0,0.05)',
              }}
            >

              {/* Card Header */}
              <div className="flex justify-between items-center mb-5 sm:mb-6 lg:mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-forest-900 rounded-lg flex items-center justify-center">
                    <div className="w-2 h-4 bg-gold-500 rounded-full" />
                  </div>
                  <span className="font-bold text-lg text-forest-900">
                    beam
                  </span>
                </div>
                <motion.div
                  className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1.5"
                  animate={{ boxShadow: ['0 0 0 0 rgba(34, 197, 94, 0)', '0 0 0 4px rgba(34, 197, 94, 0.15)', '0 0 0 0 rgba(34, 197, 94, 0)'] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                  </span>
                  Live
                </motion.div>
              </div>

              {/* Balance */}
              <div className="mb-5 sm:mb-6 lg:mb-8">
                <p className="text-gray-500 text-xs sm:text-sm font-medium mb-1">
                  Available Balance
                </p>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-forest-900 tracking-tight truncate">
                  ₦ 2,450,000.00
                </h3>
              </div>

              {/* Transaction List — smaller avatars on mobile */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-bold text-xs sm:text-sm shrink-0">
                      GH
                    </div>
                    <div className="pt-1.5 sm:pt-2">
                      <p className="font-bold text-gray-900 text-sm leading-tight">
                        Kwame Enterprises
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Supplier Payment</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900 text-sm shrink-0 ml-2">- ₵ 4,500</span>
                </div>
                <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-xl border border-gray-100 shadow-sm opacity-60">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs sm:text-sm shrink-0">
                      AB
                    </div>
                    <div className="pt-1.5 sm:pt-2">
                      <p className="font-bold text-gray-900 text-sm leading-tight">
                        Abidjan Logistics
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Shipping Fee</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900 text-sm shrink-0 ml-2">- ₣ 125,000</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6">
                <div className="w-full bg-forest-900 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-forest-900/20 cursor-pointer hover:bg-forest-800 transition-colors">
                  Send Money
                </div>
              </div>

              {/* FX badge — subtle float; on mobile sit inside card so not cut off */}
              <motion.div
                className="absolute bottom-2 right-2 sm:bottom-0 sm:right-0 sm:translate-x-2 sm:translate-y-2 z-20 flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-[#0B3B2E]/95 px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-lg border border-forest-800"
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
              >
                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                <motion.span
                  key={liveRate}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="text-[10px] sm:text-xs font-bold text-white tabular-nums"
                >
                  1 GHS = ₦{liveRate.toFixed(2)}
                </motion.span>
              </motion.div>
            </motion.div>

            {/* Animated Transfer Successful notifications — smaller on mobile, positioned to avoid overlapping balance */}
            <motion.div
              style={{ y: yCard1 }}
              className="absolute top-2 right-2 sm:right-2 md:top-4 md:right-4 z-20 max-w-[140px] sm:max-w-[180px] md:max-w-[200px]"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                className="relative"
              >
                <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5 sm:h-2 sm:w-2 z-10">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-full w-full rounded-full bg-green-500" />
                </span>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={TRANSFER_NOTIFICATIONS[notificationIndex].id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.35 }}
                    className="relative p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl cursor-default border transition-all duration-200 ease-out hover:scale-[1.02]"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #B8CFC4',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 12px 28px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-semibold" style={{ color: '#0E2F1C' }}>Transfer Successful</p>
                        <p className="text-xs sm:text-sm font-bold truncate" style={{ color: '#0E2F1C' }}>{TRANSFER_NOTIFICATIONS[notificationIndex].amount}</p>
                        <p className="text-[10px] sm:text-xs truncate" style={{ color: '#3A3A3A' }}>{TRANSFER_NOTIFICATIONS[notificationIndex].label}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </motion.div>

            </motion.div>
        </div>
      </div>
      
    </section>);

}