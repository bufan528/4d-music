require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 8000;

// ==========================================
// 安全配置
// ==========================================
const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;
const NICKNAME_REGEX = /^[\u4e00-\u9fa5a-zA-Z0-9_\-]{1,20}$/;
const REQUIRED_TOKEN = process.env.API_TOKEN || '';

// CORS 允许来源：生产环境通过环境变量配置前端域名，多个用逗号分隔
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : true; // 开发环境默认允许所有

// ==========================================
// 性能优化配置（针对 1G 内存服务器）
// ==========================================
const MAX_CONCURRENT_ANALYSIS = 1;
const MAX_QUEUE_LENGTH = 5;
const ANALYSIS_TIMEOUT_MS = 120000;

// 有效音高帧占比下限：低于该比例视为"没有唱"，直接拒绝而不是给出虚高分数
const MIN_VALID_PITCH_RATIO = 0.05;

// ==========================================
// 排行榜（修复 EISDIR bug）
// ==========================================
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

// 启动时检查：如果 leaderboard.json 意外变成了目录，删除它
if (fs.existsSync(LEADERBOARD_FILE) && fs.statSync(LEADERBOARD_FILE).isDirectory()) {
    console.warn('[Fix] leaderboard.json 是目录，删除重建');
    fs.rmSync(LEADERBOARD_FILE, { recursive: true, force: true });
}
if (!fs.existsSync(LEADERBOARD_FILE)) {
    fs.writeFileSync(LEADERBOARD_FILE, '{}', 'utf8');
}

const getLeaderboardData = () => {
    try {
        return JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
    } catch (e) {
        console.error("读取排行榜失败:", e.message);
        return {};
    }
};

const updateLeaderboard = (songId, nickname, totalScore, detailedScores) => {
    const data = getLeaderboardData();
    if (!data[songId]) data[songId] = [];

    data[songId].push({
        nickname,
        score: totalScore,
        details: detailedScores,
        date: new Date().toISOString()
    });

    data[songId].sort((a, b) => b.score - a.score);
    if (data[songId].length > 50) data[songId] = data[songId].slice(0, 50);

    try {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error("写入排行榜失败:", e.message);
    }
};

// ==========================================
// Worker 线程池 + 请求队列
// ==========================================
let activeAnalysisCount = 0;
const analysisQueue = [];

function createAnalysisWorker(task) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'analysisWorker.js'));
        const timeout = setTimeout(() => {
            worker.terminate();
            reject(new Error('分析超时，请缩短录音时间或稍后重试'));
        }, ANALYSIS_TIMEOUT_MS);

        worker.on('message', (msg) => {
            clearTimeout(timeout);
            worker.terminate();
            if (msg.success) resolve(msg.result);
            else reject(new Error(msg.error));
        });

        worker.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });

        worker.postMessage(task);
    });
}

async function processAnalysisQueue() {
    if (activeAnalysisCount >= MAX_CONCURRENT_ANALYSIS || analysisQueue.length === 0) return;

    activeAnalysisCount++;
    const item = analysisQueue.shift();

    try {
        const result = await createAnalysisWorker(item.task);
        item.resolve(result);
    } catch (e) {
        item.reject(e);
    } finally {
        activeAnalysisCount--;
        setImmediate(processAnalysisQueue);
    }
}

function enqueueAnalysis(task) {
    return new Promise((resolve, reject) => {
        if (analysisQueue.length >= MAX_QUEUE_LENGTH) {
            return reject(new Error('服务器繁忙，请稍后重试（队列已满）'));
        }
        analysisQueue.push({ task, resolve, reject });
        processAnalysisQueue();
    });
}

// ==========================================
// LLM 客户端复用（避免每次请求 new OpenAI）
// ==========================================
const DEFAULT_API_KEY = process.env.LLM_API_KEY || "";
const DEFAULT_BASE_URL = process.env.LLM_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const DEFAULT_MODEL = process.env.LLM_MODEL_NAME || "";

const llmClients = new Map();

function getLLMClient(key, base) {
    const cacheKey = `${key}::${base}`;
    if (!llmClients.has(cacheKey)) {
        llmClients.set(cacheKey, new OpenAI({ apiKey: key, baseURL: base }));
    }
    return llmClients.get(cacheKey);
}

const callLLM = async (ctx, scores, config) => {
    const key = config.key || DEFAULT_API_KEY;
    // [安全修复] baseURL 是 SSRF 敏感项，只允许来自服务端环境变量，绝不接受客户端输入
    const base = DEFAULT_BASE_URL;
    const model = config.model || DEFAULT_MODEL;

    if (!key || key.length < 5) return "AI建议服务未连接。";

    const client = getLLMClient(key, base);
    const systemPrompt = `你是一位严厉但专业的声乐教授。请根据数据为学生提供训练建议。
    数据: 音准${scores.pitch}, 稳定性${scores.stability}, 技巧${scores.technique}, 情感${scores.emotion}, 共鸣${ctx.resonance_mode}, 评级${scores.rank}。
    输出要求: 3个建议板块(标题+内容+动作指令"听听...")。`;

    try {
        const completion = await client.chat.completions.create({
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "请给建议" }],
            model,
            temperature: 0.7,
            max_tokens: 400
        });
        return completion.choices[0].message.content;
    } catch (e) {
        console.error("AI Error:", e.message);
        return "AI连接失败";
    }
};

// ==========================================
// 歌曲库（异步初始化，不阻塞服务启动）
// ==========================================
const SONGS_METADATA = [
    { id: 'yicheng', filename: '一程山路[vocals].mp3', name: '一程山路' },
    { id: 'ruyuan', filename: '如愿[vocals].mp3', name: '如愿' },
    { id: 'xxy', filename: '小幸运[vocals].mp3', name: '小幸运' }
];

const VALID_SONG_IDS = new Set(SONGS_METADATA.map(s => s.id));
const referenceLibrary = new Map();
let isLibraryReady = false;

const initReferenceLibrary = async () => {
    console.log("[启动] 正在异步初始化歌曲库...");
    for (const song of SONGS_METADATA) {
        const p = path.resolve(__dirname, song.filename);
        if (fs.existsSync(p)) {
            const tmp = path.join('processed', `ref_${song.id}.wav`);
            try {
                const { convertToWav, analyzeAudio } = require('./audioAnalysis');
                await convertToWav(p, tmp);
                const res = await analyzeAudio(tmp);
                referenceLibrary.set(song.id, {
                    pitch: res.time_series.pitch,
                    dynamics: res.time_series.dynamics,
                    axis: res.time_series.axis,
                    features: res.features
                });
                console.log(`[歌曲库] ${song.name} 加载完成`);
            } catch (e) {
                console.error(`[歌曲库] 加载 ${song.name} 失败:`, e.message);
            } finally {
                if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
            }
        }
    }
    isLibraryReady = true;
    console.log(`[歌曲库] 初始化完成，共 ${referenceLibrary.size} 首歌曲`);
};

// ==========================================
// 中间件
// ==========================================
app.use((req, res, next) => {
    // [安全修复] 日志脱敏：避免 token 等敏感参数随 URL 落到访问日志里
    const safeUrl = String(req.originalUrl || req.url)
        .replace(/([?&](?:token|api_key|apikey|key)=)[^&]*/gi, '$1***');
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${safeUrl}`);
    next();
});

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// ==========================================
// 上传配置
// ==========================================
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: MAX_UPLOAD_SIZE }
});
['uploads', 'processed', 'public'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ==========================================
// API 路由
// ==========================================
app.get('/version', (req, res) => {
    res.send('Backend v3.3 (Security + Async Init + LLM Pool Optimized) is running!');
});

app.get('/health', (req, res) => {
    res.json({
        status: isLibraryReady ? 'ok' : 'loading',
        libraryReady: isLibraryReady,
        activeAnalysis: activeAnalysisCount,
        queueLength: analysisQueue.length,
        maxConcurrent: MAX_CONCURRENT_ANALYSIS,
        maxQueue: MAX_QUEUE_LENGTH,
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

app.get('/leaderboard', (req, res) => {
    const songId = req.query.songId;
    const data = getLeaderboardData();
    if (songId) {
        return res.json({ success: true, data: data[songId] || [] });
    }
    res.json({ success: true, data });
});

// --- 核心分析接口 ---
app.post('/analyze', upload.single('file'), async (req, res) => {
    // 歌曲库未就绪时返回友好提示
    if (!isLibraryReady) {
        return res.status(503).json({ error: '服务正在初始化歌曲库，请稍后重试（约10秒）' });
    }

    // API Token 校验
    if (REQUIRED_TOKEN) {
        // [安全修复] 只接受请求头传递，杜绝 token 出现在 URL 和访问日志中
        const token = req.headers['x-api-token'];
        if (token !== REQUIRED_TOKEN) {
            return res.status(401).json({ error: '未授权：缺少或无效的 API Token' });
        }
    }

    if (!req.file) return res.status(400).json({ error: 'No file' });

    const rawNickname = (req.body.nickname || 'guest').trim();
    if (!NICKNAME_REGEX.test(rawNickname)) {
        return res.status(400).json({ error: '昵称只能包含中英文、数字、下划线或短横线，长度1-20个字符' });
    }
    const nickname = rawNickname;

    const songId = req.body.songId || 'yicheng';
    if (!VALID_SONG_IDS.has(songId)) {
        return res.status(400).json({ error: '无效的歌曲ID' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const targetFilename = `${nickname}_${songId}_${timestamp}.wav`;
    const inputPath = req.file.path;
    const outputPath = path.join('processed', targetFilename);
    const refData = referenceLibrary.get(songId);

    if (!refData) {
        return res.status(500).json({ error: '参考歌曲数据未加载，请稍后重试' });
    }

    try {
        console.log(`[处理] 用户: ${nickname}, 歌曲: ${songId}, 队列: ${analysisQueue.length}, 活跃: ${activeAnalysisCount}`);

        const analysisResult = await enqueueAnalysis({
            inputPath,
            outputPath,
            songId,
            refData: {
                pitch: refData.pitch,
                dynamics: refData.dynamics,
                axis: refData.axis,
                features: refData.features
            }
        });

        const responseData = {
            success: true,
            time_series: {
                axis: analysisResult.time_series.axis,
                user_pitch: analysisResult.time_series.pitch,
                dynamics: analysisResult.time_series.dynamics,
                standard_pitch: []
            },
            scores: {},
            cavity_data: analysisResult.features.resonance,
            detailed_analysis: null,
            ai_comment: ""
        };

        // [正确性修复] 没有唱就不能给分：此前静音输入照样拿到 rhythm/stability 满分和 70+ 总分
        const validPitchFrames = analysisResult.features.validPitchFrames || 0;
        const totalFrames = analysisResult.features.totalFrames || 0;
        const validRatio = totalFrames > 0 ? validPitchFrames / totalFrames : 0;
        if (validRatio < MIN_VALID_PITCH_RATIO) {
            console.warn(`[拒绝] ${nickname} 有效音高帧 ${validPitchFrames}/${totalFrames} (${(validRatio * 100).toFixed(1)}%)，判定未检测到人声`);
            return res.status(422).json({
                error: '未检测到有效人声，请确认麦克风已开启并对着话筒演唱后重试',
                validPitchFrames: validPitchFrames,
                totalFrames: totalFrames
            });
        }

        if (analysisResult.aligned && analysisResult.scoreResult) {
            const aligned = analysisResult.aligned;
            const scoreResult = analysisResult.scoreResult;
            const diagnosis = analysisResult.diagnosis;

            responseData.time_series.user_pitch = aligned.pitch;
            responseData.time_series.dynamics = aligned.dynamics;
            responseData.time_series.standard_pitch = refData.pitch;

            responseData.scores = {
                pitch: scoreResult.details.pitch,
                rhythm: aligned.rhythmScore,
                stability: scoreResult.details.stability,
                tone: scoreResult.details.emotion,
                tension: scoreResult.details.emotion,
                technique: scoreResult.details.technique,
                articulation: scoreResult.details.pitch,
                range: Math.min(100, analysisResult.features.range * 3.5),
                emotion: scoreResult.details.emotion,
                rank: scoreResult.rank
            };

            responseData.detailed_analysis = diagnosis;
            responseData.lag_correction = aligned.lag;

            const totalScore = Math.round(
                (responseData.scores.pitch * 0.4) +
                (responseData.scores.rhythm * 0.2) +
                (responseData.scores.emotion * 0.2) +
                (responseData.scores.stability * 0.2)
            );

            updateLeaderboard(songId, nickname, totalScore, {
                pitch: responseData.scores.pitch,
                rhythm: responseData.scores.rhythm,
                rank: scoreResult.rank
            });

            const resMode = analysisResult.features.resonance.head > 0.6 ? "头腔主导" :
                (analysisResult.features.resonance.chest > 0.6 ? "胸腔主导" : "混合共鸣");
            const llmContext = {
                key_offset: scoreResult.details.keyOffset,
                jitter_val: (analysisResult.features.jitter * 100).toFixed(2),
                vibrato_detected: analysisResult.features.vibrato > 10,
                resonance_mode: resMode
            };

            responseData.ai_comment = await callLLM(llmContext, responseData.scores, {
                key: req.headers['x-api-key'],
                model: req.headers['x-api-model']
            });
        } else {
            responseData.scores = { pitch: 0, rhythm: 0, stability: 0, rank: '?' };
            responseData.ai_comment = "未找到歌曲标准数据。";
        }

        if (responseData.scores.pitch !== undefined) {
            responseData.radar_data = [
                responseData.scores.pitch, responseData.scores.rhythm, responseData.scores.stability,
                responseData.scores.tone, responseData.scores.tension, responseData.scores.technique,
                responseData.scores.articulation, responseData.scores.range, responseData.scores.emotion
            ];
        }

        res.json(responseData);

    } catch (e) {
        console.error("Process Error:", e.message);
        const isBusy = e.message.includes('队列已满') || e.message.includes('超时');
        res.status(isBusy ? 503 : 500).json({ error: e.message });
    } finally {
        try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (e) { }
    }
});

// 静态文件：只暴露 public 目录，不暴露源代码
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 启动服务（先启动 HTTP，再异步加载歌曲库）
// ==========================================
const server = app.listen(PORT, () => {
    console.log(`[启动] Server running on port ${PORT}`);
    console.log(`[配置] 并发=${MAX_CONCURRENT_ANALYSIS}, 队列=${MAX_QUEUE_LENGTH}, 超时=${ANALYSIS_TIMEOUT_MS / 1000}s`);
    console.log(`[安全] CORS=${ALLOWED_ORIGINS === true ? 'all' : ALLOWED_ORIGINS.join(',')}, 上传限制=${MAX_UPLOAD_SIZE / 1024 / 1024}MB`);
    // 异步初始化歌曲库，不阻塞服务
    initReferenceLibrary();
});

// 优雅关闭
const gracefulShutdown = (signal) => {
    console.log(`\n[关闭] 收到 ${signal}，正在优雅关闭...`);
    server.close(() => {
        console.log('[关闭] HTTP 服务器已关闭');
        process.exit(0);
    });
    // 10秒后强制退出
    setTimeout(() => {
        console.error('[关闭] 超时，强制退出');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
