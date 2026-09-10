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

// 排行榜文件路径
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

// --- 安全配置 ---
const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;
const NICKNAME_REGEX = /^[\u4e00-\u9fa5a-zA-Z0-9_\-]{1,20}$/;
const REQUIRED_TOKEN = process.env.API_TOKEN || '';

// --- 性能优化配置（针对 1G 内存服务器）---
const MAX_CONCURRENT_ANALYSIS = 1;   // 同时最多 1 个分析任务（避免 OOM）
const MAX_QUEUE_LENGTH = 5;           // 最多排队 5 个请求
const ANALYSIS_TIMEOUT_MS = 120000;   // 单任务超时 120 秒

// --- Worker 线程池 + 请求队列 ---
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
        // 处理下一个排队任务
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

// --- 中间件 ---
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

app.use(cors());
app.use(express.json());

// --- 辅助函数 ---
const getLeaderboardData = () => {
    if (!fs.existsSync(LEADERBOARD_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
    } catch (e) {
        console.error("读取排行榜失败:", e);
        return {};
    }
};

const updateLeaderboard = (songId, nickname, totalScore, detailedScores) => {
    const data = getLeaderboardData();
    if (!data[songId]) data[songId] = [];

    data[songId].push({
        nickname: nickname,
        score: totalScore,
        details: detailedScores,
        date: new Date().toISOString()
    });

    data[songId].sort((a, b) => b.score - a.score);
    if (data[songId].length > 50) data[songId] = data[songId].slice(0, 50);

    try {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log(`[Leaderboard] Updated for ${songId}: ${nickname} - ${totalScore}`);
    } catch (e) {
        console.error("写入排行榜失败:", e);
    }
};

// --- API 路由 ---
app.get('/version', (req, res) => {
    res.send('Backend v3.2 (Worker Threads + Queue Optimized) is running!');
});

// 健康检查端点（含队列状态）
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
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
        const list = data[songId] || [];
        return res.json({ success: true, data: list });
    }
    res.json({ success: true, data: data });
});

// --- 上传配置 ---
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: MAX_UPLOAD_SIZE }
});
['uploads', 'processed'].forEach(dir => { if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

// --- LLM 配置 ---
const DEFAULT_API_KEY = process.env.LLM_API_KEY || "";
const DEFAULT_BASE_URL = process.env.LLM_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const DEFAULT_MODEL = process.env.LLM_MODEL_NAME || "";

const callLLM = async (ctx, scores, config) => {
    const key = config.key || DEFAULT_API_KEY;
    const base = config.base || DEFAULT_BASE_URL;
    const model = config.model || DEFAULT_MODEL;

    if(!key || key.length < 5) return "AI建议服务未连接。";

    const client = new OpenAI({ apiKey: key, baseURL: base });
    const systemPrompt = `你是一位严厉但专业的声乐教授。请根据数据为学生提供训练建议。
    数据: 音准${scores.pitch}, 稳定性${scores.stability}, 技巧${scores.technique}, 情感${scores.emotion}, 共鸣${ctx.resonance_mode}, 评级${scores.rank}。
    输出要求: 3个建议板块(标题+内容+动作指令"听听...")。`;

    try {
        const completion = await client.chat.completions.create({
            messages: [{role: "system", content: systemPrompt}, {role: "user", content: "请给建议"}],
            model: model,
            temperature: 0.7,
            max_tokens: 400
        });
        return completion.choices[0].message.content;
    } catch(e) {
        console.error("AI Error:", e.message);
        return "AI连接失败";
    }
};

// --- 歌曲库 ---
const SONGS_METADATA = [
    { id: 'yicheng', filename: '一程山路[vocals].mp3', name: '一程山路' },
    { id: 'ruyuan', filename: '如愿[vocals].mp3', name: '如愿' },
    { id: 'xxy', filename: '小幸运[vocals].mp3', name: '小幸运' }
];

const VALID_SONG_IDS = new Set(SONGS_METADATA.map(s => s.id));
const referenceLibrary = new Map();

const initReferenceLibrary = async () => {
    console.log("正在初始化歌曲库...");
    for (const song of SONGS_METADATA) {
        const p = path.resolve(__dirname, song.filename);
        if (fs.existsSync(p)) {
            console.log(`[Loading] ${song.name} (${song.filename})...`);
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
                console.log(`[Success] ${song.name} loaded.`);
            } catch (e) {
                console.error(`[Error] Failed to load ${song.name}:`, e.message);
            } finally {
                if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
            }
        } else {
            console.warn(`[Warning] File not found: ${song.filename}`);
        }
    }
    console.log(`歌曲库初始化完成。`);
};

initReferenceLibrary();

// --- 核心分析接口 ---
app.post('/analyze', upload.single('file'), async (req, res) => {
    // 安全校验
    if (REQUIRED_TOKEN) {
        const token = req.headers['x-api-token'] || req.query.token;
        if (token !== REQUIRED_TOKEN) {
            return res.status(401).json({ error: '未授权：缺少或无效的 API Token' });
        }
    }

    if(!req.file) return res.status(400).json({error: 'No file'});

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

    try {
        console.log(`[处理] 用户: ${nickname}, 歌曲: ${songId}, 队列: ${analysisQueue.length}, 活跃: ${activeAnalysisCount}`);

        // 将 CPU 密集型分析放入 Worker 线程 + 队列限流
        const analysisResult = await enqueueAnalysis({
            inputPath,
            outputPath,
            songId,
            refData: refData ? {
                pitch: refData.pitch,
                dynamics: refData.dynamics,
                axis: refData.axis,
                features: refData.features
            } : null
        });

        // 主线程构建响应（轻量操作）
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
                rank: scoreResult.rank,
                fittedPitch: scoreResult.fittedPitch
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

            // LLM 调用是网络 IO，留在主线程不阻塞
            responseData.ai_comment = await callLLM(llmContext, responseData.scores, {
                key: req.headers['x-api-key'],
                base: req.headers['x-api-base'],
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

    } catch(e) {
        console.error("Process Error:", e.message);
        const isBusy = e.message.includes('队列已满') || e.message.includes('超时');
        res.status(isBusy ? 503 : 500).json({ error: e.message });
    } finally {
        try { if(fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch(e){}
    }
});

// 静态文件
app.use(express.static(__dirname));

// 启动
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`[性能优化] Worker线程池: 并发=${MAX_CONCURRENT_ANALYSIS}, 队列=${MAX_QUEUE_LENGTH}, 超时=${ANALYSIS_TIMEOUT_MS/1000}s`);
});
