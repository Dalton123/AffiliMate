import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@affilimate/db', '@affilimate/types'],
};

export default nextConfig;
