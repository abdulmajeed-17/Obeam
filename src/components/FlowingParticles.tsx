import React from 'react';

/**
 * Soft flowing particle grid — capital flow / financial bloodstream.
 * Faint horizontal particles, very slow, very subtle.
 * Works with Living Corridor for Obeam visual identity.
 */
const PARTICLE_COUNT = 24;
const ROWS = 4;

export function FlowingParticles() {
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    row: i % ROWS,
    delay: (i * 2.3) % 20,
    duration: 38 + (i % 5) * 4,
    size: 2 + (i % 3),
    opacity: 0.04 + (i % 3) * 0.02,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-forest-900/80 animate-flow-particle"
          style={{
            width: p.size,
            height: p.size,
            top: `${12 + p.row * 22}%`,
            left: 0,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `-${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
