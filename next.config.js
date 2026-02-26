/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Set up the redirect from homepage to betting-log
  async redirects() {
    return [
      {
        source: '/',
        destination: '/betting-log',
        permanent: false,
      },
    ]
  },

  // 2. Experimental features for Firebase and Cloud Workstations
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
    // This removes the "Cross origin request detected" warning in your terminal
    allowedDevOrigins: [
      '3000-firebase-studio-1768002829565.cluster-qewex6ficndhsr4lj7gyhcsnbe.cloudworkstations.dev'
    ]
  },

  // 3. Webpack configuration to protect the client bundle
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