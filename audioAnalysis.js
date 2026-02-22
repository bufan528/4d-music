const fs = require('fs');
const wavDecoder = require('wav-decoder');
const Pitchfinder = require('pitchfinder');
const ffmpeg = require('fluent-ffmpeg');
const DSP = require('dsp.js');

// ==========================================
// 1. 基础数学与信号处理工具
// ==========================================

function applyHanningWindow(buffer) {
    const N = buffer.length;
    const windowed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        const multiplier = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
        windowed[i] = buffer[i] * multiplier;
    }
    return windowed;
}

function smoothOctaves(pitchArr) {
    if (pitchArr.length < 2) return pitchArr;
    const result = [...pitchArr];
    for (let i = 1; i < result.length; i++) {
        const prev = result[i-1];
        const curr = result[i];
        if (prev && curr) {
            if (curr > prev * 1.8 && curr < prev * 2.2) result[i] = curr / 2;
            else if (curr > prev * 0.45 && curr < prev * 0.55) result[i] = curr * 2;
        }
    }
    return result;
}

function calcVariance(arr, mean) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== null && arr[i] > 0) {
            const diff = arr[i] - mean;
            sum += diff * diff;
            count++;
        }
    }
    return count > 0 ? sum / count : 0;
}

function medianFilter(arr, windowSize = 5) {
    if (!arr || arr.length === 0) return [];
    const result = new Array(arr.length);
    const half = Math.floor(windowSize / 2);
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === null) { result[i] = null; continue; }
        const window = [];
        const start = Math.max(0, i - half);
        const end = Math.min(arr.length - 1, i + half);
        for (let j = start; j <= end; j++) {
            if (arr[j] !== null && arr[j] > 0) window.push(arr[j]);
        }
        if (window.length === 0) { result[i] = arr[i]; }
        else { window.sort((a, b) => a - b); result[i] = window[Math.floor(window.length / 2)]; }
    }
    return result;
}

function movingAverageSmooth(arr, windowSize = 7) {
    const result = [...arr];
    const half = Math.floor(windowSize / 2);

    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === null) continue;

        let sum = 0;
        let count = 0;

        for (let j = Math.max(0, i - half); j <= Math.min(arr.length - 1, i + half); j++) {
            if (arr[j] !== null && arr[j] > 0) {
                sum += arr[j];
                count++;
            }
        }

        if (count > 0) {
            result[i] = sum / count;
        }
    }
    return result;
}

function cleanupShortSegments(pitchArr, minFrames = 5) {
    const result = [...pitchArr];
    let segmentStart = -1;

    for (let i = 0; i < result.length; i++) {
        const isSound = result[i] !== null && result[i] > 0;

        if (isSound) {
            if (segmentStart === -1) segmentStart = i;
        } else {
            if (segmentStart !== -1) {
                const length = i - segmentStart;
                if (length < minFrames) {
                    for (let k = segmentStart; k < i; k++) result[k] = null;
                }
                segmentStart = -1;
            }
        }
    }
    if (segmentStart !== -1) {
        const length = result.length - segmentStart;
        if (length < minFrames) {
            for (let k = segmentStart; k < result.length; k++) result[k] = null;
        }
    }
    return result;
}

function interpolateGaps(arr, maxGapSize = 5, isDynamics = false) {
    const res = [...arr];
    let lastValidIdx = -1;

    for (let i = 0; i < res.length; i++) {
        const isValid = isDynamics ? (res[i] > 0) : (res[i] !== null && res[i] > 0);

        if (isValid) {
            if (lastValidIdx !== -1) {
                const gap = i - lastValidIdx - 1;
                if (gap > 0 && gap <= maxGapSize) {
                    const startVal = res[lastValidIdx];
                    const endVal = res[i];
                    const step = (endVal - startVal) / (gap + 1);
                    for (let j = 1; j <= gap; j++) {
                        res[lastValidIdx + j] = startVal + step * j;
                    }
                }
            }
            lastValidIdx = i;
        }
    }
    return res;
}

// ==========================================
// 2. 声学特征提取
// ==========================================

function calcJitter(rawFreqs) {
    if (rawFreqs.length < 2) return 0;
    let sumDiff = 0, sumPeriod = 0, count = 0;
    for (let i = 0; i < rawFreqs.length - 1; i++) {
        const f1 = rawFreqs[i];
        const f2 = rawFreqs[i+1];
        if (f1 && f2 && f1 > 0 && f2 > 0) {
            const p1 = 1/f1;
            const p2 = 1/f2;
            sumDiff += Math.abs(p1 - p2);
            sumPeriod += p1;
            count++;
        }
    }
    if (count === 0 || sumPeriod === 0) return 0;
    return (sumDiff / count) / (sumPeriod / count);
}

function calcShimmer(energies) {
    if (energies.length < 2) return 0;
    let sumDiff = 0, sumAmp = 0, count = 0;
    for (let i = 0; i < energies.length - 1; i++) {
        const a1 = energies[i];
        const a2 = energies[i+1];
        if (a1 > 0.01 && a2 > 0.01) {
            sumDiff += Math.abs(a1 - a2);
            sumAmp += a1;
            count++;
        }
    }
    if (count === 0 || sumAmp === 0) return 0;
    return (sumDiff / count) / (sumAmp / count);
}

function calcSpectralFlux(spectra) {
    if (spectra.length < 2) return 0;
    let totalFlux = 0;
    for (let i = 1; i < spectra.length; i++) {
        let flux = 0;
        const curr = spectra[i];
        const prev = spectra[i-1];
        const len = Math.floor(Math.min(curr.length, prev.length) * 0.5);
        for (let j = 0; j < len; j++) {
            const diff = curr[j] - prev[j];
            if (diff > 0) flux += diff;
        }
        totalFlux += flux;
    }
    return totalFlux / spectra.length;
}

function detectVibrato(freqs, sampleRate, hopSize) {
    let vibratoFrames = 0;
    const dt = hopSize / sampleRate;
    const windowSize = Math.floor(0.5 / dt);
    if (freqs.length < windowSize) return 0;
    const stride = Math.max(1, Math.floor(windowSize / 4));
    for(let i=0; i<freqs.length - windowSize; i += stride) {
        const slice = freqs.slice(i, i+windowSize);
        let sum = 0; for(let k=0; k<slice.length; k++) sum+=slice[k];
        const mean = sum/slice.length;
        const stdDev = Math.sqrt(calcVariance(slice, mean));
        if (stdDev > 2 && stdDev < 15) {
            let crossings = 0;
            for(let j=0; j<slice.length-1; j++) {
                if ((slice[j]-mean)*(slice[j+1]-mean) < 0) crossings++;
            }
            if (crossings >= 3 && crossings <= 12) vibratoFrames += stride;
        }
    }
    const ratio = vibratoFrames / freqs.length;
    return Math.min(100, Math.max(0, ratio * 400));
}

function calcVocalRange(freqs) {
    if (freqs.length === 0) return 0;
    const sorted = new Float32Array(freqs).sort();
    const minF = sorted[Math.floor(sorted.length * 0.001)];
    const maxF = sorted[Math.floor(sorted.length * 0.999)];
    if (!minF || minF <= 60) return 0;
    const semitones = 12 * Math.log2(maxF / minF);
    return semitones > 48 ? 48 : semitones;
}

const convertToWav = (input, output) => {
    return new Promise((resolve, reject) => {
        ffmpeg(input)
            .toFormat('wav')
            .audioFrequency(16000)
            .audioChannels(1)
            .on('end', () => resolve(output))
            .on('error', (err) => reject(err))
            .save(output);
    });
};

const analyzeAudio = async (filePath) => {
    const buffer = fs.readFileSync(filePath);
    const decoded = await wavDecoder.decode(buffer);
    const data = decoded.channelData[0];
    const sr = decoded.sampleRate;

    const detect = Pitchfinder.YIN({ sampleRate: sr });
    const hop = Math.floor(sr / 50);
    const bSize = 2048;
    const fft = new DSP.FFT(bSize, sr);

    const timeAxis=[], rawPitch=[], dyn=[], eng=[], centroids=[], allSpectra=[];

    let totalEnergy = 0;
    let energyCount = 0;
    for(let i=0; i<data.length; i+=hop * 10) {
        if (i + bSize > data.length) break;
        let chunk = data.slice(i, i+bSize);
        let sum=0; for(let k=0; k<chunk.length; k++) sum += chunk[k]*chunk[k];
        totalEnergy += Math.sqrt(sum/chunk.length);
        energyCount++;
    }
    const avgEnergy = energyCount > 0 ? totalEnergy / energyCount : 0.05;
    const noiseThreshold = Math.max(0.008, avgEnergy * 0.15);

    for(let i=0; i<data.length; i+=hop) {
        if (i + bSize > data.length) break;
        let chunk = data.slice(i, i+bSize);
        const p = detect(chunk);

        let sum=0; for(let k=0; k<chunk.length; k++) sum += chunk[k]*chunk[k];
        const rms = Math.sqrt(sum/chunk.length);

        const windowedChunk = applyHanningWindow(chunk);
        fft.forward(Array.from(windowedChunk));
        const spec = Float64Array.from(fft.spectrum);
        allSpectra.push(spec);

        let num=0, den=0;
        for(let k=0; k<spec.length; k++){ num += k*spec[k]; den += spec[k]; }
        const cent = den > 0.0001 ? num/den : 0;

        timeAxis.push((i/sr).toFixed(2));
        dyn.push(Math.max(0, 20*Math.log10(rms+1e-6)+60));
        eng.push(rms);
        centroids.push(cent);

        if(rms > noiseThreshold && p && p>70 && p<1200) {
            rawPitch.push(p);
        } else {
            rawPitch.push(null);
        }
    }

    const correctedPitch = smoothOctaves(rawPitch);
    const cleanedPitch = cleanupShortSegments(correctedPitch, 3);
    const validFreqs = cleanedPitch.filter(x => x !== null);
    const smoothPitch = medianFilter(cleanedPitch, 5);

    const avgCentroid = centroids.length > 0 ? centroids.reduce((a,b)=>a+b,0)/centroids.length : 0;
    const binResolution = sr / bSize;
    const avgCentroidHz = avgCentroid * binResolution;

    const baseRatio = Math.min(Math.max((avgCentroidHz - 800) / 1600, 0), 1);
    const headIntensity = Math.min(1.0, baseRatio * 1.5);
    const chestIntensity = Math.min(1.0, (1.0 - baseRatio) * 1.5);

    const jitter = calcJitter(cleanedPitch);
    const shimmer = calcShimmer(eng);
    const rangeSemitones = calcVocalRange(validFreqs);
    const vibratoDepth = detectVibrato(validFreqs, sr, hop);
    const flux = calcSpectralFlux(allSpectra);
    const articulationMetric = Math.min(100, Math.max(50, flux * 80));

    return {
        time_series: {
            axis: timeAxis,
            pitch: smoothPitch,
            raw_pitch: cleanedPitch,
            dynamics: dyn,
            energy: eng
        },
        features: {
            jitter: jitter,
            shimmer: shimmer,
            vibrato: vibratoDepth,
            range: rangeSemitones,
            articulation: articulationMetric,
            resonance: { head: headIntensity, chest: chestIntensity, centroid: avgCentroidHz }
        }
    };
};

// ==========================================
// 3. 对齐算法 (Auto-Lag + 1D DTW)
// ==========================================

// [Fix] 增加 shift 参数，允许基于移调后的音高进行延迟检测
function estimateLag(ref, user, shift = 0) {
    const maxLag = 300;
    let bestLag = 0;
    let minError = Infinity;
    let bestMatchCount = 0;

    for (let lag = -maxLag; lag <= maxLag; lag++) {
        let error = 0;
        let count = 0;
        const start = Math.max(0, -lag);
        const end = Math.min(ref.length, user.length - lag);

        for (let i = start; i < end; i += 5) {
            const rVal = ref[i];
            const uVal = user[i + lag];
            if (rVal !== null && uVal !== null && rVal > 50 && uVal > 50) {
                // [Fix] 应用 shift 进行对比
                error += Math.abs(rVal - (uVal - shift));
                count++;
            }
        }
        // [Fix] 降低匹配点数门槛 (50 -> 20)，确保短片段也能对齐
        if (count > 20) {
            const avgError = error / count;
            if (avgError < minError) {
                minError = avgError;
                bestLag = lag;
                bestMatchCount = count;
            }
        }
    }
    return bestMatchCount > 20 ? bestLag : 0;
}

function estimatePreAlignmentShift(ref, user) {
    const rValid = ref.filter(x => x !== null && x > 0).sort((a,b)=>a-b);
    const uValid = user.filter(x => x !== null && x > 0).sort((a,b)=>a-b);

    if (rValid.length === 0 || uValid.length === 0) return 0;

    const rMed = rValid[Math.floor(rValid.length/2)];
    const uMed = uValid[Math.floor(uValid.length/2)];

    return uMed - rMed;
}

function shiftArray(arr, lag, fillValue = null) {
    const newArr = new Array(arr.length).fill(fillValue);
    for (let i = 0; i < arr.length; i++) {
        const srcIdx = i + lag;
        if (srcIdx >= 0 && srcIdx < arr.length) {
            newArr[i] = arr[srcIdx];
        }
    }
    return newArr;
}

function alignToStandard(refPitch, userPitchRaw, userDynRaw) {
    // [Fix] 1. 先计算 Key Shift (基于原始数据)
    const preKeyShift = estimatePreAlignmentShift(refPitch, userPitchRaw);

    // [Fix] 2. 将 Key Shift 传入 estimateLag，实现“带移调的延迟检测”
    const lag = estimateLag(refPitch, userPitchRaw, preKeyShift);

    const userPitch = shiftArray(userPitchRaw, lag, null);
    const userDyn = shiftArray(userDynRaw, lag, 0);

    const N = refPitch.length;
    const M = userPitch.length;
    const win = Math.floor(Math.max(N, M) * 0.25);

    const dist = (a, b) => {
        if (a == null && b == null) return 0;
        if (a == null || b == null) return 50;
        return Math.abs(a - (b - preKeyShift));
    };

    const cost = new Float32Array(N * M).fill(Infinity);

    for(let i=0; i<Math.min(20, N); i++) {
        for(let j=0; j<Math.min(20, M); j++) {
            cost[i*M + j] = dist(refPitch[i], userPitch[j]);
        }
    }

    for (let i = 0; i < N; i++) {
        const start = Math.max(0, i - win);
        const end = Math.min(M, i + win + 1);
        for (let j = start; j < end; j++) {
            if (i < 10 && j < 10) continue;
            const idx = i * M + j;
            const d = dist(refPitch[i], userPitch[j]);

            let minPrev = Infinity;
            if (i > 0) minPrev = Math.min(minPrev, cost[(i - 1) * M + j]);
            if (j > 0) minPrev = Math.min(minPrev, cost[i * M + (j - 1)]);
            if (i > 0 && j > 0) {
                const diagCost = cost[(i - 1) * M + (j - 1)];
                minPrev = Math.min(minPrev, diagCost * 0.98);
            }

            if (minPrev !== Infinity) cost[idx] = d + minPrev;
        }
    }

    const path = [];
    let i = N - 1, j = M - 1;

    if (cost[i * M + j] === Infinity) {
        let minVal = Infinity;
        let bestJ = M - 1;
        let bestI = N - 1;

        for(let k = 0; k < N; k++) {
            const val = cost[k * M + (M-1)];
            if(val < minVal) { minVal = val; bestI = k; bestJ = M-1; }
        }

        const searchRange = Math.max(win, 1000);
        for(let k = Math.max(0, M - searchRange); k < M; k++) {
            const val = cost[(N-1) * M + k];
            if(val < minVal) { minVal = val; bestJ = k; bestI = N-1; }
        }

        i = bestI;
        j = bestJ;
    }

    if (cost[i * M + j] === Infinity) {
        for(let k = N - 1; k >= 0; k--) {
            if (cost[k * M + (M-1)] !== Infinity) {
                i = k; j = M - 1; break;
            }
        }
    }

    while (i > 0 || j > 0) {
        path.push([i, j]);
        let u = Infinity, l = Infinity, d = Infinity;

        if (i > 0) u = cost[(i - 1) * M + j];
        if (j > 0) l = cost[i * M + (j - 1)];
        if (i > 0 && j > 0) d = cost[(i - 1) * M + (j - 1)];

        const minVal = Math.min(u, l, d);
        if (minVal === Infinity) break;

        if (minVal === d) { i--; j--; }
        else if (minVal === u) i--;
        else j--;
    }
    path.reverse();

    const newP = new Array(N).fill(null);
    const newD = new Array(N).fill(0);
    const count = new Int16Array(N).fill(0);

    let sumRef = 0, sumUser = 0, sumRefUser = 0, sumRefSq = 0;
    let validPoints = 0;

    path.forEach(([r, u]) => {
        if (refPitch[r] !== null && userPitch[u] !== null) {
            sumRef += r;
            sumUser += u;
            sumRefUser += r * u;
            sumRefSq += r * r;
            validPoints++;
        }
    });

    let stdError = 0;
    if (validPoints > 10) {
        const slope = (validPoints * sumRefUser - sumRef * sumUser) / (validPoints * sumRefSq - sumRef * sumRef);
        const intercept = (sumUser - slope * sumRef) / validPoints;

        let sumResidualSq = 0;
        let residualCount = 0;

        path.forEach(([r, u]) => {
            if (refPitch[r] !== null && userPitch[u] !== null) {
                const predictedUser = slope * r + intercept;
                const residual = u - predictedUser;
                sumResidualSq += residual * residual;
                residualCount++;
            }
        });

        if (residualCount > 0) {
            stdError = Math.sqrt(sumResidualSq / residualCount);
        }

        const slopePenalty = Math.max(0, Math.abs(1 - slope) - 0.2) * 100;
        stdError += slopePenalty;
    }

    const rhythmScore = Math.max(0, 100 - (Math.max(0, stdError - 3) * 0.5));

    path.forEach(([refIdx, userIdx]) => {
        const pitchVal = userPitch[userIdx];
        const dynVal = userDyn[userIdx];
        if (pitchVal !== null) {
            if (newP[refIdx] === null) newP[refIdx] = 0;
            newP[refIdx] += pitchVal;
            count[refIdx]++;
        }
        if (dynVal > newD[refIdx]) newD[refIdx] = dynVal;
    });

    for (let k = 0; k < N; k++) {
        if (count[k] > 0) newP[k] /= count[k];
    }

    const filledP = interpolateGaps(newP, 10, false);
    const smoothedP = movingAverageSmooth(filledP, 7);

    const filledD = interpolateGaps(newD, 10, true);
    const smoothedD = movingAverageSmooth(filledD, 7);

    return {
        pitch: smoothedP,
        dynamics: smoothedD,
        rhythmScore: Math.floor(rhythmScore),
        lag: lag
    };
}

function scorePerformance(refPitch, userPitch, refFeatures, userFeatures) {
    let totalScore = 0;
    let totalFrames = 0;

    const diffs = [];
    for(let i=0; i<refPitch.length; i++) {
        if(refPitch[i] && userPitch[i]) {
            diffs.push(userPitch[i] - refPitch[i]);
        }
    }
    diffs.sort((a, b) => a - b);
    const avgOffset = diffs.length > 0 ? diffs[Math.floor(diffs.length / 2)] : 0;

    const fittedPitch = userPitch.map(p => p !== null ? p - avgOffset : null);

    for (let i = 0; i < refPitch.length; i++) {
        const r = refPitch[i];
        if (r !== null && r > 0) {
            totalFrames++;
            const u = userPitch[i];

            if (u === null || u === 0) {
                totalScore += 40;
            } else {
                let minSemiDiff = Infinity;
                const correctedP0 = u - avgOffset;
                if (correctedP0 > 0) minSemiDiff = Math.min(minSemiDiff, 12 * Math.abs(Math.log2(correctedP0 / r)));

                if (minSemiDiff < 1.0) totalScore += 100;
                else if (minSemiDiff < 2.0) totalScore += 90;
                else if (minSemiDiff < 3.0) totalScore += 75;
                else if (minSemiDiff < 4.0) totalScore += 60;
                else totalScore += Math.max(0, 40 - minSemiDiff * 10);
            }
        }
    }

    const pitchAccuracy = totalFrames > 0 ? totalScore / totalFrames : 0;

    const jitterDiff = Math.max(0, userFeatures.jitter - refFeatures.jitter - 0.01);
    const stabilityScore = Math.max(0, 100 - (jitterDiff * 300));

    let techniqueScore = 70;
    if (refFeatures.vibrato > 10) {
        if (userFeatures.vibrato > 5) techniqueScore = 95;
        else techniqueScore = 60;
    } else {
        techniqueScore = 85 + (userFeatures.vibrato > 5 ? -10 : 5);
    }

    const emotionScore = Math.min(100, 70 + (userFeatures.resonance.head * 20));
    const intonationScore = (pitchAccuracy * 0.8) + (stabilityScore * 0.2);

    let rank = "C";
    if (intonationScore >= 95) rank = "SSS";
    else if (intonationScore >= 90) rank = "SS";
    else if (intonationScore >= 80) rank = "S";
    else if (intonationScore >= 70) rank = "A";
    else if (intonationScore >= 60) rank = "B";

    const refRange = refFeatures.range || 12;
    const userRange = userFeatures.range || 0;

    let rangeScore = (userRange / (refRange * 0.9)) * 100;
    if (refRange < 5) rangeScore = 85;

    rangeScore = Math.min(100, Math.max(0, rangeScore));

    return {
        totalIntonation: Math.floor(intonationScore),
        details: {
            pitch: Math.floor(pitchAccuracy),
            stability: Math.floor(stabilityScore),
            technique: Math.floor(techniqueScore),
            emotion: Math.floor(emotionScore),
            articulation: Math.floor(userFeatures.articulation || 0),
            keyOffset: Math.round(avgOffset),
            range: Math.floor(rangeScore)
        },
        fittedPitch: fittedPitch,
        rank: rank
    };
}

function generateDiagnosticReport(userPitch, refPitch, axis) {
    if (!refPitch || refPitch.length === 0 || !userPitch) return null;

    let totalDiff = 0, count = 0;
    let maxDiff = 0, maxDiffIndex = 0;

    for (let i = 0; i < refPitch.length; i++) {
        if (refPitch[i] !== null && userPitch[i] !== null) {
            const diff = userPitch[i] - refPitch[i];
            const absDiff = Math.abs(diff);
            totalDiff += absDiff;
            count++;

            if (absDiff > maxDiff) {
                maxDiff = absDiff;
                maxDiffIndex = i;
            }
        }
    }

    const avgDiff = count > 0 ? (totalDiff / count).toFixed(1) : "0.0";
    const maxDiffTime = axis[maxDiffIndex] || "0.00";
    const details = [];

    details.push(`平均频率偏差 ${avgDiff}Hz。`);

    if (avgDiff < 5) details.push("音准控制极佳，贴合度高。");
    else if (avgDiff < 15) details.push("整体音准良好，偶有偏差。");
    else details.push("音准波动较大，建议加强音阶练习。");

    return {
        pitchDetails: details,
        maxErrorTime: maxDiffTime
    };
}

module.exports = {
    convertToWav,
    analyzeAudio,
    alignToStandard,
    scorePerformance,
    generateDiagnosticReport
};