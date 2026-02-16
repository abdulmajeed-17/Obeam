import React from 'react';
export function TrustBar() {
  const companies = [
  {
    name: 'Kobo360',
    font: 'font-serif'
  },
  {
    name: 'Flutterwave',
    font: 'font-sans'
  },
  {
    name: 'Kuda',
    font: 'font-mono'
  },
  {
    name: 'PiggyVest',
    font: 'font-sans'
  },
  {
    name: 'Paystack',
    font: 'font-serif'
  },
  {
    name: 'Moniepoint',
    font: 'font-sans'
  },
  {
    name: 'Bamboo',
    font: 'font-sans'
  },
  {
    name: 'Cowrywise',
    font: 'font-serif'
  }];

  // Duplicate list for seamless loop
  const marqueeItems = [...companies, ...companies, ...companies];
  return (
    <section className="pt-10 pb-8 sm:pt-14 sm:pb-10 lg:pt-20 lg:pb-12 border-y border-gray-100/50 bg-gradient-to-b from-cream-50/50 to-white overflow-hidden relative">
      {/* Gradient Masks */}
      <div className="absolute top-0 left-0 h-full w-24 bg-gradient-to-r from-cream-50/50 to-transparent z-10"></div>
      <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-cream-50/50 to-transparent z-10"></div>

      <div className="container-saas w-full mb-6">
        <p className="text-center text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest sm:tracking-[0.2em]">
          Trusted by forward-thinking businesses
        </p>
      </div>

      <div className="flex overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-4">
          {marqueeItems.map((company, index) =>
          <div
            key={`${company.name}-${index}`}
            className="mx-8 md:mx-16 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity duration-300 cursor-default">

              <span
              className={`text-lg sm:text-xl md:text-3xl font-bold text-forest-900 ${company.font}`}>

                {company.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>);

}