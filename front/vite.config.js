import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// 后端地址通过环境变量注入，避免把生产服务器地址硬编码进公开仓库：
//   在 front/.env.local 中写 VITE_BACKEND_URL=http://your-backend:8000
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const backend = env.VITE_BACKEND_URL || 'http://localhost:8000'
    const backendProxy = {
        target: backend,
        changeOrigin: true,
        secure: false
    }
    return {
        plugins: [react()],
        server: {
            // 开发代理：把后端接口转发到 VITE_BACKEND_URL
            proxy: {
                '/analyze': backendProxy,
                '/leaderboard': backendProxy,
                '/version': backendProxy
            }
        }
    }
})