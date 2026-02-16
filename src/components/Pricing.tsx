import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Zap } from 'lucide-react';
export function Pricing() {
  return (
    <section id="pricing" className="py-12 sm:py-16 lg:py-20 bg-cream-50 relative">
      <div className="container-saas w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-14 lg:gap-20 items-center">
          <motion.div
            initial={{
              opacity: 0,
              x: -50
            }}
            whileInView={{
              opacity: 1,
              x: 0
            }}
            viewport={{
              once: true
            }}
            transition={{
              duration: 0.8,
              type: 'spring'
            }}>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-100 text-gold-700 text-xs font-bold mb-6 uppercase tracking-wider">
              <Zap size={14} fill="currentColor" /> Transparent Pricing
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold text-forest-900 mb-6 sm:mb-8 tracking-tight">
              No hidden fees. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-500 to-gold-600">
                Just fair rates.
              </span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 sm:mb-10 leading-relaxed">
              We believe in radical transparency. You'll always know exactly
              what you're paying and exactly what your supplier receives. No
              surprise deductions.
            </p>

            <div className="space-y-6">
              {[
              {
                title: 'Real mid-market rates',
                desc: "We don't inflate the exchange rate to hide fees."
              },
              {
                title: 'Guaranteed settlement',
                desc: 'If we say 24 hours, we mean 24 hours.'
              },
              {
                title: 'Bank-grade security',
                desc: 'Licensed, regulated, and encrypted.'
              }].
              map((item, i) =>
              <motion.div
                key={i}
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
                  delay: i * 0.1
                }}
                className="flex items-start gap-4">

                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="font-bold text-forest-900 text-lg">
                      {item.title}
                    </h4>
                    <p className="text-gray-500">{item.desc}</p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              x: 50,
              rotate: 2
            }}
            whileInView={{
              opacity: 1,
              x: 0,
              rotate: 0
            }}
            viewport={{
              once: true
            }}
            transition={{
              duration: 0.8,
              type: 'spring'
            }}
            className="relative">

            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gold-500 rounded-[2rem] blur-2xl opacity-20 transform translate-y-4"></div>

            <div className="bg-white rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 md:p-8 lg:p-12 shadow-2xl border border-gray-100 relative z-10 overflow-hidden">
              {/* Decorative background */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-gold-50 to-transparent rounded-bl-full opacity-50 pointer-events-none"></div>

              <div className="mb-8 sm:mb-10 pb-8 sm:pb-10 border-b border-gray-100 relative">
                <p className="text-gray-500 font-bold uppercase tracking-wider text-xs sm:text-sm mb-2">
                  Transfer Fee
                </p>
                <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-forest-900"
                  >
                    2
                  </motion.span>
                  <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-forest-900">-</span>
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-forest-900"
                  >
                    2.5
                  </motion.span>
                  <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold-500">%</span>
                </div>
              </div>

              <div className="space-y-5 mb-10 relative">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">
                    Exchange Rate Markup
                  </span>
                  <span className="font-bold text-forest-900 bg-gray-50 px-3 py-1 rounded-lg">
                    0.5%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">
                    Monthly Fees
                  </span>
                  <span className="font-bold text-forest-900 bg-gray-50 px-3 py-1 rounded-lg">
                    ₦ 0
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Setup Fees</span>
                  <span className="font-bold text-forest-900 bg-gray-50 px-3 py-1 rounded-lg">
                    ₦ 0
                  </span>
                </div>
              </div>

              <div className="bg-forest-950 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-dot-pattern-white opacity-10"></div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-4 relative z-10">
                  Total Cost Comparison
                </p>

                {/* Animated Bars */}
                <div className="space-y-4 relative z-10">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold text-white">Beam</span>
                      <span className="text-gold-400 font-bold">~ 2%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{
                          width: 0
                        }}
                        whileInView={{
                          width: '33%'
                        }}
                        viewport={{
                          once: true
                        }}
                        transition={{
                          duration: 1,
                          delay: 0.5
                        }}
                        className="h-full bg-gold-500 rounded-full" />

                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Traditional Banks</span>
                      <span className="text-gray-400">~ 6%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{
                          width: 0
                        }}
                        whileInView={{
                          width: '100%'
                        }}
                        viewport={{
                          once: true
                        }}
                        transition={{
                          duration: 1,
                          delay: 0.7
                        }}
                        className="h-full bg-gray-600 rounded-full" />

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>);

}