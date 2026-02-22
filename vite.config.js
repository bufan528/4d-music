const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { convertToWav, analyzeAudio, alignToStandard } = require('./audioAnalysis');

const app = express();
const PORT = 8000;

// 关键修改：只分析纯人声文件，确保提取的“标准音高”不受伴奏干扰
const REFERENCE_VOCAL_FILE = '一程山路-高潮 [vocals].mp3';

// 全局缓存
let globalReferenceData = null;
let isReferenceProcessing = false;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const upload = multer({ dest: 'uploads/' });

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('processed')) fs.mkdirSync('processed');

/**
 * 数据插值工具：修复因录音质量导致的微小断层
 */
function interpolateData(data) {
  if (!data || data.length === 0) return [];

  const filled = [...data];
  let lastValidIndex = -1;

  for (let i = 0; i < filled.length; i++) {
    if (filled[i] !== null && filled[i] > 0) {
      if (lastValidIndex !== -1 && i - lastValidIndex > 1) {
        const startVal = filled[lastValidIndex];
        const endVal = filled[i];
        const steps = i - lastValidIndex;
        const stepVal = (endVal - startVal) / steps;

        for (let j = 1; j < steps; j++) {
          filled[lastValidIndex + j] = startVal + (stepVal * j);
        }
      }
      lastValidIndex = i;
    }
  }
  const firstValid = filled.find(v => v !== null);
  if (firstValid) {
    for(let i=0; i<filled.length; i++) {
      if(filled[i] === null) filled[i] = firstValid;
      else break;
    }
  }
  return filled;
}

const initReferenceData = async () => {
  const refPath = path.resolve(__dirname, REFERENCE_VOCAL_FILE);

  if (fs.existsSync(refPath)) {
    isReferenceProcessing = true;
    const fileSize = (fs.statSync(refPath).size / 1024 / 1024).toFixed(2);
    console.log(`[系统] 发现纯人声文件: ${REFERENCE_VOCAL_FILE} (${fileSize} MB)，开始高精度分析...`);

    const tempWav = path.join(__dirname, 'processed', 'reference_temp.wav');

    try {
      await convertToWav(refPath, tempWav);
      const result = await analyzeAudio(tempWav);

      const rawPitch = result.time_series.user_pitch;
      const validPoints = rawPitch.filter(p => p !== null).length;
      console.log(`[系统] 纯人声分析数据: 总点数 ${rawPitch.length}, 有效音高点 ${validPoints} (纯净度极高)`);

      // 即使是纯人声，为了图表美观，依然做轻微插值
      const smoothPitch = interpolateData(rawPitch);

      globalReferenceData = {
        pitch: smoothPitch,
        dynamics: result.time_series.dynamics,
        axis: result.time_series.axis // 保存原唱的时间轴
      };
      console.log(`[系统] 标准曲线生成完毕，已缓存。`);

    } catch (e) {
      console.error("[系统] 原唱处理失败:", e);
    } finally {
      if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
      isReferenceProcessing = false;
    }
  } else {
    console.log(`[提示] 未找到 ${REFERENCE_VOCAL_FILE}。`);
    console.log(`       请确保 [vocals].mp3 文件已放入根目录。`);
  }
};

initReferenceData();

app.post('/analyze', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传音频文件' });

  if (isReferenceProcessing) {
    await new Promise(r => setTimeout(r, 1000));
  }

  const inputPath = req.file.path;
  const outputPath = path.join('processed', `${req.file.filename}.wav`);

  try {
    console.log(`[处理] 用户上传: ${req.file.originalname}`);
    await convertToWav(inputPath, outputPath);

    const result = await analyzeAudio(outputPath);

    // 关键修改：执行曲线对齐 (DTW)
    if (globalReferenceData) {
      console.log(`[对齐] 正在执行 DTW 算法，自动对齐用户节奏...`);
      console.time("DTW Time");

      const aligned = alignToStandard(
          globalReferenceData.pitch,
          result.time_series.user_pitch,
          result.time_series.dynamics
      );

      console.timeEnd("DTW Time");

      // 用对齐后的数据覆盖原始数据
      result.time_series.user_pitch = aligned.pitch;
      result.time_series.dynamics = aligned.dynamics;

      // 强制使用原唱的时间轴和音高，确保图表长度一致
      result.time_series.standard_pitch = globalReferenceData.pitch;
      result.time_series.axis = globalReferenceData.axis;
    }

    const { avg_pitch, emotion } = result.llm_context;
    let aiComment = avg_pitch > 300
        ? "您的高音区很有张力，音准控制不错。"
        : "您的中低音非常磁性，气息稳健。";
    aiComment += ` 情感判定为“${emotion}”，`;

    if (result.scores.pitch < 70) {
      aiComment += "部分音符与原唱存在偏差，建议跟随伴奏多加练习。";
    } else {
      aiComment += "音准与原唱贴合度极高，节奏感完美！";
    }

    res.json({
      success: true,
      time_series: result.time_series,
      radar_data: result.radar_data,
      cavity_data: result.cavity_state,
      emotion_tags: [
        { name: result.emotion_tag, score: result.scores.emotion },
        { name: '稳定性', score: result.scores.breath }
      ],
      ai_comment: aiComment,
      scores: result.scores
    });

  } catch (error) {
    console.error("分析失败:", error);
    res.status(500).json({ error: '分析出错' });
  } finally {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (e) {}
  }
});

app.listen(PORT, () => {
  console.log(`服务已启动: http://localhost:${PORT}`);
  console.log(`当前工作目录: ${__dirname}`);
});