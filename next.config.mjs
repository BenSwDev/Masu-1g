/** @type {import('next').NextConfig} */
const nextConfig = {
  // This option allows you to specify packages that should be treated as external
  // when building Server Components, Server Actions, and Route Handlers.
  // By listing these, we instruct Next.js not to bundle them and their
  // native dependencies (e.g., .node files) into the server-side bundles.
  // Instead, these packages will be 'require()'d at runtime directly from
  // the node_modules directory on the server.
  //
  // We are including 'mongodb' itself, and also explicitly 'snappy' and
  // '@mongodb-js/zstd' because they are optional native dependencies of MongoDB
  // that seem to be causing issues with Webpack's bundling process.
  serverExternalPackages: [
    'mongodb',
    'snappy',
    '@mongodb-js/zstd',
    // 'kerberos', // Add if you use Kerberos and encounter similar issues
    // 'mongodb-client-encryption' // Add if you use CSFLE and encounter issues
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
};

export default nextConfig;
