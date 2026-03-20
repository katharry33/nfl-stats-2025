/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  experimental: {
    // Dynamically allow all origins in dev to prevent handshake hangs
    serverActions: {
      allowedOrigins: ["*"], 
    },
  },

  images: {
    unoptimized: true, // Set to true for faster dev boot
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },

  webpack: (config, { isServer }) => {
    // 1. Cleaner WASM support
    config.experiments = { 
      ...config.experiments, 
      asyncWebAssembly: true,
    };

    // 2. Fix for Firebase Admin & node-only modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        perf_hooks: false,
      };
    }

    // 3. Prevent webpack from trying to process your data folder
    config.module.rules.push({
      test: /data\/.*\.json$/,
      loader: 'ignore-loader',
    });

    return config;
  },
};

export default nextConfig;