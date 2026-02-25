// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle firebase-admin in client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'firebase-admin': false,
        'firebase-admin/app': false,
        'firebase-admin/firestore': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;