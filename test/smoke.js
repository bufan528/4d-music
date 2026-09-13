/**
 * 后端冒烟测试：不依赖 ffmpeg/网络/LLM，纯内存合成信号验证核心算法口径。
 * 运行：npm test（后端根目录）
 *
 * 锁住的回归：
 * 1. analyzeAudio 热循环重构后音高检出仍准（440Hz 正弦 -> 430~450Hz）
 * 2. time_series.axis 为数字（前端图表依赖 Number() 兼容，字符串会走降级路径）
 * 3. 诊断报告用音分口径（半音差 -> 约100音分；跨声区公平）
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { analyzeAudio, generateDiagnosticReport } = require('../audioAnalysis');

function writeSineWav(filePath, freq, seconds = 2, sr = 16000) {
    const n = sr * seconds;
    const buf = Buffer.alloc(44 + n * 2);
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
    buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28);
    buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36);
    buf.writeUInt32LE(n * 2, 40);
    for (let i = 0; i < n; i++) {
        const s = Math.max(-1, Math.min(1, Math.sin(2 * Math.PI * freq * i / sr) * 0.5));
        buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
    }
    fs.writeFileSync(filePath, buf);
}

async function main() {
    const tmp = path.join(os.tmpdir(), `smoke_${process.pid}.wav`);
    try {
        writeSineWav(tmp, 440);
        const res = await analyzeAudio(tmp);

        const pitches = res.time_series.pitch.filter((x) => x !== null);
        assert(pitches.length / res.time_series.pitch.length > 0.5, '有效音高帧占比过低');
        const avg = pitches.reduce((a, b) => a + b, 0) / pitches.length;
        assert(avg > 430 && avg < 450, `440Hz 正弦检出 ${avg.toFixed(1)}Hz，超出容差`);
        assert(typeof res.time_series.axis[0] === 'number', 'axis 应为数字');

        const diag = generateDiagnosticReport([466.16, 466.16], [440, 440], [0, 1]);
        assert(diag.pitchDetails[0].includes('100.0音分'), `半音差应报约100音分，实际: ${diag.pitchDetails[0]}`);

        console.log(`smoke ok: 440Hz检出${avg.toFixed(1)}Hz, 诊断口径音分`);
    } finally {
        try { fs.unlinkSync(tmp); } catch (e) { /* ignore */ }
    }
}

main().catch((e) => { console.error('smoke FAILED:', e.message); process.exit(1); });
