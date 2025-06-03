/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Add 'snappy' and '@mongodb-js/zstd' to this array.
    // This tells Next.js to treat these packages as external on the server-side,
    // preventing Webpack from attempting to bundle their native .node files,
    // which causes the build error.
    // Your MongoDB driver is already configured to use 'zlib' for compression,
    // so these packages are not strictly needed at runtime for your setup.
    serverComponentsExternalPackages: ['snappy', '@mongodb-js/zstd'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // You can add other Next.js configurations here if needed.
};

export default nextConfig;
