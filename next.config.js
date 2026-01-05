// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization to reduce server load
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;

