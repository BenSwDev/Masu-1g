/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint configuration - allow warnings but show them
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production', // Skip linting in production builds
    dirs: ['app', 'components', 'lib', 'actions', 'hooks', 'types']
  },
  
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'date-fns', '@radix-ui/react-dialog'],
    serverSourceMaps: true,
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // Optimize bundle splitting
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Don't run webpack optimizations in development
    if (dev) return config;
    
    // Enable modern JavaScript features
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Optimize chunks and bundle splitting
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
          common: {
            minChunks: 2,
            priority: -5,
            reuseExistingChunk: true,
          },
          // Large UI libraries
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|date-fns)[\\/]/,
            name: 'ui',
            priority: 5,
            chunks: 'all',
          },
          // Large utility libraries
          utils: {
            test: /[\\/]node_modules[\\/](lodash|ramda|moment|dayjs)[\\/]/,
            name: 'utils',
            priority: 3,
            chunks: 'all',
          },
        },
      },
    };
    
    return config;
  },
  
  // Enable static optimization
  trailingSlash: false,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Enable modern output
  output: 'standalone',
  
  // Headers for caching
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 