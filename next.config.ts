import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          // 🔒 CSP: クロスサイトスクリプティング（XSS）対策
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
          },
          // 🔒 X-Frame-Options: クリックジャッキング対策
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // 🔒 X-Content-Type-Options: MIME type sniffing 対策
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // 🔒 X-XSS-Protection: ブラウザのXSS保護機能を有効化
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // 🔒 Referrer-Policy: リファラー情報の送信を制限
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // 🔒 Permissions-Policy: ブラウザ機能へのアクセスを制限
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // 🔒 Strict-Transport-Security: HTTPS強制
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
