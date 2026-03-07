/** @type {import('next').NextConfig} */
const nextConfig = {
  // allowedDevOrigins must be top-level (not inside experimental)
  allowedDevOrigins: [
    '3000-firebase-studio-1768002829565.cluster-qewex6ficndhsr4lj7gyhcsnbe.cloudworkstations.dev',
  ],

  async redirects() {
    return [
      {
        source: '/',
        destination: '/betting-log',
        permanent: false,
      },
    ];
  },

  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        'firebase-admin': false,
        'firebase-admin/app': false,
        'firebase-admin/auth': false,
        'firebase-admin/firestore': false,
        '@google-cloud/firestore': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;