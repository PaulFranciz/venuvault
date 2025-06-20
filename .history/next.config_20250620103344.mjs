/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable compression for better performance
  compress: true,
  
  // Power cache headers and compression
  poweredByHeader: false,
  
  // Enable experimental optimizations
  experimental: {
    // Optimize CSS loading
    optimizeCss: true,
    // Optimize package imports
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react', '@tanstack/react-query'],
    // Enable modern bundling
    esmExternals: true,
  },

  // Your existing config options here...
  webpack: (config, { isServer }) => {
    // Fix for 'electron' module not found error from dependencies like 'got'
    if (!isServer) {
      // Prevent bundling 'electron' on the client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        electron: false,
      };
    } else {
        // Optional: If you encounter electron issues server-side,
        // you might alias it to a dummy module or handle differently.
        // For now, we primarily address the client-side issue.
    }

    // Ignore warnings about Critical dependency: the request of a dependency is an expression
    // which can happen with dynamic requires in libraries like Keyv adapters.
     config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        /Critical dependency: the request of a dependency is an expression/,
     ];

    return config;
  },

  // Enhanced images configuration for better performance
  images: {
    // Enable modern formats for smaller file sizes
    formats: ['image/webp', 'image/avif'],
    // Increase cache TTL to 24 hours
    minimumCacheTTL: 86400,
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for srcSet
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Allow SVG images with caution
    dangerouslyAllowSVG: true,
    // Content security policy for SVGs
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Keep optimization enabled
    unoptimized: false,
    
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'beloved-raccoon-277.convex.cloud', // Your Convex deployment hostname
        port: '',
        pathname: '/api/storage/**', // Allow images specifically from Convex storage API path
      },
      {
        protocol: 'https',
        hostname: 'silent-mallard-468.convex.cloud',
        port: '',
        pathname: '/api/storage/**',
      },
      // Add other domains if needed
      {
        protocol: 'https',
        hostname: 'cdn.prod.website-files.com',
        port: '',
        pathname: '/**',
      },
    ],
    
    // Custom loader for better error handling
    loader: 'default',
    loaderFile: undefined,
  },
  
  // Headers for better caching and security
  async headers() {
    return [
      {
        // Cache static assets for 1 year
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache images for 1 week  
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Cache API routes for 30 seconds
        source: '/api/(events|discover|search)(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
};

export default nextConfig; 