// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Turbopack where the root is
  experimental: {
    turbo: {
      resolveAlias: {
        // Add any aliases if needed
      }
    }
  }
};

module.exports = nextConfig;
