// next.config.js - REVERT TO ORIGINAL/EMPTY
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove the custom env loading logic
  experimental: {
    turbo: {}
  }
};

module.exports = nextConfig;
