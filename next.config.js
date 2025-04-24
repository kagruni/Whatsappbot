/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    esmExternals: 'loose',
  },
  transpilePackages: ['@tremor/react'],
}

module.exports = nextConfig 