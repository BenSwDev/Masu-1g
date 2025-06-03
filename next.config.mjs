/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'snappy',
    '@mongodb-js/zstd',
    'kerberos',
    'mongodb-client-encryption',
    'aws4',
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
  // You can add other Next.js configurations here if needed.
};

export default nextConfig;
