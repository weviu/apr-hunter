import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-sora)', 'Inter', 'ui-sans-serif', 'system-ui'],
        body: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      backgroundImage: {
        'grid-glow':
          'radial-gradient(circle at center, rgba(16, 185, 129, 0.15), transparent 45%)',
      },
    },
  },
  plugins: [],
};

export default config;

