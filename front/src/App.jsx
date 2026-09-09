import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import './App.css';
import {
    Mic, Square, Play, Pause, Settings, RotateCcw,
    Activity, Music, Cpu, AlertCircle, X, Server, Key,
    Wifi, WifiOff, User, BarChart2, CheckCircle2,
    PlayCircle, Headphones, MoreHorizontal, SkipBack, SkipForward,
    ChevronDown, Disc, RefreshCw, Trophy
} from 'lucide-react';
import Chart from 'chart.js/auto';


const FourDimVocalHero = ({ className = "" }) => (
  <div className={`w-full h-[50vh] min-h-[320px] flex items-center justify-center ${className}`}>
    <svg
      viewBox="0 0 1200 600"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="四维声乐 - 多维声学分析可视化图标"
    >
      <defs>
        {/* 背景渐变 */}
        <radialGradient id="bg" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="#0B1220" />
          <stop offset="45%" stopColor="#070B14" />
          <stop offset="100%" stopColor="#04060D" />
        </radialGradient>

        {/* 主环渐变 */}
        <linearGradient id="ringGrad" x1="300" y1="120" x2="900" y2="520" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00F5A0" />
          <stop offset="0.45" stopColor="#00D9F5" />
          <stop offset="1" stopColor="#8A2BE2" />
        </linearGradient>

        {/* 音符渐变 */}
        <linearGradient id="noteGrad" x1="520" y1="180" x2="720" y2="420" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF2E63" />
          <stop offset="0.55" stopColor="#8A2BE2" />
          <stop offset="1" stopColor="#00D9F5" />
        </linearGradient>

        {/* 发光滤镜 */}
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 0.75 0"
            result="c"
          />
          <feMerge>
            <feMergeNode in="c" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* 更柔的外发光 */}
        <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="16" result="b2" />
          <feColorMatrix
            in="b2"
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 0.35 0"
            result="c2"
          />
          <feMerge>
            <feMergeNode in="c2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* 扫描线遮罩 */}
        <linearGradient id="scanGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(0,0,0,0)" />
          <stop offset="0.5" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </linearGradient>

        <mask id="scanMask">
          <rect width="1200" height="600" fill="white" />
          <rect x="-300" y="0" width="300" height="600" fill="url(#scanGrad)">
            <animate attributeName="x" from="-300" to="1200" dur="4.6s" repeatCount="indefinite" />
          </rect>
        </mask>

        {/* 点阵粒子 */}
        <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="rgba(148,163,184,0.18)" />
        </pattern>
      </defs>

      {/* 背景 */}
      <rect width="1200" height="600" fill="url(#bg)" />
      <rect width="1200" height="600" fill="url(#dots)" opacity="0.9" />

      {/* 软光背景 */}
      <g opacity="0.9" filter="url(#softGlow)">
        <circle cx="600" cy="290" r="210" fill="rgba(34,211,238,0.10)" />
        <circle cx="520" cy="330" r="160" fill="rgba(168,85,247,0.10)" />
        <circle cx="680" cy="330" r="160" fill="rgba(255,46,99,0.08)" />
      </g>

      {/* 声波环 */}
      <g opacity="0.55" filter="url(#glow)">
        <circle cx="600" cy="300" r="210" stroke="rgba(34,211,238,0.35)" strokeWidth="3" strokeDasharray="9 10">
          <animateTransform attributeName="transform" type="rotate" from="0 600 300" to="360 600 300" dur="18s" repeatCount="indefinite" />
        </circle>
        <circle cx="600" cy="300" r="170" stroke="rgba(168,85,247,0.30)" strokeWidth="2" strokeDasharray="4 8">
          <animateTransform attributeName="transform" type="rotate" from="360 600 300" to="0 600 300" dur="14s" repeatCount="indefinite" />
        </circle>
        <circle cx="600" cy="300" r="130" stroke="rgba(255,46,99,0.25)" strokeWidth="2" strokeDasharray="2 10">
          <animateTransform attributeName="transform" type="rotate" from="0 600 300" to="360 600 300" dur="10s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* 主双环 */}
      <g filter="url(#glow)">
        <circle cx="600" cy="300" r="240" stroke="url(#ringGrad)" strokeWidth="10" opacity="0.95" />
        <circle cx="600" cy="300" r="256" stroke="rgba(148,163,184,0.16)" strokeWidth="2" opacity="0.9" />
      </g>

      {/* 四维节点 */}
      <g filter="url(#glow)">
        {[
          { x: 600, y: 44, c: "#00F5A0" },
          { x: 956, y: 300, c: "#00D9F5" },
          { x: 600, y: 556, c: "#8A2BE2" },
          { x: 244, y: 300, c: "#FF2E63" },
        ].map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="12" fill={p.c} opacity="0.95" />
            <circle cx={p.x} cy={p.y} r="12" fill="none" stroke={p.c} strokeWidth="2" opacity="0.8">
              <animate attributeName="r" values="12;22;12" dur="2.2s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
              <animate attributeName="opacity" values="0.75;0.12;0.75" dur="2.2s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
            </circle>
          </g>
        ))}
      </g>

      {/* 四象限指标小柱 */}
      <g opacity="0.9">
        {/* 左上 */}
        <g transform="translate(420 170)">
          <rect x="0" y="70" width="12" height="30" rx="6" fill="rgba(0,245,160,0.75)" />
          <rect x="18" y="52" width="12" height="48" rx="6" fill="rgba(0,217,245,0.75)" />
          <rect x="36" y="34" width="12" height="66" rx="6" fill="rgba(138,43,226,0.75)" />
        </g>
        {/* 右上 */}
        <g transform="translate(730 170)">
          <rect x="0" y="50" width="12" height="50" rx="6" fill="rgba(255,46,99,0.70)" />
          <rect x="18" y="60" width="12" height="40" rx="6" fill="rgba(0,217,245,0.65)" />
          <rect x="36" y="40" width="12" height="60" rx="6" fill="rgba(0,245,160,0.65)" />
        </g>
        {/* 左下 */}
        <g transform="translate(420 360)">
          <rect x="0" y="40" width="12" height="60" rx="6" fill="rgba(138,43,226,0.70)" />
          <rect x="18" y="66" width="12" height="34" rx="6" fill="rgba(0,217,245,0.65)" />
          <rect x="36" y="52" width="12" height="48" rx="6" fill="rgba(255,46,99,0.60)" />
        </g>
        {/* 右下 */}
        <g transform="translate(730 360)">
          <rect x="0" y="58" width="12" height="42" rx="6" fill="rgba(0,245,160,0.70)" />
          <rect x="18" y="36" width="12" height="64" rx="6" fill="rgba(138,43,226,0.65)" />
          <rect x="36" y="64" width="12" height="36" rx="6" fill="rgba(0,217,245,0.60)" />
        </g>
      </g>

      {/* 中心音符 */}
      <g filter="url(#glow)">
        {/* 音符杆 */}
        <path
          d="M650 182 V380"
          stroke="url(#noteGrad)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        {/* 音符旗帜 */}
        <path
          d="M650 210
             C690 210 714 190 744 190
             C748 220 724 244 688 252
             C672 256 660 260 650 266"
          fill="none"
          stroke="url(#noteGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 音符头 */}
        <ellipse cx="600" cy="395" rx="54" ry="36" fill="rgba(0,217,245,0.18)" />
        <ellipse cx="600" cy="395" rx="40" ry="26" fill="rgba(255,46,99,0.18)" />
        <path
          d="M560 395
             C560 368 584 348 612 348
             C640 348 662 366 662 392
             C662 420 638 442 608 442
             C580 442 560 420 560 395Z"
          fill="rgba(34,211,238,0.22)"
        />
        <path
          d="M560 395
             C560 368 584 348 612 348
             C640 348 662 366 662 392
             C662 420 638 442 608 442
             C580 442 560 420 560 395Z"
          stroke="rgba(34,211,238,0.55)"
          strokeWidth="3"
        />
      </g>

      {/* 扫描线效果 */}
      <g mask="url(#scanMask)" opacity="0.45">
        <rect width="1200" height="600" fill="rgba(34,211,238,0.10)" />
      </g>

      {/* 底部标题 */}
      <g opacity="0.9">
        <text x="600" y="560" textAnchor="middle" fontSize="18" fill="rgba(148,163,184,0.75)">
          四维声乐 · Multi-Dimensional Vocal Analysis
        </text>
      </g>
    </svg>
  </div>
);


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
        const url = localConfig.backendUrl ? `${localConfig.backendUrl.replace(/\/$/, '')}/version` : '/version';
        try {
            await axios.get(url, { timeout: 5000 });
            setTestStatus('success'); setTestMsg("连接成功！后端服务在线。");
        } catch (e) {
            if (e.response) { setTestStatus('success'); setTestMsg(`连接成功！(服务响应: ${e.response.status})`); }
            else { setTestStatus('error'); setTestMsg("连接失败：请确保后端已运行"); }
        }
    };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Small delay to trigger animation
            requestAnimationFrame(() => setMounted(true));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-[#05070a]">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{animationDuration: '4s'}}></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] animate-pulse" style={{animationDuration: '5s', animationDelay: '1s'}}></div>
                <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse" style={{animationDuration: '6s', animationDelay: '2s'}}></div>
                
                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            </div>

            {/* Glass Card */}
            <div className={`relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-md p-10 shadow-2xl text-center transform transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}`}>
                
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
                
                {/* Icon */}
                <div className="relative w-24 h-24 mx-auto mb-8 group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full blur-xl opacity-40 group-hover:opacity-70 transition-opacity duration-500 animate-pulse"></div>
                    <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center border border-white/10 shadow-2xl group-hover:scale-105 transition-transform duration-300">
                        <User size={40} className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                    </div>
                </div>

                {/* Text */}
                <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-purple-300 mb-3 tracking-tight">
                    四维声乐
                </h2>
                <p className="text-slate-400 text-sm mb-10 font-light tracking-wide">
                    探索声音的无限可能 · AI 智能分析系统
                </p>

                {/* Input */}
                <div className="relative mb-8 group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave(name)} 
                        placeholder="请输入您的昵称" 
                        className="relative w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-5 py-4 text-center text-white placeholder-slate-500 focus:border-cyan-500/50 focus:bg-slate-900/80 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all duration-300"
                    />
                </div>

                {/* Button */}
                <button 
                    onClick={() => name.trim() && onSave(name)} 
                    disabled={!name.trim()} 
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300 relative overflow-hidden group
                        ${name.trim() 
                            ? 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:scale-[1.02] active:scale-[0.98]' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        进入系统
                        {name.trim() && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                    </span>
                    {name.trim() && <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-white/20 to-cyan-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>}
                </button>
                
                <div className="mt-8 text-[10px] text-slate-600 uppercase tracking-widest">
                    AI Powered Vocal Analysis
                </div>
            </div>
        </div>
    );
};

const LeaderboardModal = ({ isOpen, onClose, data, songName, loading }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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

// --- App 主组件 ---
const DEFAULT_CONFIG = { backendUrl: '', apiKey: '', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: '' };
const CHART_MIN_POINTS = 60;
const CHART_DEFAULT_PITCH = [65,68,72,70,75,82,85,82,78,80,85,90,88,85,82,80,85,90,92,85,80,85,88,90,92,95,90,88,85,82];
const CHART_DEFAULT_TEMPO = [95,96,95,96,95,96,95,96,95,96,95,96,95,96,95,96,95,96,95,96,95,96,95,96,95,96,95,96,95,96];
const CHART_DEFAULT_STABILITY = [70,72,70,68,72,75,70,65,60,65,70,75,70,68,70,72,75,70,65,62,65,70,75,72,70,68,70,72,75,70];

function toNumericSeries(series) {
    if (!Array.isArray(series)) return [];
    return series.map((value) => {
        if (value === null || value === undefined || value === '') return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    });
}

function normalizeSeriesLength(series, targetLength, fallbackSeries = []) {
    const safeTarget = Math.max(2, targetLength || 0);
    const source = toNumericSeries(series);
    const fallback = toNumericSeries(fallbackSeries);
    const values = source.some(v => v !== null) ? source : fallback;

    if (!values.length || !values.some(v => v !== null)) return Array(safeTarget).fill(0);
    if (values.length === 1) return Array(safeTarget).fill(values[0] ?? 0);

    const firstValid = values.find(v => v !== null) ?? 0;
    const lastValid = [...values].reverse().find(v => v !== null) ?? firstValid;
    const edgeFilled = values.slice();

    for (let i = 0; i < edgeFilled.length; i++) {
        if (edgeFilled[i] !== null) break;
        edgeFilled[i] = firstValid;
    }
    for (let i = edgeFilled.length - 1; i >= 0; i--) {
        if (edgeFilled[i] !== null) break;
        edgeFilled[i] = lastValid;
    }

    let lastSeen = edgeFilled[0];
    for (let i = 0; i < edgeFilled.length; i++) {
        if (edgeFilled[i] === null) edgeFilled[i] = lastSeen;
        else lastSeen = edgeFilled[i];
    }

    if (edgeFilled.length === safeTarget) return edgeFilled;

    const result = new Array(safeTarget).fill(0);
    const sourceLastIndex = edgeFilled.length - 1;
    for (let i = 0; i < safeTarget; i++) {
        const sourcePos = (i * sourceLastIndex) / (safeTarget - 1);
        const leftIndex = Math.floor(sourcePos);
        const rightIndex = Math.min(sourceLastIndex, leftIndex + 1);
        const ratio = sourcePos - leftIndex;
        const leftValue = edgeFilled[leftIndex];
        const rightValue = edgeFilled[rightIndex];
        result[i] = leftValue + (rightValue - leftValue) * ratio;
    }
    return result;
}

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
    const [currentSong, setCurrentSong] = useState(SONGS[0]);
    const [showSongMenu, setShowSongMenu] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    
    const audioMusicRef = useRef(null);
    const userAudioRef = useRef(null);
    const [userAudioUrl, setUserAudioUrl] = useState(null);
    const timeSeriesRef = useRef(null);

    const [resultData, setResultData] = useState({
        scores: { pitch: 0, rhythm: 0, stability: 0, tone: 0, tension: 0, technique: 0, articulation: 0, range: 0, emotion: 0 },
        emotionTag: "",
        totalScore: 0,
        aiComment: "",
        detailedAnalysis: null,
        timeSeries: { axis: [], user: [], standard: [], dynamics: [] },
        cavity: { head: 0, chest: 0, mode: "Unknown", centroid: 0 },
        lagCorrection: 0
    });

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

    const saveConfig = (newConfig) => { setConfig(newConfig); localStorage.setItem('vocal_app_config', JSON.stringify(newConfig)); setShowSettings(false); };
    const handleSaveNickname = (name) => { setNickname(name); localStorage.setItem('vocal_nickname', name); setShowNicknameModal(false); };
    
    const handleReset = () => {
        setIsMusicPlaying(false);
        if(audioMusicRef.current) {
            audioMusicRef.current.pause();
            audioMusicRef.current.currentTime = 0;
        }
        if(userAudioRef.current) { userAudioRef.current.pause(); userAudioRef.current.currentTime = 0; }
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
        if(userAudioRef.current) { userAudioRef.current.pause(); }
        if (isMusicPlaying) {
            audioMusicRef.current.pause();
            setIsMusicPlaying(false);
        } else {
            try {
                await audioMusicRef.current.play();
                setIsMusicPlaying(true);
            } catch (err) {
                console.error("Play failed:", err);
                setErrorMsg("无法播放音频：请检查配置或确认文件。");
            }
        }
    };

    const handleToggleRecord = async () => {
        if (isMusicPlaying) handleToggleMusicPlay();
        if(userAudioRef.current) { userAudioRef.current.pause(); }
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
            const rawCavity = data.cavity_data || { head: 0.96, chest: 0.11, centroid: 415 };
            const smoothHead = Math.min(0.96, rawCavity.head);
            const smoothChest = Math.min(0.96, rawCavity.chest);
            const totalScore = Math.floor(
                ((data.scores?.pitch || 80) * 0.4) +
                ((data.scores?.rhythm || 80) * 0.2) +
                ((data.scores?.emotion || 80) * 0.2) +
                ((data.scores?.stability || 80) * 0.2)
            );
            setResultData({
                scores: data.scores,
                totalScore: totalScore,
                ai_comment: data.ai_comment,
                time_series: data.time_series,
                cavity: { head: smoothHead, chest: smoothChest, centroid: rawCavity.centroid },
                detailed_analysis: data.detailed_analysis,
            });
            setHasResult(true);
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

    useEffect(() => {
        if (!hasResult || !resultData) return;
        
        // 动态加载 particles.js 
        if (!window.particlesJS) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/particles.js/2.0.0/particles.min.js';
            script.async = true;
            script.onload = () => {
                window.particlesJS('particles-js', {
                    particles: {
                        number: { value: 35 },
                        color: { value: '#58a6ff' },
                        line_linked: { enable: true, distance: 180, opacity: 0.1, color: '#58a6ff' },
                        move: { enable: true, speed: 0.8 }
                    },
                    interactivity: { detect_on: 'canvas', events: { resize: true } },
                    retina_detect: true
                });
            };
            document.head.appendChild(script);
        } else {
            window.particlesJS('particles-js', {
                particles: {
                    number: { value: 35 },
                    color: { value: '#58a6ff' },
                    line_linked: { enable: true, distance: 180, opacity: 0.1, color: '#58a6ff' },
                    move: { enable: true, speed: 0.8 }
                },
                interactivity: { detect_on: 'canvas', events: { resize: true } },
                retina_detect: true
            });
        }

        // 初始化时间序列图表
        setTimeout(() => {
            const timeCtx = document.getElementById('timeSeriesChart');
            if (timeCtx) {
                const rawTimeSeries = resultData.time_series || {};
                const axisLength = Array.isArray(rawTimeSeries.axis) ? rawTimeSeries.axis.length : 0;
                const pitchLength = Array.isArray(rawTimeSeries.user_pitch) ? rawTimeSeries.user_pitch.length : 0;
                const tempoLength = Array.isArray(rawTimeSeries.tempo) ? rawTimeSeries.tempo.length : 0;
                const stabilityLength = Array.isArray(rawTimeSeries.stability) ? rawTimeSeries.stability.length : 0;
                const targetLength = Math.max(CHART_MIN_POINTS, axisLength, pitchLength, tempoLength, stabilityLength);
                const labels = Array(targetLength).fill('');
                const pitchData = normalizeSeriesLength(rawTimeSeries.user_pitch, targetLength, CHART_DEFAULT_PITCH);
                // [Fix] 只渲染有真实数据的维度，避免 tempo/stability 缺失时画预设假数据
                const hasPitch = toNumericSeries(rawTimeSeries.user_pitch).some(v => v !== null);
                const hasTempo = toNumericSeries(rawTimeSeries.tempo).some(v => v !== null);
                const hasStability = toNumericSeries(rawTimeSeries.stability).some(v => v !== null);

                const chartDatasets = [];
                if (hasPitch) {
                    chartDatasets.push({
                        label: '音准',
                        data: pitchData,
                        borderColor: '#a78bfa',
                        borderWidth: 3,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: false
                    });
                }
                if (hasTempo) {
                    const tempoData = normalizeSeriesLength(rawTimeSeries.tempo, targetLength, CHART_DEFAULT_TEMPO);
                    chartDatasets.push({
                        label: '节奏',
                        data: tempoData,
                        borderColor: '#f0883e',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: false
                    });
                }
                if (hasStability) {
                    const stabilityData = normalizeSeriesLength(rawTimeSeries.stability, targetLength, CHART_DEFAULT_STABILITY);
                    chartDatasets.push({
                        label: '稳定',
                        data: stabilityData,
                        borderColor: '#2ea043',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: false
                    });
                }

                if (timeSeriesRef.current) timeSeriesRef.current.destroy();
                timeSeriesRef.current = new Chart(timeCtx, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: chartDatasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { x: { display: false }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } } }
                    }
                });
            }
        }, 100);
    }, [hasResult, resultData]);

    return (
        <>
            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} config={config} onSave={saveConfig} />
            <NicknameModal isOpen={showNicknameModal} onSave={handleSaveNickname} />
            <LeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} data={leaderboardData} songName={currentSong.name} loading={leaderboardLoading} />
            
            {/* 全局 Loading 遮罩 */}
            {isAnalyzing && (
                <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <h2 className="text-lg font-bold mt-6 text-white animate-pulse">正在进行九维声学分析...</h2>
                    <p className="text-slate-500 text-xs mt-2">Generating Report & AI Feedback</p>
                </div>
            )}

            {/* ======== 状态一：录音/待机界面 (原有界面保持完全不变) ======== */}
            {!hasResult && (
                <div className="flex flex-col min-h-screen lg:h-screen lg:overflow-hidden bg-slate-950 text-white font-sans selection:bg-cyan-500/30">
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
                                            <button key={song.id} onClick={() => { setCurrentSong(song); setShowSongMenu(false); }} className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-800 transition flex items-center justify-between ${currentSong.id === song.id ? 'bg-slate-800/50 text-cyan-400' : 'text-slate-300'}`}>
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
                        {/* 左侧录音面板 */}
                        <div className="w-full lg:w-4/12 h-auto lg:h-full flex flex-col border-r border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 relative z-20 shadow-xl shrink-0">
                            <div className="flex-1 p-6 flex flex-col items-center justify-center relative overflow-hidden">
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
                                                        <button onClick={handleReAnalyze} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 hover:text-white text-xs text-slate-200 rounded-full transition border border-slate-600 shadow-lg group">
                                                            <RotateCcw size={14} className="group-hover:-rotate-180 transition duration-500"/>
                                                            重新尝试分析
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* 右侧待机占位图 */}
                        <div className="hidden lg:flex flex-1 items-center justify-center bg-slate-950 relative">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(88,166,255,0.05),transparent_50%)]"></div>
                            <div className="text-center text-slate-600 z-10 flex flex-col items-center gap-4">
                                <FourDimVocalHero />
                                <p className="text-sm tracking-widest uppercase">请在左侧录制您的演唱</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======== 状态二：全新结果界面 (直接替换页面内容) ======== */}
            {hasResult && (
                <div className="app-container">
                    <div id="particles-js"></div>
                    
                    <header className="header-board">
                        <div style={{fontSize: '24px', fontWeight: 900, letterSpacing: '1px'}}>4D <span style={{color:'var(--primary)'}}>MUSIC AI</span> PRO</div>
                        <div style={{display: 'flex', gap: '40px', alignItems: 'center'}}>
                            <div style={{textAlign: 'right'}}><span style={{fontSize: '12px', opacity: 0.6}}>音阶中心</span><div style={{fontWeight: 'bold', color: 'var(--primary)'}}>{resultData.cavity?.centroid ? Math.round(resultData.cavity.centroid) + 'Hz' : '415Hz'}</div></div>
                            <div style={{textAlign: 'right'}}><span style={{fontSize: '12px', opacity: 0.6}}>综合评分</span><div style={{fontSize: '28px', fontWeight: 800, color: 'var(--accent)'}}>{resultData.totalScore || 88.5}</div></div>
                        </div>
                    </header>

                    <aside className="left-aside">
                        <div className="monitor-unit">
                            <div style={{textAlign: 'center', color: 'var(--primary)', fontSize: '12px', marginBottom: '15px'}}>声带发力状态</div>
                            <div style={{display: 'flex', justifyContent: 'space-around'}}>
                                <div>
                                    <div className="tube-v"><div className="fill-v" style={{height: `${(resultData.cavity?.head || 0.85) * 100}%`, background: 'cyan', boxShadow: '0 0 15px cyan'}}></div></div>
                                    <p style={{fontSize: '12px', textAlign: 'center'}}>头腔</p>
                                </div>
                                <div>
                                    <div className="tube-v"><div className="fill-v" style={{height: `${(resultData.cavity?.chest || 0.15) * 100}%`, background: 'var(--accent)', boxShadow: '0 0 15px var(--accent)'}}></div></div>
                                    <p style={{fontSize: '12px', textAlign: 'center'}}>胸腔</p>
                                </div>
                            </div>
                        </div>

                        <div className="monitor-unit">
                            <div style={{fontSize: '12px', color: 'var(--success)', marginBottom: '10px'}}>呼吸支撑密度</div>
                            <div style={{height: '8px', background: '#000', borderRadius: '4px', overflow: 'hidden'}}>
                                <div style={{width: `${resultData.scores?.stability || 70}%`, height: '100%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)'}}></div>
                            </div>
                            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '5px', opacity: 0.6}}>
                                <span>低压</span><span>高支撑 ({resultData.scores?.stability || 70}%)</span>
                            </div>
                        </div>

                        <button onClick={handleReset} style={{marginTop: 'auto', width: '100%', padding: '15px', borderRadius: '12px', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(88,166,255,0.3)'}}>
                            重新校准声纹
                        </button>
                    </aside>

                    <main className="main-view">
                        <section className="chart-box">
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                                <span style={{fontSize: '14px', color: 'var(--primary)'}}>4D 实时声纹轨迹</span>
                                <div style={{display: 'flex', gap: '15px', fontSize: '10px', opacity: 0.6}}>
                                    <span>● 音准</span><span>● 节奏</span><span>● 稳定</span>
                                </div>
                            </div>
                            <div className="chart-box-content"><canvas id="timeSeriesChart"></canvas></div>
                        </section>

                        <section className="stats-grid">
                            <div className="stat-card" style={{'--c': 'var(--purple)'}}><span style={{fontSize: '12px', opacity: 0.7}}>音准精准度</span><div><strong style={{fontSize: '24px'}}>{resultData.scores?.pitch || 84}%</strong></div></div>
                            <div className="stat-card" style={{'--c': 'var(--accent)'}}><span style={{fontSize: '12px', opacity: 0.7}}>节奏同步率</span><div><strong style={{fontSize: '24px'}}>{resultData.scores?.rhythm || 96}%</strong></div></div>
                            <div className="stat-card" style={{'--c': 'var(--primary)'}}><span style={{fontSize: '12px', opacity: 0.7}}>共鸣丰满度</span><div><strong style={{fontSize: '24px'}}>{resultData.scores?.tone || 75}%</strong></div></div>
                            <div className="stat-card" style={{'--c': 'var(--success)'}}><span style={{fontSize: '12px', opacity: 0.7}}>气息稳定性</span><div><strong style={{fontSize: '24px'}}>{resultData.scores?.stability || 70}%</strong></div></div>
                            <div className="stat-card" style={{'--c': '#7c3aed'}}><span style={{fontSize: '12px', opacity: 0.7}}>情感表现力</span><div><strong style={{fontSize: '24px'}}>{resultData.scores?.emotion || 66}%</strong></div></div>
                            <div className="stat-card" style={{'--c': '#ffd43b'}}><span style={{fontSize: '12px', opacity: 0.7}}>瞬态爆发力</span><div><strong style={{fontSize: '24px'}}>{resultData.scores?.tension || 50}%</strong></div></div>
                        </section>
                    </main>

                    <aside className="ai-sidebar">
                        <div className="ai-header">🎓 AI 深度教学建议</div>
                        <div className="ai-body">
                            {resultData.ai_comment ? (
                                <div style={{fontSize: '14px', color: '#cbd5e1', whiteSpace: 'pre-wrap'}}>{resultData.ai_comment}</div>
                            ) : (
                                <div style={{fontSize: '14px', color: '#cbd5e1'}}>正在生成 AI 点评数据...</div>
                            )}
                        </div>
                    </aside>
                </div>
            )}
        </>
    );
}