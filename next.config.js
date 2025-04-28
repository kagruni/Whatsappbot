/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    esmExternals: 'loose',
  },
  transpilePackages: ['@tremor/react'],
  env: {
    // Make masked tokens available to the frontend
    NEXT_PUBLIC_WHATSAPP_TOKEN_MASK: '••••••••••••••••••••••••••••••',
    NEXT_PUBLIC_WHATSAPP_VERIFY_TOKEN_MASK: '••••••••••••••••••••••••••••••',
  },
}

module.exports = nextConfig 