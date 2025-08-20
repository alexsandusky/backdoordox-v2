
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  experimental: {
    reactCompiler: false
  },
  headers: async () => {
    return [
      {
        source: "/view/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "no-referrer" }
        ]
      }
    ]
  }
}
module.exports = nextConfig;
