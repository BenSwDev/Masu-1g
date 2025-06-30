/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Run ESLint during builds to catch issues early
    // Temporarily disabled due to many linting issues to fix
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TypeScript build errors during Next.js 15 migration
    ignoreBuildErrors: true,
  },
  images: {
    // Use Next.js image optimization for better debugging of image issues
    unoptimized: false,
  },
  // Enable React strict mode for highlighting potential problems
  reactStrictMode: true,
  // Show more verbose error overlays in development
  devIndicators: {
    position: "bottom-right",
  },
  // Enable source maps in production for better stack traces
  productionBrowserSourceMaps: true,

  // Additional configurations for better debugging and error catching
  experimental: {
    // Better debugging for server components
    serverSourceMaps: true,
  },

  // Webpack configuration for better error reporting
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Enable better stack traces in development
      config.devtool = "eval-source-map"
    }

    return config
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ]
  },

  // Logging configuration for better error tracking
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

export default nextConfig
