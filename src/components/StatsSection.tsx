import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
const StatItem = ({
  value,
  label,
  suffix = '',
  prefix = ''





}: {value: number;label: string;suffix?: string;prefix?: string;}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin: '-100px'
  });
  return (
    <div ref={ref} className="text-center">
      <div className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-1 sm:mb-2 font-sans tracking-tight">
        <span className="text-gold-500">{prefix}</span>
        {isInView ? <CountUp end={value} duration={2.5} /> : <span>0</span>}
        <span className="text-gold-500">{suffix}</span>
      </div>
      <p className="text-cream-200/95 text-xs sm:text-sm md:text-base font-medium uppercase tracking-wider">
        {label}
      </p>
    </div>);

};
// Simple CountUp component since we can't use external libs easily
const CountUp = ({ end, duration }: {end: number;duration: number;}) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / (duration * 1000), 1);
      // Easing function (easeOutExpo)
      const ease = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
      setCount(Math.floor(end * ease));
      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);
  return <span>{count.toLocaleString()}</span>;
};
export function StatsSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });
  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  return (
    <section
      ref={containerRef}
      className="py-12 sm:py-16 lg:py-20 bg-forest-950 relative overflow-hidden">

      {/* Background Elements */}
      <div className="absolute inset-0 bg-dot-pattern-white opacity-5"></div>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-forest-600/20 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-gold-500/10 rounded-full blur-[100px] animate-pulse-slow animation-delay-2000"></div>
      </div>

      <div className="container-saas w-full relative z-10">
        <motion.div
          style={{
            y,
            opacity
          }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 lg:gap-8">

          <StatItem
            value={12}
            suffix="B+"
            prefix="₦"
            label="Processed Volume" />

          <StatItem value={24} suffix="hr" label="Settlement Time" />
          <StatItem value={850} suffix="+" label="Active Businesses" />
          <StatItem value={99} suffix="%" label="Uptime Guarantee" />
        </motion.div>
      </div>
    </section>);

}