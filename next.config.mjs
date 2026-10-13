/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.VERCEL ? undefined : (process.env.BUILD_STANDALONE === 'true' ? 'standalone' : 'export'),
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
