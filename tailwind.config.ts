import type { Config } from 'tailwindcss';
export default { darkMode: 'class', content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] } } }, plugins: [] } satisfies Config;
