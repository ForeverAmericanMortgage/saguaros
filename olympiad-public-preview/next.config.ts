import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  async rewrites() {
    return { beforeFiles: [{ source: '/', has: [{ type: 'host', value: process.env.NODE_ENV === 'development'
      ? '(?:chairman\\.scottsdaleolympiad\\.com|chairman\\.localhost)' : 'chairman\\.scottsdaleolympiad\\.com' }],
      destination: '/olympiad/organizer' }], afterFiles: [], fallback: [] };
  },
};
export default nextConfig;
