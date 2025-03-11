/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BACKEND_URL: 'https://vincent-dca-service.herokuapp.com',
  },
}

module.exports = nextConfig