import type { NextConfig } from "next";
import { withAxiom } from 'next-axiom';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // 압축 활성화
  compress: true,
  
  // 이미지 최적화
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
  },
  
  // 기본 헤더 추가 - 캐싱 및 압축 관련
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ],
      },
      {
        source: '/asset/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ],
      },
    ];
  },

  // 웹팩 설정 추가
  webpack(config) {
    // 프로덕션 최적화
    if (!config.optimization) {
      config.optimization = {};
    }

    // punycode 폐지 경고 해결을 위한 설정 추가
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        punycode: false, // punycode 모듈 사용 중단
      },
    };

    return config;
  },
};

export default withAxiom(nextConfig);
