# 四维声乐后端 Dockerfile
# 基于 Node.js 18 slim，内置 ffmpeg
FROM node:18-slim

# 换阿里云 Debian 镜像源（国内加速）
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list 2>/dev/null || true

# 安装 ffmpeg（音频转码必需）
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制依赖清单（利用 Docker 缓存）
COPY package*.json ./

# 安装生产依赖（npm ci 严格按 package-lock.json 安装，保证构建可复现）
RUN npm ci --omit=dev --registry=https://registry.npmmirror.com

# 复制源代码
COPY . .

# 创建运行时目录
RUN mkdir -p uploads processed public

# 复制参考歌曲音频文件到 public/ 目录，供前端播放
# 根目录的 [vocals].mp3 是分析用的参考文件，public/ 下的是前端播放用的
RUN cp "一程山路[vocals].mp3" "public/一程山路.mp3" && \
    cp "如愿[vocals].mp3" "public/如愿.mp3" && \
    cp "小幸运[vocals].mp3" "public/小幸运.mp3"

# 暴露端口
EXPOSE 8000

# 启动服务
CMD ["node", "server.js"]
