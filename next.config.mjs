/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // This option allows you to specify packages that should be treated as external
    // when building Server Components, Server Actions, and Route Handlers.
    // This is crucial for packages that include native Node.js addons (like .node files)
    // or rely on server-specific APIs that shouldn't be bundled by Webpack.
    //
    // By listing 'mongodb', we instruct Next.js not to bundle the MongoDB driver
    // and its (optional) native dependencies (e.g., 'snappy', '@mongodb-js/zstd')
    // into the server-side bundles. Instead, these packages will be 'require()'d
    // at runtime directly from the node_modules directory on the server.
    // This resolves the "Module parse failed" errors for .node files associated
    // with 'snappy', as Webpack will no longer attempt to process them.
    serverComponentsExternalPackages: ['mongodb'],
  },
  eslint: {
    // Disables ESLint checks during the build process.
    // This can speed up builds but means ESLint errors won't prevent a deployment.
    // It's generally recommended to fix ESLint errors rather than ignoring them.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disables TypeScript type checks during the build process.
    // This can speed up builds but means TypeScript errors won't prevent a deployment.
    // It's generally recommended to fix TypeScript errors rather than ignoring them.
    ignoreBuildErrors: true,
  },
  images: {
    // Disables Next.js Image Optimization.
    // Images will be served as-is, without automatic resizing, optimization, or format conversion.
    // Consider enabling optimization for better performance unless you have specific reasons to disable it.
    unoptimized: true,
  },
};

export default nextConfig;
