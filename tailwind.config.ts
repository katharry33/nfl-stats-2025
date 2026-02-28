// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        // High-end Betting App Colors
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9', // Sidebar Background
          200: '#e2e8f0', // Borders
          900: '#0f172a', // Main Text
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7', // Active Link BG
          500: '#f59e0b', // Accent Border
          600: '#d97706', // Icons
          900: '#78350f', // Active Link Text
        },
      },
    },
  },
}

export default config;