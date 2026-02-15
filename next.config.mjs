/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  experimental: {
    // This allows the cloud environment to properly tunnel the CSS chunks
    // and removes the "Cross origin request detected" warning
    allowedDevOrigins: [
      '3000-firebase-studio-1768002829565.cluster-qewex6ficndhsr4lj7gyhcsnbe.cloudworkstations.dev'
    ]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle Firebase Admin for client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        'firebase-admin': false,
        '@google-cloud/firestore': false,
      };
    }
    return config;
  },
};

export default nextConfig;
