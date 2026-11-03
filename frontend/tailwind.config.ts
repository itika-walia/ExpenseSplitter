import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          500: '#2f6fed',
          600: '#1f5ad6',
          700: '#1a49ad',
        },
      },
    },
  },
  plugins: [],
};

export default config;
