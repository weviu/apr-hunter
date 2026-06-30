import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // App Router only  no pages directory
  experimental: {
    // Explicitly opt in to strict mode for Server Components
  },
};

export default nextConfig;
