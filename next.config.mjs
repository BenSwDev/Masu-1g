/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'snappy',
    '@mongodb-js/zstd',
    'kerberos',
    'mongodb-client-encryption',
    // 'aws4' can remain here, but the webpack alias is more direct
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // For server-side builds, ensure 'aws4' is treated as external
      // or aliased to false if it's an optional dependency causing issues.
      // This prevents Webpack from trying to bundle it if it's not found
      // or not needed.
      config.externals.push('aws4');

      // Alternatively, if externals isn't enough, alias it to false:
      // config.resolve.alias = {
      //   ...config.resolve.alias,
      //   aws4: false,
      // };
    }

    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
