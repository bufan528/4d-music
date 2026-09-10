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
├── analysisWorker.js      # 子线程入口（CPU 密集分析不阻塞主线程）
├── Dockerfile             # Docker 镜像构建（含 ffmpeg）
├── .dockerignore          # 构建上下文排除（防止 .env / 密钥被 COPY 进镜像）
├── docker-compose.yml     # 一键部署配置
├── package.json           # 后端依赖
├── front/                 # 前端（React 18 + Vite + Tailwind）
│   ├── src/
│   │   └── App.jsx        # 前端主组件（录音/分析/结果/排行榜）
│   └── package.json
├── 一程山路[vocals].mp3   # 参考人声片段（约 13.7 秒）
├── 如愿[vocals].mp3       # 参考人声片段（约 16.3 秒）
└── 小幸运[vocals].mp3     # 参考人声片段（约 26.1 秒）
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

# 配置后端地址（开发服务器代理目标）；不配置则默认 http://localhost:8000
echo "VITE_BACKEND_URL=http://localhost:8000" > .env.local

npm run dev
```

浏览器访问前端地址，可在设置面板中填写**后端地址**（例如 `http://localhost:8000`）。

> ℹ️ 设置面板中的 LLM `Base URL` 字段已移除：baseURL 由**服务端** `LLM_BASE_URL` 统一决定，不接受客户端指定（防 SSRF）。前端只需填 API Key 与 Model ID。
>
> 前端代码规范检查：`cd front && npm run lint`

---

## 🐳 Docker 部署（推荐）

### 一键启动

```bash
# 构建并启动（Compose V2 已改用 docker compose 子命令）
docker compose up -d --build

# 查看日志
docker compose logs -f

# 停止
docker compose down
```

### 环境变量配置

在 `docker-compose.yml` 同目录创建 `.env` 文件：

```env
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
LLM_MODEL_NAME=your_model_id
# 可选：防滥用令牌
API_TOKEN=your_secret_token_here
# 可选：允许跨域的前端域名（逗号分隔）。不设置则允许所有来源，生产环境建议设置
CORS_ORIGINS=https://your-frontend.example.com
```

部署后访问 `http://<服务器IP>:8000/version` 验证服务是否运行。

> ⚠️ **生产服务器部署注意**：
> 1. 安全组需放行 8000 端口
> 2. **务必设置 `API_TOKEN`**，否则 `/analyze` 可被任意调用并消耗你的 LLM 额度
> 3. **务必设置 `CORS_ORIGINS`**，否则任意站点都能跨域调用你的后端
> 4. DTW 已改为带状内存，1G 内存服务器可稳定运行

### 前端部署（Vercel）

`front/vercel.json` 里的 `destination` 目前是占位符 `https://REPLACE-WITH-YOUR-BACKEND-HOST`，**部署前必须替换成你自己的后端地址**（Vercel 的 `rewrites` 不支持环境变量插值，只能写死）。

同时注意后端要设置 `CORS_ORIGINS`，把 Vercel 域名加进白名单。

---

## 🔒 安全说明

- **昵称白名单**：仅允许中英文、数字、下划线、短横线，长度 1-20，防止路径穿越
- **歌曲ID校验**：必须在预设歌曲库中
- **上传大小限制**：单文件最大 20MB
- **可选令牌鉴权**：设置 `API_TOKEN` 后，`/analyze` 接口需携带 `x-api-token` 请求头（只接受请求头，不接受 URL query，避免令牌进入访问日志）
- **LLM baseURL 不可由客户端指定**：`x-api-base` 请求头已被忽略，baseURL 只能来自服务端 `LLM_BASE_URL`，防止 SSRF
- **访问日志脱敏**：`token` / `key` 等 query 参数在日志中打码
- **镜像构建排除敏感文件**：`.dockerignore` 阻止 `.env` / `.git` / `node_modules` 进入镜像层
- **排行榜持久化**：`leaderboard.json` 存储在服务端，Docker 部署时通过 volume 挂载

---

## 🧠 核心算法

1. **音高检测**：YIN 算法（pitchfinder），20ms 帧，2048 点 FFT
2. **后处理**：八度修正 → 去短音段 → 中值滤波 → 缺口插值
3. **特征提取**：jitter（微扰）、shimmer、颤音检测、音域、频谱质心（共鸣）
4. **对齐算法**：中位数移调预估 → ±300帧滞后搜索 → **带状 DTW**（内存优化）→ 线性回归残差算节奏分
5. **打分**：音准40% + 节奏20% + 情感20% + 稳定20%；评级 SSS~C 由 `音准×0.8 + 稳定×0.2` 单独计算
6. **无人声拦截**：有效音高帧占比低于 5% 时返回 422，不再对静音给出虚高分数
7. **AI 点评**：LLM（默认火山方舟）生成声乐教授建议

---

## ⚠️ 各评分维度可信度说明（如实标注）

本系统展示的九个维度**并非同等可信**，请按下表理解分数，不要当成同等权威的指标：

| 维度 | 实际计算方式 | 可信度 |
|------|--------------|--------|
| **音准** pitch | DTW 对齐后按半音偏差分档（<1 半音 = 100 分，>4 半音线性衰减） | **较高**。但会自动做整体移调补偿（取中位数偏移），因此「整首歌统一跑调、但音程关系正确」也会拿到高分 |
| **节奏** rhythm | 实为 **DTW 路径相对对角线的线性回归残差**，衡量的是「时间轴伸缩是否平滑」 | **偏低**，它**不是**节拍/节奏感，请当作「时间对齐度」来看 |
| **稳定** stability | 用户 jitter 与参考 jitter 之差 | **中等**。无有效音高时归 0 |
| **共鸣** tone / **共鸣丰满度** | 平均频谱质心线性映射到 0~1 | **粗略代理**，只能区分整体「偏亮 / 偏暗」 |
| **情感** emotion | `min(100, 70 + 头腔共鸣×20)`，**取值区间仅 70~90** | **低**。系统**没有建模**能量包络、乐句起伏、颤音速率等情感代理量，该分数不反映真实演唱情感 |
| **技巧** technique | 按「参考曲是否检出颤音 × 用户是否检出颤音」查表 | **低**，只有 60 / 75 / 85 / 90 / 95 五个离散值，仅作颤音有无的粗略反馈 |
| **瞬态爆发力** tension | 与 `emotion` 同值 | 与 emotion 同值，**非独立指标** |
| **音域** range | 有效音高半音跨度 × 3.5（封顶 100） | **中等**，约 28.6 个半音即满分 |

> 雷达图的 9 个轴中，`tone` 与 `tension` 都等于 `emotion`，`articulation` 等于 `pitch`，**实际独立维度只有 6 个**。
>
> 另需注意：`rank`（SSS~C）由 `音准×0.8 + 稳定×0.2` 单独计算，与排行榜总分（`音准40% + 节奏20% + 情感20% + 稳定20%`）**是两套口径**，两者不一致属预期行为。

---

## 📊 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/version` | 版本检测 |
| GET | `/health` | 健康检查（歌曲库就绪状态、队列长度、内存占用） |
| GET | `/leaderboard?songId=` | 获取排行榜 |
| POST | `/analyze` | 上传音频并分析（multipart/form-data） |

### /analyze 请求参数

| 字段 | 类型 | 说明 |
|------|------|------|
| file | file | 录音文件（webm/wav/mp3，最大20MB） |
| nickname | string | 昵称（白名单校验） |
| songId | string | 歌曲ID（yicheng/ruyuan/xxy） |
| x-api-token | header | 可选，设置 API_TOKEN 后必填 |
| x-api-key / x-api-model | header | 可选，使用调用方自己的 LLM 额度；**baseURL 不受支持，固定服务端配置** |

### /analyze 状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 分析成功 |
| 400 | 昵称不合法 / 歌曲 ID 无效 / 缺少文件 |
| 401 | 已启用 API_TOKEN 但令牌缺失或错误 |
| 422 | 未检测到有效人声（有效音高帧占比 < 5%），不产生分数也不写入排行榜 |
| 503 | 服务初始化中 / 队列已满 / 分析超时 |

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
