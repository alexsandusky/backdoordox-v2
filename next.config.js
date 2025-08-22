/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  headers: async () => ([
    {
      source: "/view/:path*",
      headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        {
          key: "Content-Security-Policy",
          value:
            "frame-ancestors https://backdoordox-v2.vercel.app https://*.backdoordox-v2.vercel.app;",
        },
      ],
    },
  ]),
}
module.exports = nextConfig
