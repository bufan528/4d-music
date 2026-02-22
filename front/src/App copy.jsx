import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import {
    Mic, Square, Play, Pause, Settings, RotateCcw,
    Activity, Music, Cpu, AlertCircle, X, Server, Key,
    Wifi, WifiOff, User, BarChart2, CheckCircle2,
    PlayCircle, Headphones, MoreHorizontal, SkipBack, SkipForward,
    ChevronDown, Disc, RefreshCw, Trophy
} from 'lucide-react';
import Chart from 'chart.js/auto';

// --- 歌曲配置 ---
const SONGS = [
    {
        id: 'yicheng',
        name: '一程山路',
        artist: '毛不易',
        file: '/一程山路.mp3',
        lyrics: "如同昨夜天光乍破了远山的轮廓，想起很久之前我们都忘了说..."
    },
    {
        id: 'ruyuan',
        name: '如愿',
        artist: '王菲',
        file: '/如愿.mp3',
        lyrics: "我也将见你未见的世界 写你未写的诗篇 天边的月心中的念 你永在我身边"
    },
    {
        id: 'xxy',
        name: '小幸运',
        artist: '田馥甄',
        file: '/小幸运.mp3',
        lyrics: "原来你是我最想留住的幸运 原来我们和爱情曾经靠得那么近 那为我对抗世界的决定 那陪我淋的雨 一幕幕都是你 一尘不染的真心"
    }
];

// --- 内置录音 Hook ---
function useRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            return true;
        } catch (err) {
            console.error("Microphone access denied:", err);
            return false;
        }
    };
    const stopRecording = () => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current) return resolve(null);
            if (mediaRecorderRef.current.state === "inactive") return resolve(null);
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setIsRecording(false);
                resolve(blob);
            };
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        });
    };
    const resetRecorder = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
        chunksRef.current = [];
    };
    return { isRecording, startRecording, stopRecording, resetRecorder };
}

// --- 设置模态框 ---
const SettingsModal = ({ isOpen, onClose, config, onSave }) => {
    const [localConfig, setLocalConfig] = useState(config);
    const [testStatus, setTestStatus] = useState(null);
    const [testMsg, setTestMsg] = useState("");
    useEffect(() => {
        setLocalConfig(config);
        setTestStatus(null);
        setTestMsg("");
    }, [config, isOpen]);
    const testConnection = async () => {
        setTestStatus('loading');
        setTestMsg("正在连接后端...");
        const url = localConfig.backendUrl ? `${localConfig.backendUrl.replace(/\/$/, '')}/analyze` : '/analyze';
        try {
            await axios.post(url, {}, { timeout: 3000 });
            setTestStatus('success'); setTestMsg("连接成功！后端服务在线。");
        } catch (e) {
            if (e.response) { setTestStatus('success'); setTestMsg(`连接成功！(服务响应: ${e.response.status})`); }
            else { setTestStatus('error'); setTestMsg("连接失败：请确保后端已运行"); }
        }
    };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-[480px] p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-white"><Server className="text-cyan-400" size={20}/> 系统配置</h2>
                    <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-white" /></button>
                </div>
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">后端地址</label>
                        <div className="flex gap-2">
                            <input type="text" value={localConfig.backendUrl} onChange={e => setLocalConfig({...localConfig, backendUrl: e.target.value})} placeholder="例如: http://localhost:8000" className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"/>
                            <button onClick={testConnection} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white whitespace-nowrap">测试连接</button>
                        </div>
                        {testStatus && <div className={`mt-2 text-xs flex items-center gap-2 ${testStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>{testStatus === 'success' ? <Wifi size={14}/> : <WifiOff size={14}/>}{testMsg}</div>}
                    </div>
                    <div className="border-t border-slate-700 pt-4">
                        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><Key size={14}/> LLM 模型配置</h3>
                        <div className="space-y-3">
                            <div><label className="block text-xs text-slate-500 mb-1">API Key</label><input type="password" value={localConfig.apiKey} onChange={e => setLocalConfig({...localConfig, apiKey: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none" placeholder="sk-..."/></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs text-slate-500 mb-1">Model ID</label><input type="text" value={localConfig.model} onChange={e => setLocalConfig({...localConfig, model: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none" placeholder="ep-..."/></div>
                                <div><label className="block text-xs text-slate-500 mb-1">Base URL</label><input type="text" value={localConfig.baseUrl} onChange={e => setLocalConfig({...localConfig, baseUrl: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none" placeholder="https://..."/></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-8 flex justify-end"><button onClick={() => onSave(localConfig)} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold transition shadow-lg">保存并应用</button></div>
            </div>
        </div>
    );
};

const NicknameModal = ({ isOpen, onSave }) => {
    const [name, setName] = useState("");
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-8 shadow-2xl text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><User size={40} className="text-white" /></div>
                <h2 className="text-2xl font-bold text-white mb-2">欢迎来到四维声乐</h2>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave(name)} placeholder="请输入您的昵称" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-center text-white focus:border-cyan-500 outline-none mb-6"/>
                <button onClick={() => name.trim() && onSave(name)} disabled={!name.trim()} className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold">进入系统</button>
            </div>
        </div>
    );
};

const LeaderboardModal = ({ isOpen, onClose, data, songName, loading }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-white"><Trophy className="text-yellow-400" size={20}/> 排行榜</h2>
                        <p className="text-xs text-slate-400 mt-1">歌曲: {songName}</p>
                    </div>
                    <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-white" /></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-500">
                            <div className="w-6 h-6 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin"></div>
                            <span className="text-xs">加载中...</span>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm">
                            <p>暂无数据</p>
                            <p className="text-xs mt-1">快来挑战第一个上榜吧！</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data.map((item, index) => {
                                let rankStyle = "bg-slate-800 text-slate-400 border-slate-700";
                                let icon = <span className="font-mono font-bold w-6 text-center">{index + 1}</span>;
                                if (index === 0) {
                                    rankStyle = "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
                                    icon = <Trophy size={16} className="text-yellow-400"/>;
                                } else if (index === 1) {
                                    rankStyle = "bg-slate-300/10 text-slate-300 border-slate-300/30";
                                } else if (index === 2) {
                                    rankStyle = "bg-orange-700/10 text-orange-400 border-orange-700/30";
                                }
                                return (
                                    <div key={index} className={`flex items-center justify-between p-3 rounded-xl border ${rankStyle} transition hover:bg-opacity-50`}>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-6">{icon}</div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm truncate max-w-[120px]">{item.nickname}</span>
                                                <span className="text-[10px] opacity-60">{new Date(item.date).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="font-mono font-bold text-lg">{item.score}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- TimelineChart (时间序列图) ---
const TimelineChart = ({ axis, userPitch, refPitch, dynamics, currentTime }) => {
    const processData = (data) => {
        if (!data) return [];
        return data.map(val => (val !== null && val > 60) ? val : null);
    };
    let chartAxis = [];
    if (refPitch && refPitch.length > 0) {
        chartAxis = Array.from({length: refPitch.length}, (_, i) => i * 0.02);
    } else if (userPitch && userPitch.length > 0) {
        chartAxis = Array.from({length: userPitch.length}, (_, i) => i * 0.02);
    } else if (axis && axis.length > 0) {
        chartAxis = axis.map(parseFloat);
    }
    const cleanRef = processData(refPitch);
    const cleanUser = processData(userPitch);
    const option = {
        backgroundColor: 'transparent',
        grid: { left: 0, right: 0, top: 10, bottom: 0, containLabel: false },
        tooltip: { trigger: 'axis', axisPointer: { type: 'line' } },
        xAxis: {
            type: 'value',
            show: false,
            min: 0,
            max: chartAxis.length > 0 ? chartAxis[chartAxis.length - 1] : 'dataMax'
        },
        yAxis: [
            { type: 'value', min: 'dataMin', splitLine: { show: false }, axisLabel: { show: false } },
            { type: 'value', min: 0, max: 100, splitLine: { show: false }, axisLabel: { show: false } }
        ],
        series: [
            {
                name: '响度',
                type: 'line',
                yAxisIndex: 1,
                showSymbol: false,
                smooth: true,
                lineStyle: { width: 0 },
                areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{offset: 0, color: 'rgba(168, 85, 247, 0.3)'}, {offset: 1, color: 'rgba(168, 85, 247, 0.0)'}]) },
                data: dynamics ? dynamics.map((val, i) => [chartAxis[i], val]) : []
            },
            {
                name: '原唱',
                type: 'line',
                yAxisIndex: 0,
                showSymbol: false,
                data: cleanRef ? cleanRef.map((val, i) => [chartAxis[i], val]) : [],
                lineStyle: { color: '#fbbf24', width: 2, opacity: 0.8 },
                smooth: true,
                connectNulls: true
            },
            {
                name: '演唱',
                type: 'line',
                yAxisIndex: 0,
                showSymbol: false,
                data: cleanUser ? cleanUser.map((val, i) => [chartAxis[i], val]) : [],
                lineStyle: { color: '#22d3ee', width: 3, shadowColor: 'rgba(34,211,238,0.5)', shadowBlur: 10 },
                smooth: true,
                connectNulls: true,
                markLine: {
                    symbol: ['none', 'none'],
                    label: { show: false },
                    data: [{ xAxis: currentTime }],
                    lineStyle: { color: '#fff', width: 2, type: 'solid', opacity: 0.8 },
                    animation: false
                }
            }
        ]
    };
    return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={false} />;
};

const RadarChart = ({ scores }) => {
    const option = {
        backgroundColor: 'transparent',
        radar: {
            indicator: [
                { name: '音准', max: 100 },
                { name: '节奏', max: 100 },
                { name: '稳定性', max: 100 },
                { name: '音质', max: 100 },
                { name: '爆发力', max: 100 },
                { name: '技巧', max: 100 },
                { name: '咬字', max: 100 },
                { name: '音域', max: 100 },
                { name: '情感', max: 100 }
            ],
            center: ['50%', '50%'],
            radius: '65%',
            splitArea: { areaStyle: { color: ['rgba(30, 41, 59, 0.5)', 'rgba(30, 41, 59, 0.2)'] } },
            axisName: { color: '#94a3b8', fontSize: 10 },
            splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.2)' } }
        },
        series: [{
            type: 'radar',
            data: [{
                value: [scores.pitch, scores.rhythm, scores.stability, scores.tone, scores.tension, scores.technique, scores.articulation, scores.range, scores.emotion],
                name: '本次',
                areaStyle: { color: 'rgba(34, 211, 238, 0.3)' },
                itemStyle: { color: '#22d3ee' },
                lineStyle: { color: '#22d3ee' }
            }]
        }]
    };
    return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
};

// --- 深度分析卡片 ---
const DetailedReportCard = ({ analysis, scores }) => {
    if (!analysis) return null;
    const suggestions = analysis.suggestions || (
        scores.pitch > 85 ? "整体表现非常出色，建议继续保持气息的稳定性。" :
            scores.pitch > 70 ? "音准有一定波动，建议多进行半音阶和音程练习。" :
                "建议先放慢速度，重点练习每个音的准确性，不要急于连贯。"
    );
    return (
        <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/50 hover:bg-slate-800/60 transition h-full">
            <h3 className="text-sm text-cyan-400 font-bold mb-4 flex items-center gap-2">
                <Activity size={16} /> 深度声学细节 (Acoustic Metrics)
            </h3>
            <div className="space-y-4">
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-300 font-bold text-sm">音准分析</span>
                        {analysis.maxErrorTime && (
                            <span className="text-rose-400 text-xs font-mono bg-rose-500/10 px-2 py-0.5 rounded">
                                Max Error @ {analysis.maxErrorTime}s
                            </span>
                        )}
                    </div>
                    <ul className="space-y-2">
                        {analysis.pitchDetails && analysis.pitchDetails.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                                <CheckCircle2 size={14} className="text-slate-600 mt-0.5 shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-300 font-bold text-sm">综合建议</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        {suggestions}
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- AI 导师卡片 ---
const AITutorCard = ({ comment }) => {
    const parseContent = (text) => {
        if (!text) return [];
        return text.split('\n').filter(line => line.trim() !== '').map((line, idx) => {
            const trimmed = line.trim();
            if (['高音', '增强', '提升', '平衡', '整体', '优化', '注意'].some(k => trimmed.startsWith(k)) && trimmed.length < 20) {
                return <h4 key={idx} className="text-indigo-300 font-bold text-sm mt-4 mb-2">{trimmed}</h4>;
            }
            if (trimmed.startsWith('听听')) {
                return (
                    <button key={idx} className="flex items-center gap-2 w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs py-2 px-3 rounded-lg border border-indigo-500/20 transition my-2 group">
                        <PlayCircle size={16} className="group-hover:text-indigo-200" />
                        <span>{trimmed}</span>
                        <span className="ml-auto text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">PLAY</span>
                    </button>
                );
            }
            return <p key={idx} className="text-slate-300 text-xs leading-relaxed mb-1">{trimmed}</p>;
        });
    };
    return (
        <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900 rounded-2xl p-6 border border-indigo-500/30 relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                        <Cpu className="text-indigo-400" size={20}/>
                    </div>
                    <div>
                        <h3 className="text-indigo-100 font-bold text-sm">AI 智能导师</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                            <span className="text-[10px] text-indigo-400/80 uppercase tracking-wider">Doubao-Pro-4k Online</span>
                        </div>
                    </div>
                </div>
                <div className="pl-2 border-l-2 border-indigo-500/10 space-y-1">
                    {parseContent(comment)}
                </div>
            </div>
        </div>
    );
};

// --- App 主组件 ---
const DEFAULT_CONFIG = { backendUrl: '', apiKey: '', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: '' };
export default function App() {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [showSettings, setShowSettings] = useState(false);
    const [nickname, setNickname] = useState("");
    const [showNicknameModal, setShowNicknameModal] = useState(false);
    const { isRecording, startRecording, stopRecording, resetRecorder } = useRecorder();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [hasResult, setHasResult] = useState(false);
    const [statusText, setStatusText] = useState("点击开始录制");
    const [errorMsg, setErrorMsg] = useState("");
    const [lastBlob, setLastBlob] = useState(null);
    // Song Selection
    const [currentSong, setCurrentSong] = useState(SONGS[0]);
    const [showSongMenu, setShowSongMenu] = useState(false);
    // Leaderboard State
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    // Playback State
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    // Refs
    const audioMusicRef = useRef(null);
    const userAudioRef = useRef(null);
    const resultsRef = useRef(null);
    const [userAudioUrl, setUserAudioUrl] = useState(null);
    const [resultData, setResultData] = useState({
        scores: { pitch: 0, rhythm: 0, stability: 0, tone: 0, tension: 0, technique: 0, articulation: 0, range: 0, emotion: 0 },
        emotionTag: "",
        totalScore: 0,
        aiComment: "",
        detailedAnalysis: null,
        timeSeries: { axis: [], user: [], standard: [], dynamics: [] },
        cavity: { head: 0, chest: 0, mode: "Unknown" },
        lagCorrection: 0
    });
    const metricConfigs = {
        pitch:       { label: '音准', icon: '🎯', color: 'bg-emerald-500' },
        rhythm:      { label: '节奏', icon: '🥁', color: 'bg-teal-500' },
        stability:   { label: '稳定性', icon: '🧱', color: 'bg-blue-500' },
        tone:        { label: '音质', icon: '✨', color: 'bg-indigo-500' },
        articulation:{ label: '咬字', icon: '🗣️', color: 'bg-violet-500' },
        tension:     { label: '爆发力', icon: '🔥', color: 'bg-pink-500' },
        technique:   { label: '技巧', icon: '🎻', color: 'bg-rose-500' },
        range:       { label: '音域', icon: '🏔️', color: 'bg-orange-500' },
        emotion:     { label: '情感', icon: '❤️', color: 'bg-red-500' },
    };
    useEffect(() => {
        const savedConfig = localStorage.getItem('vocal_app_config');
        if (savedConfig) setConfig(JSON.parse(savedConfig));
        const savedName = localStorage.getItem('vocal_nickname');
        if (savedName) setNickname(savedName); else setShowNicknameModal(true);
        return () => { audioMusicRef.current?.pause(); };
    }, []);
    useEffect(() => {
        if(audioMusicRef.current) {
            audioMusicRef.current.pause();
            setIsMusicPlaying(false);
        }
        const baseUrl = config.backendUrl ? config.backendUrl.replace(/\/$/, '') : '';
        const songUrl = currentSong.file.startsWith('http') ? currentSong.file : `${baseUrl}${currentSong.file}`;
        audioMusicRef.current = new Audio(songUrl);
        audioMusicRef.current.onended = () => setIsMusicPlaying(false);
        audioMusicRef.current.onerror = (e) => {
            console.error("Audio Load Error:", e);
        };
        handleReset();
    }, [currentSong, config.backendUrl]);
    const formatTime = (time) => {
        if (!time || isNaN(time)) return "00:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };
    const handleUserPlayPause = () => {
        const audio = userAudioRef.current;
        if (!audio) return;
        if (isPlaying) { audio.pause(); } else { audio.play(); }
        setIsPlaying(!isPlaying);
    };
    const handleTimeUpdate = () => { if (userAudioRef.current) setCurrentTime(userAudioRef.current.currentTime); };
    const handleLoadedMetadata = () => { if (userAudioRef.current) setDuration(userAudioRef.current.duration); };
    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        if (userAudioRef.current) { userAudioRef.current.currentTime = time; setCurrentTime(time); }
    };
    const handleEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const saveConfig = (newConfig) => { setConfig(newConfig); localStorage.setItem('vocal_app_config', JSON.stringify(newConfig)); setShowSettings(false); };
    const handleSaveNickname = (name) => { setNickname(name); localStorage.setItem('vocal_nickname', name); setShowNicknameModal(false); };
    const handleReset = () => {
        setIsMusicPlaying(false);
        if(audioMusicRef.current) {
            audioMusicRef.current.pause();
            audioMusicRef.current.currentTime = 0;
        }
        if(userAudioRef.current) { userAudioRef.current.pause(); userAudioRef.current.currentTime = 0; }
        setIsPlaying(false); setCurrentTime(0); setDuration(0);
        setHasResult(false); setStatusText("点击开始录制"); setErrorMsg(""); setIsAnalyzing(false);
        setLastBlob(null);
        resetRecorder();
    };
    const handleReAnalyze = () => {
        if (!lastBlob) return;
        setStatusText("正在重新分析...");
        setIsAnalyzing(true);
        uploadAndAnalyze(lastBlob);
    };
    const fetchLeaderboard = async () => {
        setLeaderboardLoading(true);
        setShowLeaderboard(true);
        const url = config.backendUrl ? `${config.backendUrl.replace(/\/$/, '')}/leaderboard` : '/leaderboard';
        try {
            const res = await axios.get(url, { params: { songId: currentSong.id } });
            setLeaderboardData(res.data.data || []);
        } catch (e) {
            console.error("Fetch leaderboard failed", e);
            setLeaderboardData([]);
        } finally {
            setLeaderboardLoading(false);
        }
    };
    const handleToggleMusicPlay = async () => {
        if(userAudioRef.current) { userAudioRef.current.pause(); setIsPlaying(false); }
        if (isMusicPlaying) {
            audioMusicRef.current.pause();
            setIsMusicPlaying(false);
        } else {
            try {
                await audioMusicRef.current.play();
                setIsMusicPlaying(true);
            } catch (err) {
                console.error("Play failed:", err);
                setErrorMsg("无法播放音频：请检查配置中的后端地址，或确认文件是否存在。");
            }
        }
    };
    const handleToggleRecord = async () => {
        if (isMusicPlaying) handleToggleMusicPlay();
        if(userAudioRef.current) { userAudioRef.current.pause(); setIsPlaying(false); }
        if (!isRecording) {
            setErrorMsg("");
            setLastBlob(null);
            const success = await startRecording();
            if (success) setStatusText("录音中... (请演唱)"); else setErrorMsg("麦克风权限被拒绝");
        } else {
            setStatusText("正在上传并分析..."); setIsAnalyzing(true);
            const audioBlob = await stopRecording();
            setLastBlob(audioBlob);
            if (audioBlob && audioBlob.size > 1024) {
                await uploadAndAnalyze(audioBlob);
            } else {
                setIsAnalyzing(false);
                setStatusText("点击开始录制");
                setErrorMsg("录音时间太短或无声音，请重试");
                if (!audioBlob || audioBlob.size <= 0) setLastBlob(null);
            }
        }
    };
    const uploadAndAnalyze = async (blob) => {
        if (userAudioUrl) URL.revokeObjectURL(userAudioUrl);
        const playUrl = URL.createObjectURL(blob);
        setUserAudioUrl(playUrl);
        const formData = new FormData();
        formData.append('file', blob, 'recording.webm');
        formData.append('nickname', nickname);
        formData.append('songId', currentSong.id);
        const url = config.backendUrl ? `${config.backendUrl.replace(/\/$/, '')}/analyze` : '/analyze';
        try {
            const headers = {};
            if (config.apiKey) { headers['x-api-key']=config.apiKey; headers['x-api-base']=config.baseUrl; headers['x-api-model']=config.model; }
            const res = await axios.post(url, formData, { headers });
            const data = res.data;
            let emotionText = "平稳 (Calm)";
            if (data.scores.emotion > 80) emotionText = "深情 (Expressive)";
            else if (data.scores.tension > 80) emotionText = "激昂 (Passionate)";
            const rawCavity = data.cavity_data || { head: 0, chest: 0 };
            const smoothHead = Math.min(0.96, rawCavity.head);
            const smoothChest = Math.min(0.96, rawCavity.chest);
            let cavityMode = "Mixed Voice";
            if (rawCavity.head > 0.65) cavityMode = "Head Dominant";
            else if (rawCavity.chest > 0.65) cavityMode = "Chest Dominant";
            const totalScore = Math.floor(
                (data.scores.pitch * 0.4) +
                (data.scores.rhythm * 0.2) +
                (data.scores.emotion * 0.2) +
                (data.scores.stability * 0.2)
            );
            setResultData({
                scores: data.scores,
                emotionTag: emotionText,
                totalScore: totalScore,
                ai_comment: data.ai_comment,
                time_series: data.time_series,
                cavity: { head: smoothHead, chest: smoothChest, mode: cavityMode },
                detailed_analysis: data.detailed_analysis,
                lag_correction: data.lag_correction || 0,
                radar_data: data.radar_data
            });
            setHasResult(true);
            setTimeout(() => { if (resultsRef.current && window.innerWidth < 1024) resultsRef.current.scrollIntoView({ behavior: 'smooth' }); }, 500);
        } catch (e) {
            console.error(e);
            let msg = e.message;
            if (e.response) {
                if (e.response.status === 502) msg = "后端服务未响应 (502)，可能正在重启，请稍后重试。";
                else if (e.response.status === 504) msg = "分析超时 (504)，请缩短录音时间。";
                else if (e.response.data?.error) msg = e.response.data.error;
            }
            setErrorMsg("分析失败: " + msg);
            setIsAnalyzing(false);
            setHasResult(false);
        } finally { setIsAnalyzing(false); }
    };
    const calculateGrade = (score) => score >= 90 ? 'SSS' : score >= 80 ? 'S' : score >= 70 ? 'A' : 'B';
    const radarRef = useRef(null);
    const timeSeriesRef = useRef(null);
    useEffect(() => {
        if (!hasResult || !resultData) return;
        // 动态加载 particles.js 如果未加载
        if (!window.particlesJS) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/particles.js/2.0.0/particles.min.js';
            script.async = true;
            script.onload = () => {
                window.particlesJS('particles-js', {
                    particles: {
                        number: { value: 80, density: { enable: true, value_area: 800 } },
                        color: { value: '#58a6ff' },
                        shape: { type: 'circle' },
                        opacity: { value: 0.3, random: true },
                        size: { value: 2, random: true },
                        line_linked: { enable: true, distance: 150, color: '#58a6ff', opacity: 0.2, width: 1 },
                        move: { enable: true, speed: 2, direction: 'none', random: true, straight: false, out_mode: 'out', bounce: false }
                    },
                    interactivity: {
                        detect_on: 'canvas',
                        events: { onhover: { enable: true, mode: 'grab' }, onclick: { enable: true, mode: 'push' }, resize: true },
                        modes: { grab: { distance: 140, line_linked: { opacity: 0.5 } }, push: { particles_nb: 4 } }
                    },
                    retina_detect: true
                });
            };
            document.head.appendChild(script);
        } else {
            window.particlesJS('particles-js', {
                // ... 配置同上
            });
        }
        // 雷达图
        setTimeout(() => {
            const radarCtx = document.getElementById('radarChart');
            if (radarCtx) {
                radarRef.current = new Chart(radarCtx, {
                    type: 'radar',
                    data: {
                        labels: ['Pitch', 'Rhythm', 'Stability', 'Tone', 'Tension', 'Technique', 'Articulation', 'Range', 'Emotion'],
                        datasets: [{
                            label: '你的表现',
                            data: resultData.radar_data || [0,0,0,0,0,0,0,0,0],
                            backgroundColor: 'rgba(88, 166, 255, 0.2)',
                            borderColor: '#58a6ff',
                            borderWidth: 2,
                            pointBackgroundColor: '#58a6ff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            r: {
                                angleLines: { color: 'rgba(255,255,255,0.1)' },
                                grid: { color: 'rgba(255,255,255,0.1)' },
                                pointLabels: { color: '#fff' },
                                ticks: { beginAtZero: true, max: 100, display: false }
                            }
                        },
                        plugins: { legend: { display: false } }
                    }
                });
            }
            // 时间序列图
            const timeCtx = document.getElementById('timeSeriesChart');
            if (timeCtx) {
                timeSeriesRef.current = new Chart(timeCtx, {
                    type: 'line',
                    data: {
                        labels: resultData.time_series?.axis || Array(30).fill(''),
                        datasets: [
                            {
                                label: '你的演唱',
                                data: resultData.time_series?.user_pitch || Array(30).fill(70),
                                borderColor: '#a78bfa',
                                tension: 0.4,
                                pointRadius: 0,
                                fill: false
                            },
                            {
                                label: '原唱参考',
                                data: resultData.time_series?.standard_pitch || Array(30).fill(80),
                                borderColor: '#f0883e',
                                tension: 0.4,
                                pointRadius: 0,
                                fill: false
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { display: false },
                            y: { display: false, grid: { color: 'rgba(255,255,255,0.05)' } }
                        }
                    }
                });
            }
        }, 100);
        return () => {
            if (radarRef.current) radarRef.current.destroy();
            if (timeSeriesRef.current) timeSeriesRef.current.destroy();
        };
    }, [hasResult, resultData]);
    return (
        <div className="flex flex-col min-h-screen lg:h-screen lg:overflow-hidden bg-slate-950 text-white font-sans selection:bg-cyan-500/30">
            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} config={config} onSave={saveConfig} />
            <NicknameModal isOpen={showNicknameModal} onSave={handleSaveNickname} />
            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                data={leaderboardData}
                songName={currentSong.name}
                loading={leaderboardLoading}
            />
            <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur flex items-center justify-between px-4 lg:px-6 shrink-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.5)]"><Music className="text-white w-4 h-4" /></div>
                    <h1 className="text-lg font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">四维声乐 <span className="text-xs font-normal text-slate-500 ml-1">Pro Max</span></h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button onClick={() => setShowSongMenu(!showSongMenu)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-700 transition text-sm">
                            <Disc size={14} className="text-cyan-400 animate-spin-slow"/>
                            <span className="max-w-[80px] sm:max-w-none truncate">{currentSong.name}</span>
                            <ChevronDown size={14} className="text-slate-400"/>
                        </button>
                        {showSongMenu && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                                {SONGS.map(song => (
                                    <button
                                        key={song.id}
                                        onClick={() => { setCurrentSong(song); setShowSongMenu(false); }}
                                        className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-800 transition flex items-center justify-between ${currentSong.id === song.id ? 'bg-slate-800/50 text-cyan-400' : 'text-slate-300'}`}
                                    >
                                        <span>{song.name}</span>
                                        {currentSong.id === song.id && <CheckCircle2 size={14}/>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {nickname && <span className="text-xs text-slate-400 hidden sm:block">Hi, {nickname}</span>}
                    <button onClick={fetchLeaderboard} className="p-2 text-slate-400 hover:text-white transition" title="排行榜"><Trophy size={18} /></button>
                    <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-white transition"><Settings size={18} /></button>
                </div>
            </header>
            <div className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden relative">
                <div className="w-full lg:w-4/12 h-auto lg:h-full flex flex-col border-r border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 relative z-20 shadow-xl shrink-0">
                    <div className="flex-1 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                        {hasResult && (
                            <div className="absolute inset-0 opacity-20 pointer-events-none">
                                <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl transition-all duration-1000 bg-cyan-500"
                                     style={{ opacity: resultData.cavity?.head || 0.5, transform: `scale(${0.8 + (resultData.cavity?.head || 0) * 0.4})` }}></div>
                                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl transition-all duration-1000 bg-indigo-500"
                                     style={{ opacity: resultData.cavity?.chest || 0.5, transform: `scale(${0.8 + (resultData.cavity?.chest || 0) * 0.4})` }}></div>
                            </div>
                        )}
                        {!hasResult ? (
                            <div className="flex flex-col items-center gap-8 w-full max-w-sm z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="w-full text-center px-4">
                                    <h3 className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3 opacity-80">Selected Song</h3>
                                    <div className="text-xl font-serif text-slate-200 leading-relaxed drop-shadow-md mb-2">{currentSong.name}</div>
                                    <p className="text-xs text-slate-400 italic line-clamp-3">“{currentSong.lyrics}”</p>
                                </div>
                                <div className="w-full bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-sm hover:border-slate-600 transition">
                                    <div className="flex items-center gap-4">
                                        <button onClick={handleToggleMusicPlay} className="w-12 h-12 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center transition shadow-lg shrink-0">
                                            {isMusicPlaying ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor" className="ml-1"/>}
                                        </button>
                                        <div className="min-w-0">
                                            <div className="text-slate-200 font-bold text-sm truncate">{currentSong.name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{currentSong.artist} - Full Version</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative group cursor-pointer" onClick={handleToggleRecord}>
                                        <div className={`absolute -inset-4 bg-cyan-500/20 rounded-full blur-xl transition-all duration-500 ${isRecording ? 'opacity-100 scale-110' : 'opacity-0'}`}></div>
                                        <div className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl border-4 ${isRecording ? 'bg-red-500 border-red-600 scale-105' : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-cyan-500/50'}`}>
                                            {isRecording ? <Square size={32} fill="currentColor" className="text-white"/> : <Mic size={32} className="text-cyan-400 group-hover:text-cyan-300"/>}
                                        </div>
                                    </div>
                                    <div className="text-center flex flex-col items-center">
                                        <p className={`font-medium ${isRecording ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>{statusText}</p>
                                        {errorMsg && (
                                            <div className="mt-4 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-950/30 px-3 py-2 rounded-lg border border-red-900/50 max-w-[280px] text-center">
                                                    <AlertCircle size={14} className="shrink-0"/>
                                                    <span>{errorMsg}</span>
                                                </div>
                                                {lastBlob && (
                                                    <button
                                                        onClick={handleReAnalyze}
                                                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 hover:text-white text-xs text-slate-200 rounded-full transition border border-slate-600 shadow-lg group"
                                                    >
                                                        <RotateCcw size={14} className="group-hover:-rotate-180 transition duration-500"/>
                                                        重新尝试分析
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center w-full h-full animate-in zoom-in-95 duration-500">
                                <h3 className="text-slate-400 text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                                    Resonance Mode
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-cyan-300">{resultData.cavity?.mode || 'Balanced'}</span>
                                </h3>
                                <div className="relative w-40 h-[280px] mb-8">
                                    <svg viewBox="0 0 200 400" className="w-full h-full drop-shadow-2xl">
                                        <path d="M60,50 Q100,50 120,100 Q130,150 110,200 Q100,250 120,400 L0,400 L0,50 Z" fill="none" stroke="#334155" strokeWidth="2" />
                                        <path d="M70,60 Q90,60 100,80 Q100,100 80,100 Z" fill="#22d3ee" className="transition-all duration-1000 ease-out" style={{ fillOpacity: resultData.cavity?.head || 0.5, filter: `drop-shadow(0 0 ${10 + (resultData.cavity?.head || 0) * 15}px #22d3ee)` }} />
                                        <path d="M60,220 Q110,220 100,350 Q50,350 40,220 Z" fill="#818cf8" className="transition-all duration-1000 ease-out" style={{ fillOpacity: resultData.cavity?.chest || 0.5, filter: `drop-shadow(0 0 ${10 + (resultData.cavity?.chest || 0) * 15}px #818cf8)` }} />
                                    </svg>
                                    <div className="absolute top-[18%] -right-4 text-xs font-bold transition-all duration-700 flex flex-col items-end" style={{ opacity: 0.5 + (resultData.cavity?.head || 0) * 0.5 }}>
                                        <span className="text-cyan-400">HEAD</span>
                                        <span className="text-[10px] text-cyan-500/70">{Math.round((resultData.cavity?.head || 0) * 100)}%</span>
                                    </div>
                                    <div className="absolute bottom-[30%] -right-4 text-xs font-bold transition-all duration-700 flex flex-col items-end" style={{ opacity: 0.5 + (resultData.cavity?.chest || 0) * 0.5 }}>
                                        <span className="text-indigo-400">CHEST</span>
                                        <span className="text-[10px] text-indigo-500/70">{Math.round((resultData.cavity?.chest || 0) * 100)}%</span>
                                    </div>
                                </div>
                                <div className="w-full max-w-xs bg-slate-900/80 rounded-xl p-3 border border-slate-700 mb-3 backdrop-blur-sm">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <button onClick={handleUserPlayPause} className="w-8 h-8 rounded-full bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center text-white transition">
                                            {isPlaying ? <Pause size={14} fill="currentColor"/> : <Play size={14} fill="currentColor" className="ml-0.5"/>}
                                        </button>
                                        <div className="flex-1">
                                            <input type="range" min="0" max={duration || 0} value={currentTime} onChange={handleSeek} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"/>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono w-16 text-right">{formatTime(currentTime)} / {formatTime(duration)}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] text-slate-500">我的录音</span>
                                        <div className="flex items-center gap-3">
                                            <button onClick={handleReAnalyze} className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition">
                                                <RefreshCw size={10}/> 重新分析
                                            </button>
                                            <button onClick={handleReset} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 transition"><RotateCcw size={10}/> 重新录制</button>
                                        </div>
                                    </div>
                                </div>
                                <audio ref={userAudioRef} src={userAudioUrl} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleEnded} className="hidden"/>
                            </div>
                        )}
                    </div>
                </div>
                <div ref={resultsRef} className="w-full lg:w-8/12 h-auto lg:h-full bg-slate-950 lg:overflow-y-auto custom-scrollbar relative">
                    {!hasResult ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 opacity-30">
                            {errorMsg ? (
                                <div className="flex flex-col items-center gap-2 text-red-900/50">
                                    <AlertCircle size={64} strokeWidth={1} />
                                    <p className="text-sm font-light text-red-900/70">Analysis Failed</p>
                                </div>
                            ) : (
                                <>
                                    <BarChart2 size={64} strokeWidth={1} />
                                    <p className="text-sm font-light">Waiting for analysis...</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col min-h-full bg-[var(--bg-dark)] text-white font-['PingFang SC', 'Microsoft YaHei', sans-serif] relative">
                            <div id="particles-js" className="absolute inset-0 opacity-30 pointer-events-none"></div>
                            <header className="flex items-center justify-between p-4 bg-[var(--panel-bg)] border-b border-[var(--border)]">
                                <Music className="w-6 h-6 text-[var(--primary)]" />
                                <h1 className="text-xl font-bold">4D Music AI Pro - v4.0 Ultra Vision</h1>
                                <div className="flex items-center gap-4">
                                    <button className="px-4 py-1 rounded-full bg-[var(--glass)] text-[var(--primary)] border border-[var(--border)]">
                                        超级模式
                                    </button>
                                    <span className="text-sm">Hi, {nickname || 'nihao'}</span>
                                    <Settings className="w-5 h-5 text-slate-400 cursor-pointer" onClick={() => setShowSettings(true)} />
                                    <X className="w-5 h-5 text-slate-400 cursor-pointer" onClick={handleReset} />
                                </div>
                            </header>
                            <div className="flex flex-1 p-6 gap-6">
                                <div className="w-1/3 flex flex-col items-center">
                                    <span className="text-sm text-slate-400 mb-2">RESONANCE MODE</span>
                                    <button className="px-4 py-1 mb-6 rounded-full bg-[var(--primary)] text-white font-bold">
                                        HEAD DOMINANT
                                    </button>
                                    <div className="tube-v relative">
                                        <div className="fill-v" style={{height: `${resultData.cavity_data?.head * 100 || 96}%`}}></div>
                                    </div>
                                    <span className="mt-2 text-lg font-bold">HEAD {resultData.cavity_data?.head * 100 || 96}%</span>
                                    <span className="text-sm text-slate-400 mt-1">CHEST {resultData.cavity_data?.chest * 100 || 11}%</span>
                                </div>
                                <div className="w-2/3 flex flex-col">
                                    <ReactECharts
                                        option={{
                                            radar: {
                                                indicator: [
                                                    { name: 'Pitch', max: 100 },
                                                    { name: 'Emotion', max: 100 },
                                                    { name: 'Rhythm', max: 100 },
                                                    { name: 'Range', max: 100 },
                                                    { name: 'Stability', max: 100 },
                                                    { name: 'Articulation', max: 100 },
                                                    { name: 'Technique', max: 100 },
                                                    { name: 'Tone', max: 100 }
                                                ],
                                                shape: 'polygon',
                                                splitNumber: 5,
                                                axisName: { color: 'rgba(255,255,255,0.5)' },
                                                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
                                                splitArea: { show: false }
                                            },
                                            series: [{
                                                name: 'Performance',
                                                type: 'radar',
                                                data: [{ value: resultData.radar_data || [80, 70, 85, 90, 75, 82, 88, 92] }],
                                                symbol: 'none',
                                                lineStyle: { color: 'rgba(88,166,255,0.8)' },
                                                areaStyle: { color: 'rgba(88,166,255,0.2)' }
                                            }]
                                        }}
                                        style={{ height: '300px', width: '100%' }}
                                    />
                                    <h2 className="text-5xl font-bold text-white text-center mt-4">{resultData.scores?.total || 73}</h2>
                                    <span className="text-sm text-[var(--accent)] text-center block">综合得分</span>
                                    <p className="text-lg text-center mt-2">排名: Top {resultData.scores?.rank || 29}%</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="h-24 bg-[var(--glass)] rounded-lg p-2">
                                    <ReactECharts
                                        option={{
                                            grid: { left: 0, right: 0, top: 0, bottom: 0 },
                                            xAxis: { type: 'category', show: false },
                                            yAxis: { type: 'value', show: false },
                                            series: [{
                                                data: resultData.time_series?.pitch || [0, 10, 5, 15, 10, 20, 15],
                                                type: 'line',
                                                smooth: true,
                                                symbol: 'none',
                                                lineStyle: { color: 'var(--accent)', width: 2 }
                                            }]
                                        }}
                                        style={{ height: '100%', width: '100%' }}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                    <PlayCircle className="w-8 h-8 text-[var(--primary)] cursor-pointer" onClick={handleUserPlayPause} />
                                    <span className="text-sm text-slate-400">00:00 / Infinity:NaN</span>
                                    <div className="flex gap-2">
                                        <SkipBack className="w-5 h-5 text-slate-400" />
                                        <Pause className="w-5 h-5 text-slate-400" />
                                        <SkipForward className="w-5 h-5 text-slate-400" />
                                    </div>
                                </div>
                                <p className="text-sm text-center mt-2 text-slate-300">{currentSong.lyrics}</p>
                                <div className="ai-body mt-4 p-4 bg-[var(--glass)] rounded-lg">
                                    {resultData.ai_comment || '暂无 AI 点评'}
                                </div>
                                <DetailedReportCard analysis={resultData.detailed_analysis} scores={resultData.scores} />
                                <AITutorCard comment={resultData.ai_comment} />
                            </div>
                        </div>
                    )}
                </div>
                {isAnalyzing && (
                    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <h2 className="text-lg font-bold mt-6 text-white animate-pulse">正在进行九维声学分析...</h2>
                        <p className="text-slate-500 text-xs mt-2">Generating Report & AI Feedback</p>
                    </div>
                )}
            </div>
        </div>
    );
}