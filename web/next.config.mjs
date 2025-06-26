/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    allowedDevOrigins: ['http://localhost:3000', 'http://localhost:5001', 'http://10.0.169.144:5001', 'http://10.0.1.4:8088', 'http://10.0.1.7:8088']
  },
}

export default nextConfig
