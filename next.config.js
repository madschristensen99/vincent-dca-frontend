/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BACKEND_URL: 'https://vincent-dca-4e2200eeaaa1.herokuapp.com',
  },
}

module.exports = nextConfig