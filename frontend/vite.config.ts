import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core framework - 거의 변경 안 됨, 장기 캐싱 대상
          'vendor-react': ['react', 'react-dom'],
          // Firebase - 인증/DB SDK 분리 (큰 번들)
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          // 무거운 라이브러리 개별 분리
          'vendor-xlsx': ['xlsx'],
          'vendor-icons': ['lucide-react'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
    // esbuild 사용 (기본값, terser보다 빠름)
    minify: 'esbuild',
    // 청크 크기 경고 제한
    chunkSizeWarningLimit: 600,
    // 소스맵 비활성화 (프로덕션 번들 크기 절감)
    sourcemap: false,
    // CSS 코드 분할 활성화
    cssCodeSplit: true,
    // 타겟 브라우저 최적화 (모던 브라우저만)
    target: 'es2020',
    // Asset 인라인 임계값 (4KB 이하 인라인)
    assetsInlineLimit: 4096,
  },
  // 개발 서버 최적화
  server: {
    host: true,
    port: 5173,
  },
})
