/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
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
    // Enable WASM
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Browser fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        http2: false,
        child_process: false,
        perf_hooks: false,
        crypto: false,
        stream: false,
        os: false,
        path: false,
        events: false,
        process: false,
      };
    }

    // Ignore JSON in /data
    config.module.rules.push({
      test: /data\/.*\.json$/,
      loader: 'ignore-loader',
    });

    return config;
  },
};

export default nextConfig;
