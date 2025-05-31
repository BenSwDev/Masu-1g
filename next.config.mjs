/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      }
    ],
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose', '@napi-rs/canvas'], // Add other large server-side packages if needed
  },
  webpack: (config, { isServer }) => {
    // Important: return the modified config
    if (!isServer) {
      // Exclude server-only modules from client-side bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        cardinal: false,
        'mongodb-client-encryption': false,
        kerberos: false,
        '@mongodb-js/zstd': false,
        'aws4': false,
        'snappy': false,
        'bson-ext': false,
        'util/types': false, // For 'util/types'
      };
    }

    // Fix for canvas.node binary if you use @napi-rs/canvas or similar
    // This might not be directly related to your current error but is a common fix
    // for binary modules with Next.js
    config.module.rules.push({
      test: /\.node$/,
      use: 'raw-loader',
    });
    
    return config;
  },
};

export default nextConfig;
