/** @type {import('tailwindcss').Config} */

// Paleta white-label: las clases blue-950 / blue-900 / sky-* / pink-600 que usa toda la UI
// leen las variables CSS que inyecta applySchoolThemeToDOM (src/lib/supabaseClient.js).
// Así, al elegir una paleta en el Módulo 01 cambia toda la interfaz sin tocar los componentes.
const mix = (variable, pct, base) => `color-mix(in srgb, var(${variable}) ${pct}%, ${base})`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        inter: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        blue: {
          800: mix('--brand-primary', 80, 'white'),
          900: 'var(--brand-primary-hover)',
          950: 'var(--brand-primary)',
        },
        sky: {
          100: mix('--brand-secondary', 12, 'white'),
          200: mix('--brand-secondary', 25, 'white'),
          300: mix('--brand-secondary', 45, 'white'),
          400: mix('--brand-secondary', 65, 'white'),
          500: mix('--brand-secondary', 85, 'white'),
          600: 'var(--brand-secondary)',
          700: mix('--brand-secondary', 85, 'black'),
          800: mix('--brand-secondary', 70, 'black'),
          900: mix('--brand-secondary', 55, 'black'),
        },
        pink: {
          600: 'var(--brand-accent)',
        },
      },
    },
  },
  plugins: [],
};
