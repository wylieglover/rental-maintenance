// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'blob.vercel-storage.com', pathname: '/**' }
    ]
  },

  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_BLOB_PUBLIC_PREFIX: 'https://blob.vercel-storage.com'
  }
}

export default nextConfig
