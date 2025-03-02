import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      aspectRatio: {
        '1': '1', // 1:1 비율
      },
      maxWidth: {
        '36r': '36rem', // 36rem
        '42r': '42rem', // 42rem
      },
      height: {
        'screen-90': '90vh', // 90vh
      },
      backgroundColor: {
        'semi-transparent': 'rgba(0, 0, 0, 0.2)',
        'semi-transparent-light': 'rgba(0, 0, 0, 0.1)',
        'semi-transparent-dark': 'rgba(0, 0, 0, 0.7)',
      },
    },
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // 가로 모드 감지 (높이가 500px 이하일 때)
      'landscape': {'raw': '(orientation: landscape) and (max-height: 500px)'},
      // 매우 작은 화면
      'tiny': {'raw': '(max-height: 400px)'},
    }
  },
  plugins: [],
} satisfies Config;
