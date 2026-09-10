/**
 * 音频分析 Worker 线程
 * 将 CPU 密集型操作（转码、音高提取、DTW对齐、评分）放到子线程，
 * 避免阻塞主线程事件循环，保证 /version、/leaderboard 等轻量请求始终响应。
 */
const { parentPort } = require('worker_threads');
const {
    convertToWav,
    analyzeAudio,
    alignToStandard,
    scorePerformance,
    generateDiagnosticReport
} = require('./audioAnalysis');
const fs = require('fs');

parentPort.on('message', async (task) => {
    const { inputPath, outputPath, refData } = task;
    let tempOutputCreated = false;

    try {
        // 1. 转码为 WAV
        await convertToWav(inputPath, outputPath);
        tempOutputCreated = true;

        // 2. 音频分析（音高提取、特征计算）—— 最耗时
        const userAnalysis = await analyzeAudio(outputPath);

        const result = {
            time_series: userAnalysis.time_series,
            features: userAnalysis.features,
            aligned: null,
            scoreResult: null,
            diagnosis: null
        };

        // 3. 如果有参考歌曲数据，执行 DTW 对齐、评分、诊断 —— 最耗内存
        if (refData && refData.pitch && refData.pitch.length > 0) {
            const aligned = alignToStandard(
                refData.pitch,
                userAnalysis.time_series.pitch,
                userAnalysis.time_series.dynamics
            );
            const scoreResult = scorePerformance(
                refData.pitch,
                aligned.pitch,
                refData.features,
                userAnalysis.features
            );
            const diagnosis = generateDiagnosticReport(
                aligned.pitch,
                refData.pitch,
                refData.axis
            );

            result.aligned = aligned;
            result.scoreResult = scoreResult;
            result.diagnosis = diagnosis;
        }

        parentPort.postMessage({ success: true, result });
    } catch (e) {
        console.error('[Worker] 分析失败:', e.message);
        parentPort.postMessage({ success: false, error: e.message || '分析失败' });
    } finally {
        // 清理临时 WAV 文件
        if (tempOutputCreated) {
            try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) {}
        }
    }
});
