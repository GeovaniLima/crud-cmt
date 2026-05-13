/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        movtech: {
          'sidebar': '#0f1e36',
          'sidebar-dark': '#0a1729',
          'sidebar-light': '#1e2d3f',
          'sidebar-active': '#2b3f56',
          'sidebar-hover': '#1a2d45',
          'primary': '#1e3a5f',
          'primary-light': '#2a4d77',
          'border': '#dee2e6',
          'muted': '#6c757d',
          'header-bg': '#f1f3f5'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
};
