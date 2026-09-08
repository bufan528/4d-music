# 四维声乐后端 Dockerfile
# 基于 Node.js 18 slim，内置 ffmpeg
FROM node:18-slim

# 安装 ffmpeg（音频转码必需）
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制依赖清单（利用 Docker 缓存）
COPY package*.json ./

# 安装生产依赖
RUN npm install --production

# 复制源代码
COPY . .

# 创建运行时目录
RUN mkdir -p uploads processed

# 暴露端口
EXPOSE 8000

# 健康检查（可选）
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8000/version', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# 启动服务
CMD ["node", "server.js"]
