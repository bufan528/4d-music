import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            // 代理配置：将所有 /analyze 开头的请求转发给后端
            '/analyze': {
                target: 'http://101.200.13.100:8000', // 后端地址
                changeOrigin: true, // 允许跨域
                secure: false
            }
        }
    }
})