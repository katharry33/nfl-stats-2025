/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Enhanced Logging for debugging API routes and Server Components
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // 2. Cloud Workstation Compatibility
  experimental: {
    // Allows the cloud environment to tunnel CSS/JS chunks without CORS issues
    allowedDevOrigins: [
      '3000-firebase-studio-1768002829565.cluster-qewex6ficndhsr4lj7gyhcsnbe.cloudworkstations.dev'
    ]
  },

  // 3. Image Optimization Stability
  images: {
    // If you still see "received null" for local images, set this to true
    // to bypass the sharp optimizer while maintaining the <Image> component benefits.
    unoptimized: false, 
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },

  // 4. Webpack Customization for WASM and Monorepo support
  webpack: (config, { isServer }) => {
    // Enable WebAssembly experiments
    config.experiments = { 
      ...config.experiments, 
      asyncWebAssembly: true,
      layers: true 
    };

    // Define where the WASM binary should be emitted
    // This fixes the "Module parse failed: Unexpected character" error
    config.output.webassemblyModuleFilename = isServer
      ? '../static/wasm/[modulehash].wasm'
      : 'static/wasm/[modulehash].wasm';

    // Rule for handling WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // Client-side Fallbacks & Bundle Stripping
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        // Crucial: Prevents Firebase Admin/Node-only libs from bloating the FE bundle
        'firebase-admin': false,
        '@google-cloud/firestore': false,
        '@google-cloud/storage': false,
        'child_process': false,
      };
    }

    return config;
  },
};

export default nextConfig;