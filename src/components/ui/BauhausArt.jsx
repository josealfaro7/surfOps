import React from 'react';

/**
 * BauhausArt — Geometric Illustration Block del sistema de diseño SurfOp.
 * Composición plana de primitivas Bauhaus (cuadrados, círculos, semicírculos,
 * triángulos, tablero 8×8 y starburst). Todas las formas con esquinas de 0px,
 * sin sombras ni degradados. Es identidad visual, no contiene datos.
 */

const INK = 'var(--color-midnight-ink)';
const CREAM = 'var(--color-cream-paper)';
const BLUE = 'var(--color-signal-blue)';
const RED = 'var(--color-ember-red)';
const YELLOW = 'var(--color-saffron-yellow)';
const PINK = 'var(--color-blush-pink)';

function Tile({ type }) {
  switch (type) {
    case 'eye':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full block">
          <rect width="100" height="100" fill={BLUE} />
          <circle cx="50" cy="50" r="30" fill={CREAM} />
          <circle cx="58" cy="50" r="10" fill={INK} />
        </svg>
      );
    case 'circle':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full block">
          <rect width="100" height="100" fill={CREAM} />
          <circle cx="50" cy="50" r="42" fill={RED} />
        </svg>
      );
    case 'checker':
      return (
        <svg viewBox="0 0 8 8" className="w-full h-full block" shapeRendering="crispEdges">
          <rect width="8" height="8" fill={CREAM} />
          {Array.from({ length: 64 }, (_, i) => {
            const x = i % 8;
            const y = Math.floor(i / 8);
            return (x + y) % 2 === 0 ? (
              <rect key={i} x={x} y={y} width="1" height="1" fill={INK} />
            ) : null;
          })}
        </svg>
      );
    case 'burst':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full block">
          <rect width="100" height="100" fill={CREAM} />
          {Array.from({ length: 7 }, (_, i) => {
            const angle = (i * 15 * Math.PI) / 180;
            return (
              <line
                key={i}
                x1="0"
                y1="100"
                x2={Math.cos(angle) * 140}
                y2={100 - Math.sin(angle) * 140}
                stroke={INK}
                strokeWidth="1"
              />
            );
          })}
        </svg>
      );
    case 'burst-blue':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full block">
          <rect width="100" height="100" fill={BLUE} />
          {Array.from({ length: 24 }, (_, i) => {
            const angle = (i * 15 * Math.PI) / 180;
            return (
              <line
                key={i}
                x1="50"
                y1="50"
                x2={50 + Math.cos(angle) * 42}
                y2={50 + Math.sin(angle) * 42}
                stroke={CREAM}
                strokeWidth="1"
              />
            );
          })}
        </svg>
      );
    case 'semi':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full block">
          <rect width="100" height="100" fill={INK} />
          <path d="M0 100 A50 50 0 0 1 100 100 Z" fill={YELLOW} />
        </svg>
      );
    case 'semi-top':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full block">
          <rect width="100" height="100" fill={PINK} />
          <path d="M0 0 A50 50 0 0 0 100 0 Z" fill={BLUE} />
        </svg>
      );
    case 'triangle':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full block">
          <rect width="100" height="100" fill={PINK} />
          <polygon points="0,100 100,100 100,0" fill={BLUE} />
        </svg>
      );
    case 'triangle-red':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full block">
          <rect width="100" height="100" fill={YELLOW} />
          <polygon points="0,0 100,0 50,100" fill={RED} />
        </svg>
      );
    case 'quarter':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full block">
          <rect width="100" height="100" fill={YELLOW} />
          <path d="M0 0 L100 0 A100 100 0 0 1 0 100 Z" fill={INK} />
        </svg>
      );
    case 'sun':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full block">
          <rect width="100" height="100" fill={YELLOW} />
          <circle cx="50" cy="50" r="28" fill={RED} />
        </svg>
      );
    case 'wave':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full block">
          <rect width="100" height="100" fill={CREAM} />
          <path d="M0 50 A25 25 0 0 1 50 50 A25 25 0 0 1 100 50 L100 100 L0 100 Z" fill={BLUE} />
        </svg>
      );
    case 'pink':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full block">
          <rect width="100" height="100" fill={PINK} />
          <rect x="35" y="35" width="30" height="30" fill={INK} />
        </svg>
      );
    case 'ink':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full block">
          <rect width="100" height="100" fill={INK} />
          <circle cx="50" cy="50" r="18" fill={CREAM} />
        </svg>
      );
    case 'blue':
    default:
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full block">
          <rect width="100" height="100" fill={BLUE} />
        </svg>
      );
  }
}

const VARIANTS = {
  login: {
    cols: 3,
    tiles: ['eye', 'circle', 'checker', 'burst', 'wave', 'triangle', 'semi', 'pink', 'sun'],
  },
  config: { cols: 2, tiles: ['checker', 'eye', 'quarter', 'burst'] },
  attendance: { cols: 2, tiles: ['sun', 'burst', 'eye', 'semi-top'] },
  newclass: { cols: 2, tiles: ['wave', 'circle', 'burst-blue', 'checker'] },
  closing: { cols: 2, tiles: ['eye', 'triangle-red', 'checker', 'semi'] },
  rentals: { cols: 2, tiles: ['triangle', 'ink', 'sun', 'wave'] },
  mark: { cols: 2, tiles: ['eye', 'circle', 'checker', 'semi'] },
};

export default function BauhausArt({ variant = 'login', className = '' }) {
  const config = VARIANTS[variant] || VARIANTS.login;
  return (
    <div
      aria-hidden="true"
      className={`grid border border-midnight-ink bg-cream-paper ${className}`}
      style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))` }}
    >
      {config.tiles.map((type, idx) => (
        <div key={`${type}-${idx}`} className="aspect-square">
          <Tile type={type} />
        </div>
      ))}
    </div>
  );
}
