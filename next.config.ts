import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

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
  "frame-ancestors 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.supabase.co https://*.vercel.app https://vercel.app https://*.razorpay.com",
  `connect-src ${connectSrc}`,
  "frame-src 'self' https://*.supabase.co https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com",
  "form-action 'self' https://*.supabase.co",
].join("; ");

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
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
    ];
  },
};

export default nextConfig;