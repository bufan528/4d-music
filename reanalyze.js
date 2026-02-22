require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
    convertToWav,
    analyzeAudio,
    alignToStandard,
    scorePerformance
} = require('./audioAnalysis');

// --- 配置路径 ---
const PROCESSED_DIR = path.join(__dirname, 'processed');
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

// --- 歌曲元数据 (需与 server.js 保持一致) ---
const SONGS_METADATA = [
    { id: 'yicheng', filename: '一程山路[vocals].mp3', name: '一程山路' },
    { id: 'ruyuan', filename: '如愿[vocals].mp3', name: '如愿' },
    { id: 'xxy', filename: '小幸运[vocals].mp3', name: '小幸运' } // 注意文件名需对应
];

// 内存中的参考数据
const referenceLibrary = new Map();

// 1. 初始化参考音频 (复制自 server.js 逻辑)
const initReferenceLibrary = async () => {
    console.log("正在加载参考音频标准...");
    for (const song of SONGS_METADATA) {
        // 优先查找已存在的 wav 参考文件
        let refPath = path.join(PROCESSED_DIR, `ref_${song.id}.wav`);

        // 如果没有 ref_xxx.wav，尝试从源 mp3 生成
        if (!fs.existsSync(refPath)) {
            const sourcePath = path.resolve(__dirname, song.filename);
            if (fs.existsSync(sourcePath)) {
                console.log(`正在生成参考文件: ${song.name}...`);
                try {
                    await convertToWav(sourcePath, refPath);
                } catch (e) {
                    console.error(`无法转换参考文件 ${song.filename}:`, e.message);
                    continue;
                }
            } else {
                console.warn(`[Warning] 缺少参考源文件: ${song.filename}，将跳过此歌的分析。`);
                continue;
            }
        }

        try {
            const res = await analyzeAudio(refPath);
            referenceLibrary.set(song.id, {
                pitch: res.time_series.pitch,
                dynamics: res.time_series.dynamics,
                axis: res.time_series.axis,
                features: res.features
            });
            console.log(`[Loaded] ${song.name} 标准数据加载完成。`);
        } catch (e) {
            console.error(`分析参考文件失败 ${song.name}:`, e.message);
        }
    }
};

// 2. 批量处理逻辑
const runBatchAnalysis = async () => {
    // 先加载标准
    await initReferenceLibrary();

    if (referenceLibrary.size === 0) {
        console.error("没有加载到任何有效的参考歌曲，程序退出。");
        return;
    }

    if (!fs.existsSync(PROCESSED_DIR)) {
        console.error(`目录不存在: ${PROCESSED_DIR}`);
        return;
    }

    const files = fs.readdirSync(PROCESSED_DIR);
    const leaderboard = {}; // 临时存储排行榜数据 { songId: [entries] }

    console.log(`\n开始扫描 ${files.length} 个文件...\n`);

    for (const file of files) {
        // 过滤非用户录音文件 (跳过 ref_ 开头的文件，跳过非 .wav)
        if (!file.endsWith('.wav') || file.startsWith('ref_')) continue;

        // 解析文件名: nickname_songId_timestamp.wav
        // 注意：nickname 中可能包含下划线，所以我们倒着解析
        const parts = file.replace('.wav', '').split('_');

        // 至少要有 3 部分 (nickname, songId, timestamp)
        if (parts.length < 3) {
            console.log(`[Skip] 格式不符: ${file}`);
            continue;
        }

        // 假设最后一部分是时间，倒数第二部分是 songId
        // 这样可以兼容昵称里带下划线的情况
        const timestampStr = parts[parts.length - 1];
        const songId = parts[parts.length - 2];
        const nickname = parts.slice(0, parts.length - 2).join('_');

        // 检查该歌曲是否有参考标准
        const refData = referenceLibrary.get(songId);
        if (!refData) {
            console.log(`[Skip] 未知歌曲ID (${songId}): ${file}`);
            continue;
        }

        console.log(`正在分析: [${nickname}] 唱的《${songId}》...`);
        const filePath = path.join(PROCESSED_DIR, file);

        try {
            // A. 基础分析
            const userAnalysis = await analyzeAudio(filePath);

            // B. 对齐
            const aligned = alignToStandard(
                refData.pitch,
                userAnalysis.time_series.pitch,
                userAnalysis.time_series.dynamics
            );

            // C. 打分
            const scoreResult = scorePerformance(
                refData.pitch,
                aligned.pitch,
                refData.features,
                userAnalysis.features
            );

            // D. 计算总分 (保持与前端一致的权重)
            const scores = {
                pitch: scoreResult.details.pitch,
                rhythm: aligned.rhythmScore,
                stability: scoreResult.details.stability,
                emotion: scoreResult.details.emotion,
                rank: scoreResult.rank
            };

            const totalScore = Math.round(
                (scores.pitch * 0.4) +
                (scores.rhythm * 0.2) +
                (scores.emotion * 0.2) +
                (scores.stability * 0.2)
            );

            // E. 存入临时排行榜
            if (!leaderboard[songId]) leaderboard[songId] = [];

            // 获取文件实际修改时间作为备选时间
            const stat = fs.statSync(filePath);
            const date = stat.mtime.toISOString(); // 或使用文件名里的 timestampStr

            leaderboard[songId].push({
                nickname: nickname,
                score: totalScore,
                details: scores, // 保存详细分方便前端展示
                date: date
            });

            console.log(`   -> 得分: ${totalScore} (${scores.rank})`);

        } catch (e) {
            console.error(`   [Error] 分析失败: ${e.message}`);
        }
    }

    console.log(`\n分析完成，正在生成排行榜文件...`);

    // 3. 排序并截取 Top 50
    for (const sid in leaderboard) {
        // 分数从高到低
        leaderboard[sid].sort((a, b) => b.score - a.score);
        // 截取
        leaderboard[sid] = leaderboard[sid].slice(0, 50);
        console.log(`   ${sid}: 共有 ${leaderboard[sid].length} 条记录`);
    }

    // 4. 写入 JSON
    try {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2), 'utf8');
        console.log(`\n排行榜已成功保存至: ${LEADERBOARD_FILE}`);
    } catch (e) {
        console.error("写入文件失败:", e);
    }
};

// 执行
runBatchAnalysis();