export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: '#1a1a17',
        paper: '#fbfaf7',
        accent: { DEFAULT: '#2f6f4f', soft: '#e7f0ea' },
      },
    },
  },
  plugins: [],
}
