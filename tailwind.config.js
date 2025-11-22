/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/popup/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6D4AFF',
          dark: '#5436CC',
          light: '#8B6FFF',
        },
        bg: {
          primary: '#1C1B2E',
          secondary: '#2A2937',
          tertiary: '#3A384A',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A1A0B3',
          muted: '#6F6E80',
        },
        border: {
          DEFAULT: '#3A384A',
          light: '#4A4859',
        }
      },
    },
  },
  plugins: [],
}
