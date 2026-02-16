import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Living Corridor — One clear arc, one traveling dot.
 * Headline (Ghana) → arc → Send Money card. No labels, no FX on path, no clutter.
 */
const CORRIDOR_PATH = 'M 80 55 C 180 15, 220 15, 320 75 C 360 105, 360 145, 320 165';
const DOT_DURATION_MS = 14000;
const GLOW_INTERVAL_MS = 7000;

type Props = { onGlow?: () => void };

export function LivingCorridor({ onGlow }: Props) {
  const pathRef = useRef<SVGPathElement>(null);
  const [dotPosition, setDotPosition] = useState({ x: 80, y: 55 });
  const [glowPulse, setGlowPulse] = useState(false);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    const start = performance.now();
    let rafId: number;
    const tick = (now: number) => {
      const elapsed = (now - start) % DOT_DURATION_MS;
      const progress = elapsed / DOT_DURATION_MS;
      const point = path.getPointAtLength(progress * length);
      setDotPosition({ x: point.x, y: point.y });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setGlowPulse(true);
      onGlow?.();
    }, GLOW_INTERVAL_MS);
    return () => clearInterval(t);
  }, [onGlow]);
  useEffect(() => {
    if (!glowPulse) return;
    const id = setTimeout(() => setGlowPulse(false), 500);
    return () => clearTimeout(id);
  }, [glowPulse]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      <svg
        viewBox="0 0 400 220"
        className="w-full h-full opacity-[0.55]"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="corridor-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(200, 149, 46)" stopOpacity="0.5" />
            <stop offset="50%" stopColor="rgb(200, 149, 46)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="rgb(200, 149, 46)" stopOpacity="0.5" />
          </linearGradient>
          <filter id="corridor-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={glowPulse ? 2 : 1} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dot-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path ref={pathRef} d={CORRIDOR_PATH} fill="none" stroke="none" />
        <motion.path
          d={CORRIDOR_PATH}
          fill="none"
          stroke="url(#corridor-gradient)"
          strokeWidth={glowPulse ? 2 : 1.5}
          strokeLinecap="round"
          filter="url(#corridor-glow)"
          initial={{ pathLength: 0, opacity: 0.6 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />

        <motion.circle
          r="4"
          cx={dotPosition.x}
          cy={dotPosition.y}
          fill="#C8952E"
          filter="url(#dot-glow)"
          transition={{ type: 'tween', duration: 0.08 }}
        />
      </svg>
    </div>
  );
}
