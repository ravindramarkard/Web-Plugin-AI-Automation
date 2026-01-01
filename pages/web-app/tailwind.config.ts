import type { Config } from 'tailwindcss';
import baseConfig from '@extension/tailwindcss-config/tailwind.config';

const config: Config = {
  ...baseConfig,
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
};

export default config;
