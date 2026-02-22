
---

# 🎤 四维声乐 - 智能演唱分析系统（Web MVP）

> 基于 **Node.js + Vue 3** 的实时声乐分析原型  
> 利用 **DSP 算法 + AI 逻辑**，从 **音准、气息、共振峰（腔体）、情感** 四个维度对用户演唱进行智能评估与可视化。

---

## 📁 项目目录结构

确保你的项目根目录包含以下核心文件：

```
4dmusic/
├── server.js          # 后端服务入口（Express）
├── audioAnalysis.js     # 核心音频分析算法（YIN/FFT/共振峰等）
├── index.html         # 前端交互页面（Vue 3 + Tailwind CSS + ECharts）
├── package.json       # 项目依赖配置
└── README.md          # 本说明文档
```

---

## ⚙️ 环境准备（非常重要！）

### ✅ 必备条件

| 组件      | 要求                          | 验证方式                     |
|-----------|-------------------------------|------------------------------|
| Node.js   | ≥ v14.0                       | `node -v`                    |
| FFmpeg    | 已安装并加入系统环境变量 Path | `ffmpeg -version`（必须成功）|

> 💡 **Windows 用户注意**：
> 1. 从 [FFmpeg 官网](https://ffmpeg.org/download.html) 下载静态编译包；
> 2. 解压后，将 `bin/` 目录路径添加到系统 **环境变量 `Path`** 中；
> 3. **重启终端或电脑** 使环境变量生效！

---

## 🚀 快速开始

### 第一步：安装依赖

在项目根目录打开终端，执行：

```bash
npm install
```

> 自动安装：`express`, `multer`, `fluent-ffmpeg`, `wav-decoder`, `pitchfinder`, `dsp.js` 等依赖。

---

### 第二步：启动服务

运行以下任一命令启动后端服务器：

```bash
node server.js
# 或
npm start
```

✅ 成功启动时，控制台将输出：
```
✅ 服务启动成功！访问 http://localhost:8000
```

---

### 第三步：访问使用

1. 打开 **Chrome / Edge** 浏览器；
2. 访问：[http://localhost:8000](http://localhost:8000)

> ⚠️ **重要提醒**：
> - 必须通过 `localhost` 访问！
> - **禁止** 使用本机 IP（如 `192.168.x.x`）或直接双击 `index.html`，否则浏览器会**阻止麦克风权限**！

---

## ❓ 常见问题排查

### Q1：点击录音无反应？

- 🔍 检查浏览器地址栏是否显示 **“已拦截麦克风”**。
- ✅ 确保 URL 是 `http://localhost:8000`（非 `file://` 或 IP 地址）。

---

### Q2：报错 `Error: spawn ffmpeg ENOENT`？

- ❌ 原因：FFmpeg 未安装 或 环境变量未配置。
- ✅ 解决方案：
    1. 重新检查【环境准备】章节；
    2. 运行 `ffmpeg -version` 确认可用；
    3. **重启命令行窗口**（必要时重启电脑）。

---

### Q3：报错 `Cannot find module '...'`？

- ❌ 原因：未安装依赖。
- ✅ 解决方案：在项目根目录运行：
  ```bash
  npm install
  ```

---

## 🛠️ 技术栈概览

| 层级   | 技术                                                                 |
|--------|----------------------------------------------------------------------|
| 前端   | Vue 3（CDN 引入）、Tailwind CSS、ECharts（可视化）                   |
| 后端   | Node.js + Express                                                   |
| 音频处理 | `fluent-ffmpeg`（格式转换）、`wav-decoder`（WAV 解码）               |
| 算法   | `pitchfinder`（YIN 音高检测）、`dsp.js`（FFT 频谱分析）、自定义共振峰 & 情感模型 |

---

> 🎶 **让每一次演唱，都被科学听见。**  
> —— 四维声乐 · Web MVP

--- 
