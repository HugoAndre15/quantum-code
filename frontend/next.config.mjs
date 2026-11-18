/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/devis/accept/:path*", headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
    ] }];
  },
  images: {
    remotePatterns: [],
  },
  async rewrites() {
    const backend = process.env.INTERNAL_API_URL || "http://localhost:3001";
    return [
      {
        source: "/api/uploads/:path*",
        destination: `${backend}/uploads/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
