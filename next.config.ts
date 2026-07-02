import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

const getOrigin = (value?: string) => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const r2PublicOrigin = getOrigin(process.env.R2_PUBLIC_BASE_URL ?? process.env.CLOUDFLARE_R2_PUBLIC_URL);
const cloudflareAssetSrc = [
  "https://iframe.videodelivery.net",
  "https://*.cloudflarestream.com",
  "https://*.r2.cloudflarestorage.com",
  "https://*.r2.dev",
  ...(r2PublicOrigin ? [r2PublicOrigin] : []),
];

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  "https://*.vercel-insights.com",
  "https://*.razorpay.com",
  "https://checkout.razorpay.com",
  ...(isDevelopment ? ["'unsafe-eval'"] : []),
].join(" ");

const connectSrc = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  ...cloudflareAssetSrc,
  "https://iframe.mediadelivery.net",
  "https://video.bunnycdn.com",
  "https://*.bunnycdn.com",
  "https://*.b-cdn.net",
  "https://*.vercel.app",
  "https://vercel.app",
  "https://*.vercel-insights.com",
  "https://*.razorpay.com",
  "https://api.razorpay.com",
  "https://checkout.razorpay.com",
  ...(isDevelopment ? ["http:", "ws:", "http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*", "ws://127.0.0.1:*"] : []),
].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  `script-src ${scriptSrc}`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  `img-src 'self' data: blob: https://*.supabase.co https://*.vercel.app https://vercel.app https://*.razorpay.com ${cloudflareAssetSrc.join(" ")} https://iframe.mediadelivery.net https://video.bunnycdn.com https://*.bunnycdn.com https://*.b-cdn.net`,
  `connect-src ${connectSrc}`,
  `frame-src 'self' https://*.supabase.co ${cloudflareAssetSrc.join(" ")} https://iframe.mediadelivery.net https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com`,
  `media-src 'self' blob: ${cloudflareAssetSrc.join(" ")} https://iframe.mediadelivery.net https://video.bunnycdn.com https://*.bunnycdn.com https://*.b-cdn.net`,
  "form-action 'self' https://*.supabase.co",
].join("; ");

const fileReaderContentSecurityPolicy = contentSecurityPolicy.replace("frame-ancestors 'none'", "frame-ancestors 'self'");

const fileReaderHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Content-Security-Policy",
    value: fileReaderContentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          ...(isDevelopment
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]),
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
      {
        source: "/api/notes/:noteId/file",
        headers: fileReaderHeaders,
      },
      {
        source: "/api/materials/:materialId/file",
        headers: fileReaderHeaders,
      },
    ];
  },
};

export default nextConfig;
