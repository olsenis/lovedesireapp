/** @type {import('tailwindcss').Config} */
// Kept in sync with mobile app's design system:
//  - constants/colors.ts  → theme.extend.colors
//  - constants/fonts.ts   → theme.extend.fontFamily (loaded via Google Fonts in BaseLayout)
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        burgundy: '#880E4F',
        cream: '#FFF8F0',
        rose: '#F4A7B9',
        blush: '#FCE4EC',
        muted: '#9E7B84',
        border: '#F0D5DC',
      },
      fontFamily: {
        heading: ['"Cormorant Garamond"', 'serif'],
        body: ['"Lato"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
