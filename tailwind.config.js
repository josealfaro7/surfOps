/** @type {import('tailwindcss').Config} */
// SurfOp Design System — adaptación del Style Reference "Earlydog" (Bauhaus) a Tailwind v3.
// Los tokens del bloque @theme (Tailwind v4) se traducen aquí a theme.extend para no migrar el build.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mismos valores que las CSS variables de :root (hex para permitir modificadores /opacidad)
        'cream-paper': '#fff9f0',
        'midnight-ink': '#000609',
        'signal-blue': '#0a65db',
        'ember-red': '#ee4623',
        'saffron-yellow': '#ffd23f',
        'blush-pink': '#f4c6c6',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        usual: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Archivo Black', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        caption: ['16px', { lineHeight: '1.78', letterSpacing: '0px' }],
        body: ['18px', { lineHeight: '1.82', letterSpacing: '0px' }],
        subheading: ['22px', { lineHeight: '1.82', letterSpacing: '0px' }],
        'heading-xs': ['32px', { lineHeight: '1.2', letterSpacing: '0.3px' }],
        'heading-sm': ['52px', { lineHeight: '1.23', letterSpacing: '0.47px' }],
        heading: ['80px', { lineHeight: '1.1', letterSpacing: '1.04px' }],
        display: ['116px', { lineHeight: '1.03', letterSpacing: '2.2px' }],
      },
      spacing: {
        13: '52px',
        18: '72px',
        22: '88px',
        26: '104px',
        30: '120px',
        // Tokens literales del sistema
        'ed-16': '16px',
        'ed-20': '20px',
        'ed-24': '24px',
        'ed-32': '32px',
        'ed-40': '40px',
        'ed-44': '44px',
        'ed-48': '48px',
        'ed-96': '96px',
        'ed-104': '104px',
        'ed-120': '120px',
        'ed-128': '128px',
      },
      maxWidth: {
        page: '1200px',
        measure: '480px',
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
}
