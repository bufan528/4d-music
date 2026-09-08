---

# 🎤 四维声乐 - 智能演唱分析系统

> 基于 **Node.js + React** 的实时声乐分析系统  
> 利用 **DSP 算法 + AI 大模型**，从 **音准、节奏、稳定性、情感** 四个维度对用户演唱进行智能评估与可视化。

---

## 📁 项目目录结构

```
4d-music/
├── server.js              # 后端服务入口（Express + 安全加固）
├── audioAnalysis.js       # 核心音频分析算法（YIN/FFT/DTW 带状对齐）
├── reanalyze.js           # 批量重分析工具（重建排行榜）
├── Dockerfile             # Docker 镜像构建（含 ffmpeg）
├── docker-compose.yml     # 一键部署配置
├── package.json           # 后端依赖
├── front/                 # 前端（React 18 + Vite + Tailwind）
│   ├── src/
│   │   └── App.jsx        # 前端主组件（录音/分析/结果/排行榜）
│   └── package.json
├── 一程山路[vocals].mp3   # 参考歌曲（纯人声）
├── 如愿[vocals].mp3
└── 小幸运[vocals].mp3
```

---

## ⚙️ 环境准备

| 组件      | 要求                          | 验证方式                     |
|-----------|-------------------------------|------------------------------|
| Node.js   | ≥ v16.0                       | `node -v`                    |
| FFmpeg    | 已安装并加入系统环境变量 Path | `ffmpeg -version`（必须成功）|

> 💡 **Docker 部署可跳过本地环境准备**，镜像已内置 ffmpeg。

---

## 🚀 快速开始（本地运行）

### 第一步：安装后端依赖

```bash
npm install
```

### 第二步：配置环境变量（可选）

在项目根目录创建 `.env` 文件：

```env
# LLM 配置（不填则 AI 点评显示"未连接"）
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
LLM_MODEL_NAME=your_model_id

# 可选：设置后 /analyze 接口需要携带 x-api-token 请求头
# 防止被恶意调用刷 LLM 额度
API_TOKEN=your_secret_token_here

# 服务端口（默认 8000）
PORT=8000
```

### 第三步：启动后端

```bash
node server.js
# 或
npm start
```

### 第四步：启动前端

```bash
cd front
npm install
npm run dev
```

浏览器访问前端地址，在设置中配置后端地址（如 `http://localhost:8000`）。

---

## 🐳 Docker 部署（推荐）

### 一键启动

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### 环境变量配置

在 `docker-compose.yml` 同目录创建 `.env` 文件：

```env
LLM_API_KEY=your_api_key_here
LLM_MODEL_NAME=your_model_id
# 可选：防滥用令牌
API_TOKEN=your_secret_token_here
```

部署后访问 `http://<服务器IP>:8000/version` 验证服务是否运行。

> ⚠️ **阿里云轻量服务器部署注意**：
> 1. 安全组需放行 8000 端口
> 2. 建议配置 API_TOKEN 防止接口被滥用
> 3. DTW 已改为带状内存，1G 内存服务器可稳定运行

---

## 🔒 安全说明

- **昵称白名单**：仅允许中英文、数字、下划线、短横线，长度 1-20，防止路径穿越
- **歌曲ID校验**：必须在预设歌曲库中
- **上传大小限制**：单文件最大 20MB
- **可选令牌鉴权**：设置 `API_TOKEN` 后，`/analyze` 接口需携带 `x-api-token` 请求头
- **排行榜持久化**：`leaderboard.json` 存储在服务端，Docker 部署时通过 volume 挂载

---

## 🧠 核心算法

1. **音高检测**：YIN 算法（pitchfinder），20ms 帧，2048 点 FFT
2. **后处理**：八度修正 → 去短音段 → 中值滤波 → 缺口插值
3. **特征提取**：jitter（微扰）、shimmer、颤音检测、音域、频谱质心（共鸣）
4. **对齐算法**：中位数移调预估 → ±300帧滞后搜索 → **带状 DTW**（内存优化）→ 线性回归残差算节奏分
5. **打分**：音准40% + 节奏20% + 情感20% + 稳定20%，评级 SSS~C
6. **AI 点评**：LLM（默认火山方舟）生成声乐教授建议

---

## 📊 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/version` | 版本检测 |
| GET | `/leaderboard?songId=` | 获取排行榜 |
| POST | `/analyze` | 上传音频并分析（multipart/form-data） |

### /analyze 请求参数

| 字段 | 类型 | 说明 |
|------|------|------|
| file | file | 录音文件（webm/wav/mp3，最大20MB） |
| nickname | string | 昵称（白名单校验） |
| songId | string | 歌曲ID（yicheng/ruyuan/xxy） |
| x-api-token | header | 可选，设置 API_TOKEN 后必填 |

---

## ❓ 常见问题

### Q1：点击录音无反应？
- 确保通过 `localhost` 或 HTTPS 访问，浏览器才会授予麦克风权限

### Q2：报错 `Error: spawn ffmpeg ENOENT`？
- FFmpeg 未安装或环境变量未配置，运行 `ffmpeg -version` 确认
- Docker 部署无需手动安装

### Q3：分析超时或内存不足？
- 缩短录音时长（建议 1-2 分钟）
- 确保服务器内存 ≥ 512MB（DTW 已优化为带状存储）
- Docker 部署已设置 1G 内存限制

### Q4：AI 点评显示"未连接"？
- 未配置 `LLM_API_KEY`，在 `.env` 或 `docker-compose.yml` 中配置即可

---

> 🎶 **让每一次演唱，都被科学听见。**  
> —— 四维声乐

---
