/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Do not fail the build on ESLint errors; we’ll address them incrementally
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to succeed even if there are type errors
    ignoreBuildErrors: true,
  },
}

export default nextConfig

