/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: '.next',
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vincent-dca-service.herokuapp.com',
  },
  // Ensure Next.js knows this is a standalone application
  output: 'standalone',
}

module.exports = nextConfig