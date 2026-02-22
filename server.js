require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const {
    convertToWav,
    analyzeAudio,
    alignToStandard,
    scorePerformance,
    generateDiagnosticReport
} = require('./audioAnalysis');

const app = express();
const PORT = 8000;

// 排行榜文件路径
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

// --- 中间件配置 ---

// [DEBUG] 1. 全局请求日志 (最先执行)
// 如果请求到达服务器，你一定会在控制台看到打印
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

// --- API 路由 (必须放在 static 之前) ---

// [DEBUG] 2. 版本检测接口
app.get('/version', (req, res) => {
    res.send('Backend v3.0 (Leaderboard Enabled) is running!');
});

// [API] 排行榜接口
app.get('/leaderboard', (req, res) => {
    const songId = req.query.songId;
    console.log(`[API] 获取排行榜请求, songId: ${songId}`); // 确认逻辑执行

    const data = getLeaderboardData();

    if (songId) {
        // 返回特定歌曲的数组，如果没有则返回空数组
        const list = data[songId] || [];
        return res.json({ success: true, data: list });
    }
    res.json({ success: true, data: data });
});

// [API] 上传分析接口
const upload = multer({ dest: 'uploads/' });
['uploads', 'processed'].forEach(dir => { if(!fs.existsSync(dir)) fs.mkdirSync(dir); });

// 配置
const DEFAULT_API_KEY = process.env.LLM_API_KEY || "";
const DEFAULT_BASE_URL = process.env.LLM_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const DEFAULT_MODEL = process.env.LLM_MODEL_NAME || "";

// LLM 调用封装
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

// --- 歌曲库配置 ---
const SONGS_METADATA = [
    { id: 'yicheng', filename: '一程山路[vocals].mp3', name: '一程山路' },
    { id: 'ruyuan', filename: '如愿[vocals].mp3', name: '如愿' },
    { id: 'xxy', filename: '小幸运.mp3', name: '小幸运' }
];

const referenceLibrary = new Map();

const initReferenceLibrary = async () => {
    console.log("正在初始化歌曲库...");
    for (const song of SONGS_METADATA) {
        const p = path.resolve(__dirname, song.filename);
        if (fs.existsSync(p)) {
            console.log(`[Loading] ${song.name} (${song.filename})...`);
            const tmp = path.join('processed', `ref_${song.id}.wav`);
            try {
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

app.post('/analyze', upload.single('file'), async (req, res) => {
    if(!req.file) return res.status(400).json({error: 'No file'});

    const nickname = req.body.nickname || 'guest';
    const songId = req.body.songId || 'yicheng';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const targetFilename = `${nickname}_${songId}_${timestamp}.wav`;
    const inputPath = req.file.path;
    const outputPath = path.join('processed', targetFilename);

    try {
        console.log(`[处理] 用户: ${nickname}, 歌曲ID: ${songId}`);
        await convertToWav(inputPath, outputPath);

        const userAnalysis = await analyzeAudio(outputPath);
        const refData = referenceLibrary.get(songId);

        const responseData = {
            success: true,
            time_series: {
                axis: userAnalysis.time_series.axis,
                user_pitch: userAnalysis.time_series.pitch,
                dynamics: userAnalysis.time_series.dynamics,
                standard_pitch: []
            },
            scores: {},
            cavity_data: userAnalysis.features.resonance,
            detailed_analysis: null,
            ai_comment: ""
        };

        if(refData) {
            const aligned = alignToStandard(refData.pitch, userAnalysis.time_series.pitch, userAnalysis.time_series.dynamics);
            const scoreResult = scorePerformance(refData.pitch, aligned.pitch, refData.features, userAnalysis.features);
            const diagnosis = generateDiagnosticReport(aligned.pitch, refData.pitch, refData.axis);

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
                range: Math.min(100, userAnalysis.features.range * 3.5),
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

            const resMode = userAnalysis.features.resonance.head > 0.6 ? "头腔主导" :
                (userAnalysis.features.resonance.chest > 0.6 ? "胸腔主导" : "混合共鸣");
            const llmContext = { key_offset: scoreResult.details.keyOffset, jitter_val: (userAnalysis.features.jitter * 100).toFixed(2), vibrato_detected: userAnalysis.features.vibrato > 10, resonance_mode: resMode };

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
        console.error("Process Error:", e);
        res.status(500).json({error: e.message});
    } finally {
        try { if(fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch(e){}
    }
});

// [重要] 最后才加载静态文件，防止 /leaderboard 被当成文件名寻找
app.use(express.static(__dirname));

// 启动监听
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));