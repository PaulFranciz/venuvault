/** @type {import('next').NextConfig} */
const nextConfig = {
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

  // Add the images configuration block
  images: {
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
  },
};

export default nextConfig; 