/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    optimizePackageImports: ['lucide-react', 'recharts', '@react-pdf/renderer'],
  },
  compress: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zfjghyexirywjmshqbtc.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
