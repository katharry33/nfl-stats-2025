/** @type {import('next').NextConfig} */
const nextConfig = {
  // Move it INSIDE experimental for Next.js 14
  experimental: {
    serverExternalPackages: ['firebase-admin'],
    serverActions: {
      allowedOrigins: ['*'],
    },
  },

  logging: {
    fetches: { fullUrl: true },
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    ],
  },

  webpack: (config, { isServer }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, net: false, tls: false, http2: false,
        child_process: false, perf_hooks: false, crypto: false,
        stream: false, os: false, path: false, events: false, process: false,
      };
    }

    config.module.rules.push({
      test: /data\/.*\.json$/,
      loader: 'ignore-loader',
    });

    return config;
  },
};

export default nextConfig;