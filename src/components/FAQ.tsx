import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageCircle } from 'lucide-react';
const faqs = [
{
  question: 'How long does a transfer take?',
  answer:
  "Transfers are typically settled within 24 hours from the moment we receive your Naira payment. In many cases, it's even faster (same-day) depending on when you initiate the transaction."
},
{
  question: 'What exchange rate do you use?',
  answer:
  "We use the mid-market rate plus a small, transparent margin of 0.5%. You'll always see the exact rate before you confirm any transaction. No hidden markups."
},
{
  question: 'Is my money safe?',
  answer:
  'Absolutely. Beam is fully licensed and regulated by the CBN. We use bank-grade encryption to protect your data and funds at all times, and your funds are held in safeguarded accounts.'
},
{
  question: 'What is the minimum transfer amount?',
  answer:
  'You can send as little as ₦10,000. There is no maximum limit for verified business accounts, making it perfect for both small payments and large supplier settlements.'
}];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section id="faq" className="py-12 sm:py-16 lg:py-20 bg-white relative">
      <div className="container-saas w-full">
        <div className="max-w-3xl mx-auto">
        <motion.div
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
          className="text-center mb-10 sm:mb-16">

          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-forest-900 mb-4 sm:mb-6 tracking-tight">
            Questions? <span className="text-gold-500">We've got answers.</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600">
            Everything you need to know about sending money to Ghana.
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) =>
          <motion.div
            key={index}
            initial={{
              opacity: 0,
              y: 10
            }}
            whileInView={{
              opacity: 1,
              y: 0
            }}
            viewport={{
              once: true
            }}
            transition={{
              delay: index * 0.1
            }}
            className="group">

              <div
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${openIndex === index ? 'bg-white border-gold-500/30 shadow-lg shadow-gold-500/5' : 'bg-cream-50/50 border-transparent hover:bg-cream-50'}`}>

                <button
                type="button"
                onClick={() =>
                setOpenIndex(openIndex === index ? null : index)
                }
                className="touch-target w-full flex justify-between items-center p-4 sm:p-6 text-left focus:outline-none rounded-2xl"
                aria-expanded={openIndex === index}
              >

                  <span
                  className={`font-bold text-lg transition-colors ${openIndex === index ? 'text-forest-900' : 'text-gray-700'}`}>

                    {faq.question}
                  </span>
                  <motion.div
                  animate={{
                    rotate: openIndex === index ? 180 : 0
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 20
                  }}
                  className={`p-2 rounded-full ${openIndex === index ? 'bg-gold-100 text-gold-600' : 'bg-gray-100 text-gray-500'}`}>

                    <ChevronDown size={20} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {openIndex === index &&
                <motion.div
                  initial={{
                    height: 0,
                    opacity: 0
                  }}
                  animate={{
                    height: 'auto',
                    opacity: 1
                  }}
                  exit={{
                    height: 0,
                    opacity: 0
                  }}
                  transition={{
                    duration: 0.3,
                    ease: 'easeInOut'
                  }}>

                      <div className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                }
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </div>

        <motion.div
          initial={{
            opacity: 0
          }}
          whileInView={{
            opacity: 1
          }}
          viewport={{
            once: true
          }}
          className="mt-12 text-center">

          <p className="text-gray-500 mb-4">Still have questions?</p>
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-forest-900 text-white rounded-xl font-bold hover:bg-forest-800 transition-colors shadow-lg shadow-forest-900/10">
            <MessageCircle size={20} />
            Chat with our team
          </button>
        </motion.div>
        </div>
      </div>
    </section>);

}