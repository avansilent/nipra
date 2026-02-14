/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
    './page.tsx',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['Space Grotesk', 'Poppins', 'Inter', 'sans-serif'],
        heading: ['Poppins', 'Space Grotesk', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
