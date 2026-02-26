// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ❌ REMOVED: output: 'export'
  // Static export mode disables API routes, server components, and all SSR.
  // This was causing the 404 on every page. Your app uses Firebase Admin SDK
  // in server components and API routes — those require a running Node server.

  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent firebase-admin from being bundled into the client
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