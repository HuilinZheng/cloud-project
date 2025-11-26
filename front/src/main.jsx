import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import {
    Users, Calendar, ClipboardList, Camera, Trophy, MapPin,
    LogOut, Plus, CheckCircle, Clock, User, Moon, Sun, Trash2, ChevronDown, ChevronUp,
    BarChart3, PenTool, Save, Eraser, Undo, RotateCcw, FileText, Settings
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import CanvasDraw from "react-canvas-draw";

// --- Configuration: Basketball Court Background ---
const COURT_SVG_RAW = `
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" style="background-color:#e6cfa3;">
  <rect x="0" y="0" width="800" height="600" fill="#e6cfa3" />
  <rect x="40" y="40" width="720" height="520" fill="none" stroke="#fff" stroke-width="4" />
  <line x1="400" y1="40" x2="400" y2="560" stroke="#fff" stroke-width="4" />
  <circle cx="400" cy="300" r="60" fill="none" stroke="#fff" stroke-width="4" />
  <rect x="40" y="220" width="150" height="160" fill="none" stroke="#fff" stroke-width="4" />
  <circle cx="190" cy="300" r="50" fill="none" stroke="#fff" stroke-width="4" />
  <path d="M 40,50 Q 300,300 40,550" fill="none" stroke="#fff" stroke-width="4" />
  <rect x="610" y="220" width="150" height="160" fill="none" stroke="#fff" stroke-width="4" />
  <circle cx="610" cy="300" r="50" fill="none" stroke="#fff" stroke-width="4" />
  <path d="M 760,50 Q 500,300 760,550" fill="none" stroke="#fff" stroke-width="4" />
  <circle cx="90" cy="300" r="8" fill="none" stroke="#ec7c26" stroke-width="3" />
  <circle cx="710" cy="300" r="8" fill="none" stroke="#ec7c26" stroke-width="3" />
</svg>`;
const COURT_BG_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(COURT_SVG_RAW)}`;

// --- Axios Config ---
const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// --- Theme Helper ---
const useThemeClasses = (isDark) => {
    return {
        bg: isDark ? 'bg-gray-900' : 'bg-slate-50',
        text: isDark ? 'text-gray-100' : 'text-slate-800',
        textMuted: isDark ? 'text-gray-400' : 'text-slate-500',
        card: isDark ? 'bg-gray-800' : 'bg-white shadow-md border border-slate-200',
        input: isDark ? 'bg-gray-700 text-white border-none' : 'bg-white text-slate-900 border border-slate-300 focus:border-blue-500',
        primaryBtn: isDark ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white',
        secondaryBtn: isDark ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800',
        accentText: isDark ? 'text-orange-400' : 'text-blue-600',
        accentBorder: isDark ? 'border-orange-500' : 'border-yellow-400',
        sidebar: isDark ? 'bg-gray-800' : 'bg-white border-r border-slate-200',
        sidebarActive: isDark ? 'bg-orange-600 text-white' : 'bg-blue-100 text-blue-700',
        successText: isDark ? 'text-green-400' : 'text-green-600',
        divider: isDark ? 'border-gray-700' : 'border-slate-200',
    };
};

const formatDateInput = (value) => value.slice(0, 16).replace('T', ' ');

// --- Components ---

const Login = ({ onLogin, isDark, toggleTheme }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '', role: 'player', real_name: '', student_id: '' });
    const [error, setError] = useState('');
    const theme = useThemeClasses(isDark);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const endpoint = isRegister ? '/register' : '/login';
            const res = await api.post(endpoint, formData);
            if (!isRegister) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                onLogin(res.data.user);
            } else {
                alert('注册成功！请登录。');
                setIsRegister(false);
            }
        } catch (err) {
            setError(err.response?.data?.message || '操作失败');
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center ${theme.bg} ${theme.text} transition-colors duration-300`}>
            <div className={`${theme.card} p-8 rounded-lg shadow-xl w-96 relative`}>
                <button onClick={toggleTheme} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme.accentText}`}>
                    <Trophy /> {isRegister ? '加入球队' : '球队登录'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" placeholder="用户名" className={`w-full p-2 rounded outline-none ${theme.input}`} value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
                    <input type="password" placeholder="密码" className={`w-full p-2 rounded outline-none ${theme.input}`} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                    {isRegister && (
                        <>
                            <select className={`w-full p-2 rounded outline-none ${theme.input}`} value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                <option value="player">队员 (Player)</option>
                                <option value="captain">队长 (Captain)</option>
                                <option value="coach">教练 (Coach)</option>
                                <option value="manager">经理 (Manager)</option>
                            </select>
                            <input type="text" placeholder="真实姓名" className={`w-full p-2 rounded outline-none ${theme.input}`} value={formData.real_name} onChange={e => setFormData({ ...formData, real_name: e.target.value })} required />
                            <input type="text" placeholder="学号" className={`w-full p-2 rounded outline-none ${theme.input}`} value={formData.student_id} onChange={e => setFormData({ ...formData, student_id: e.target.value })} required />
                        </>
                    )}
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button type="submit" className={`w-full p-2 rounded font-bold transition-colors ${theme.primaryBtn}`}>{isRegister ? '注册' : '登录'}</button>
                </form>
                <p className={`mt-4 text-center text-sm cursor-pointer hover:underline ${theme.textMuted}`} onClick={() => setIsRegister(!isRegister)}>{isRegister ? '已有账号？去登录' : '新队员？点此注册'}</p>
            </div>
        </div>
    );
};

// --- Tactical Board (OBS Version) ---
const TacticalBoard = ({ user, theme, isVisible }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [color, setColor] = useState("#ff0000");
    const [brushRadius, setBrushRadius] = useState(3);
    const [isSaving, setIsSaving] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (isVisible && containerRef.current) {
            const updateSize = () => {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            };
            setTimeout(updateSize, 100);
            window.addEventListener('resize', updateSize);
            return () => window.removeEventListener('resize', updateSize);
        }
    }, [isVisible]);

    const handleSave = async () => {
        if (!canvasRef.current) return;
        setIsSaving(true);
        try {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = dimensions.width;
            tempCanvas.height = dimensions.height;
            const ctx = tempCanvas.getContext('2d');

            // 1. 绘制底图
            const bgImg = new Image();
            bgImg.src = COURT_BG_DATA_URL;
            await new Promise((resolve, reject) => {
                bgImg.onload = resolve;
                bgImg.onerror = reject;
            });
            ctx.drawImage(bgImg, 0, 0, dimensions.width, dimensions.height);

            // 2. 绘制线条
            const linesData = canvasRef.current.getDataURL("image/png", false, "rgba(0,0,0,0)");
            const linesImg = new Image();
            linesImg.src = linesData;
            await new Promise((resolve) => {
                linesImg.onload = resolve;
            });
            ctx.drawImage(linesImg, 0, 0, dimensions.width, dimensions.height);

            tempCanvas.toBlob(async (blob) => {
                if (!blob) {
                    alert("图片生成失败");
                    setIsSaving(false);
                    return;
                }
                const file = new File([blob], `tactics_${Date.now()}.png`, { type: "image/png" });
                const formData = new FormData();
                formData.append('file', file);

                // Upload to OBS
                const uploadRes = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                // Save record
                await api.post('/photos', {
                    url: uploadRes.data.url,
                    description: `战术板 - 由 ${user.real_name} 绘制`
                });

                alert("战术已保存到【风采展示】！");
                setIsSaving(false);
            }, 'image/png');

        } catch (e) {
            console.error("Save failed:", e);
            alert("保存失败: " + e.message);
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <h2 className="text-3xl font-bold mb-6">交互式战术画板</h2>
            <div className="flex flex-col lg:flex-row gap-4 h-full">
                <div className={`${theme.card} p-4 rounded flex flex-col gap-4 lg:w-32`}>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">颜色</label>
                        <div className="flex flex-wrap gap-2">
                            {['#ff0000', '#2563eb', '#10b981', '#000000', '#ffffff', '#eab308'].map(c => (
                                <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-white shadow-md' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">粗细: {brushRadius}</label>
                        <input type="range" min="1" max="10" value={brushRadius} onChange={e => setBrushRadius(parseInt(e.target.value))} className="w-full" />
                    </div>
                    <div className="mt-auto space-y-2">
                        <button onClick={() => canvasRef.current.undo()} className={`w-full p-2 rounded flex items-center gap-2 ${theme.secondaryBtn}`}><Undo size={16} /> 撤销</button>
                        <button onClick={() => canvasRef.current.clear()} className={`w-full p-2 rounded flex items-center gap-2 text-red-500 bg-red-100 hover:bg-red-200`}><Eraser size={16} /> 清空</button>
                        <button onClick={handleSave} disabled={isSaving} className={`w-full p-2 rounded flex items-center gap-2 ${theme.primaryBtn}`}>
                            {isSaving ? '保存中...' : <><Save size={16} /> 保存</>}
                        </button>
                    </div>
                </div>

                <div ref={containerRef} className={`flex-1 ${theme.card} p-1 rounded overflow-hidden border-4 ${theme.accentBorder} relative bg-gray-100 min-h-[500px]`}>
                    <div className="absolute inset-0 pointer-events-none" style={{
                        backgroundImage: `url('${COURT_BG_DATA_URL}')`,
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                        zIndex: 0
                    }}></div>

                    {dimensions.width > 0 && (
                        <div className="absolute inset-0" style={{ zIndex: 10 }}>
                            <CanvasDraw
                                key={dimensions.width}
                                ref={canvasRef}
                                brushColor={color}
                                brushRadius={brushRadius}
                                lazyRadius={1}
                                catenaryColor={color}
                                canvasWidth={dimensions.width}
                                canvasHeight={dimensions.height}
                                hideGrid={true}
                                enablePanAndZoom={false}
                                backgroundColor="rgba(0,0,0,0)"
                                style={{ background: 'transparent', width: '100%', height: '100%' }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

// --- Personnel Module (人员信息墙) ---
const PersonnelModule = ({ user, theme }) => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        api.get('/users').then(res => setUsers(res.data)).catch(err => console.error(err));
    }, []);

    const roleColors = {
        captain: 'bg-yellow-500 text-white',
        coach: 'bg-red-600 text-white',
        manager: 'bg-purple-600 text-white',
        player: 'bg-blue-500 text-white'
    };

    const roleLabels = {
        captain: '队长', coach: '教练', manager: '经理', player: '队员'
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">球队花名册</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {users.map(u => (
                    <div key={u.id} className={`${theme.card} p-6 rounded-xl shadow-lg flex flex-col items-center text-center hover:scale-105 transition-transform duration-300`}>
                        <div className="relative mb-4">
                            {u.avatar_url ? (
                                <img src={u.avatar_url} alt={u.real_name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
                            ) : (
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold ${theme.bg} ${theme.textMuted} border-4 border-white shadow-md`}>
                                    {u.real_name?.[0] || u.username[0]}
                                </div>
                            )}
                            <span className={`absolute bottom-0 right-0 px-2 py-0.5 text-xs rounded-full shadow-sm font-bold uppercase ${roleColors[u.role] || 'bg-gray-500 text-white'}`}>
                                {roleLabels[u.role] || u.role}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold mb-1">{u.real_name}</h3>
                        <p className={`text-sm ${theme.textMuted} mb-3`}>@{u.username}</p>
                        <div className={`w-full h-px ${theme.divider} my-2`}></div>
                        <div className="text-sm w-full text-left space-y-1">
                            <p><span className={theme.textMuted}>学号:</span> {u.student_id || '-'}</p>
                            <p className="truncate"><span className={theme.textMuted}>简介:</span> {u.bio || '这个人很懒...'}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Profile Settings (个人中心) ---
const ProfileSettings = ({ user, theme, onUpdateUser }) => {
    const [formData, setFormData] = useState({
        real_name: user.real_name || '',
        student_id: user.student_id || '',
        bio: user.bio || '',
        password: '',
        avatar_url: user.avatar_url || ''
    });
    const [isUploading, setIsUploading] = useState(false);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const res = await api.post('/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, avatar_url: res.data.url }));
            alert('头像上传成功，请记得点击下方“保存修改”');
        } catch (err) {
            alert('头像上传失败: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put('/users/profile', formData);
            alert('资料更新成功！');
            const updatedUser = { ...user, ...formData };
            delete updatedUser.password;
            localStorage.setItem('user', JSON.stringify(updatedUser));
            onUpdateUser(updatedUser);
        } catch (err) {
            alert('更新失败: ' + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">个人档案设置</h2>

            <form onSubmit={handleSubmit} className={`${theme.card} p-8 rounded-xl shadow-lg space-y-6`}>
                <div className="flex flex-col items-center mb-6">
                    <div className="relative w-32 h-32 mb-4 group">
                        {formData.avatar_url ? (
                            <img src={formData.avatar_url} className="w-full h-full rounded-full object-cover border-4 border-gray-200" />
                        ) : (
                            <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-4xl text-gray-400">
                                <User size={48} />
                            </div>
                        )}
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-white font-bold">
                            {isUploading ? '上传中...' : '更换头像'}
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                    </div>
                    <p className={`text-sm ${theme.textMuted}`}>点击图片上传新头像</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold mb-2">真实姓名</label>
                        <input type="text" className={`w-full p-3 rounded ${theme.input}`} value={formData.real_name} onChange={e => setFormData({ ...formData, real_name: e.target.value })} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">学号</label>
                        <input type="text" className={`w-full p-3 rounded ${theme.input}`} value={formData.student_id} onChange={e => setFormData({ ...formData, student_id: e.target.value })} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold mb-2">个人简介</label>
                    <textarea className={`w-full p-3 rounded ${theme.input}`} rows="3" value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} placeholder="写一句话介绍自己..." />
                </div>

                <div className={`p-4 rounded border border-yellow-500/30 ${theme.bg}`}>
                    <label className="block text-sm font-bold mb-2 text-yellow-600">修改密码 (不改请留空)</label>
                    <input type="password" placeholder="输入新密码..." className={`w-full p-3 rounded ${theme.input}`} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>

                <button type="submit" className={`w-full py-3 rounded-lg font-bold text-lg shadow-md ${theme.primaryBtn}`}>
                    保存修改
                </button>
            </form>
        </div>
    );
};

const TrainingModule = ({ user, theme }) => {
    const [trainings, setTrainings] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showLeaveForm, setShowLeaveForm] = useState(false);
    const [leaveData, setLeaveData] = useState({ training_id: '', duration_hours: '', reason: '' });
    const [formData, setFormData] = useState({ start_time: '', end_time: '' });
    const [planItems, setPlanItems] = useState(['']);
    const canEdit = user.role === 'captain';
    const canLeave = ['player', 'captain', 'manager'].includes(user.role);

    const fetchData = async () => { try { setTrainings((await api.get('/trainings')).data); } catch (e) { } };
    useEffect(() => { fetchData(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        const validItems = planItems.filter(item => item.trim() !== '');
        if (validItems.length === 0) return alert('请至少填写一项训练内容');
        await api.post('/trainings', { ...formData, plan_content: JSON.stringify(validItems) });
        setShowForm(false); setPlanItems(['']); setFormData({ start_time: '', end_time: '' }); fetchData();
    };

    const handleLeave = async (e) => {
        e.preventDefault();
        try {
            await api.post('/leaves', leaveData);
            alert("请假申请提交成功！");
            setShowLeaveForm(false);
            setLeaveData({ training_id: '', duration_hours: '', reason: '' });
        } catch (err) {
            alert('提交失败: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDelete = async (id) => { if (confirm('确定删除?')) { await api.delete(`/trainings/${id}`); fetchData(); } };
    const addItem = () => setPlanItems([...planItems, '']);
    const removeItem = (index) => { const n = planItems.filter((_, i) => i !== index); setPlanItems(n); };
    const parseContent = (c) => { try { return Array.isArray(JSON.parse(c)) ? JSON.parse(c) : [c]; } catch { return [c]; } };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">日常训练计划</h2>
                <div className="flex gap-2">
                    <button onClick={fetchData} className={`${theme.secondaryBtn} p-2 rounded`} title="刷新"><RotateCcw size={16} /></button>
                    {canLeave && (
                        <button onClick={() => setShowLeaveForm(!showLeaveForm)} className={`${theme.secondaryBtn} px-4 py-2 rounded flex items-center gap-2`}>
                            <FileText size={16} /> 请假申请
                        </button>
                    )}
                    {canEdit && (
                        <button onClick={() => setShowForm(!showForm)} className={`${theme.primaryBtn} px-4 py-2 rounded flex items-center gap-2`}>
                            <Plus size={16} /> 发布
                        </button>
                    )}
                </div>
            </div>

            {showLeaveForm && (
                <form onSubmit={handleLeave} className={`${theme.card} p-6 rounded mb-6 border border-yellow-400 shadow-md`}>
                    <h3 className="font-bold mb-4 text-lg border-b pb-2">填写请假条</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-xs mb-1 block text-gray-500">时长 (小时)</label>
                            <input type="number" placeholder="2.0" step="0.5" className={`w-full p-2 rounded ${theme.input}`} required
                                value={leaveData.duration_hours}
                                onChange={e => setLeaveData({ ...leaveData, duration_hours: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs mb-1 block text-gray-500">关联训练 (可选)</label>
                            <select className={`w-full p-2 rounded ${theme.input}`}
                                value={leaveData.training_id}
                                onChange={e => setLeaveData({ ...leaveData, training_id: e.target.value })}>
                                <option value="">-- 通用/其他 --</option>
                                {trainings.map(t => <option key={t.id} value={t.id}>{t.start_time} 的训练</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="text-xs mb-1 block text-gray-500">请假原因</label>
                        <textarea placeholder="例如：身体不适 / 课程冲突" className={`w-full p-2 rounded ${theme.input}`} rows="3" required
                            value={leaveData.reason}
                            onChange={e => setLeaveData({ ...leaveData, reason: e.target.value })}></textarea>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowLeaveForm(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">取消</button>
                        <button type="submit" className={`${theme.primaryBtn} px-6 py-2 rounded font-bold`}>提交申请</button>
                    </div>
                </form>
            )}

            {showForm && (
                <form onSubmit={handleCreate} className={`${theme.card} p-6 rounded mb-6 border-l-4 ${theme.accentBorder}`}>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input type="datetime-local" className={`w-full p-2 rounded ${theme.input}`} onChange={e => setFormData({ ...formData, start_time: formatDateInput(e.target.value) })} required />
                        <input type="datetime-local" className={`w-full p-2 rounded ${theme.input}`} onChange={e => setFormData({ ...formData, end_time: formatDateInput(e.target.value) })} required />
                    </div>
                    <div className="space-y-2 mb-4">
                        {planItems.map((item, index) => (
                            <div key={index} className="flex gap-2">
                                <input type="text" placeholder={`项目 ${index + 1}`} className={`flex-1 p-2 rounded ${theme.input}`} value={item} onChange={(e) => { const n = [...planItems]; n[index] = e.target.value; setPlanItems(n) }} />
                                <button type="button" onClick={() => removeItem(index)}><Trash2 size={18} className="text-red-500" /></button>
                            </div>
                        ))}
                        <button type="button" onClick={addItem} className={`text-sm flex items-center gap-1 ${theme.accentText}`}><Plus size={14} /> 添加</button>
                    </div>
                    <button type="submit" className={`${theme.primaryBtn} px-6 py-2 rounded`}>发布</button>
                </form>
            )}

            <div className="grid gap-4">
                {trainings.map(t => (
                    <div key={t.id} className={`${theme.card} p-5 rounded border-l-4 ${theme.accentBorder} relative`}>
                        <div className="flex justify-between mb-2">
                            <h3 className={`font-bold text-xl ${theme.accentText}`}>{t.start_time}</h3>
                            {canEdit && <button onClick={() => handleDelete(t.id)} className="text-red-400"><Trash2 size={18} /></button>}
                        </div>
                        <div className="space-y-1">
                            {parseContent(t.plan_content).map((item, idx) => <p key={idx} className={theme.text}>• {item}</p>)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StatsDashboard = ({ theme, isDark }) => {
    const [stats, setStats] = useState(null);
    useEffect(() => { api.get('/dashboard/stats').then(res => setStats(res.data)).catch(() => { }); }, []);
    if (!stats) return <div className="p-8">加载数据中...</div>;
    const attendanceData = [{ name: '出勤', value: stats.attendance.rate }, { name: '缺勤', value: 100 - stats.attendance.rate }];
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">球队数据中心</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className={`${theme.card} p-6 rounded shadow-lg`}>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Calendar size={20} className={theme.accentText} /> 赛季出勤率</h3>
                    <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={attendanceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"><Cell fill={isDark ? '#f97316' : '#2563eb'} /><Cell fill={isDark ? '#374151' : '#e2e8f0'} /></Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
                    <div className="text-center mt-2"><span className="text-4xl font-bold">{stats.attendance.rate}%</span><p className={theme.textMuted}>总体出勤率</p></div>
                </div>
                <div className={`${theme.card} p-6 rounded shadow-lg`}>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Trophy size={20} className="text-yellow-500" /> 卷王排行榜</h3>
                    <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.leaderboard} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={80} /><Tooltip /><Bar dataKey="count" fill={isDark ? '#f97316' : '#2563eb'} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
                </div>
            </div>
            <div className={`${theme.card} p-6 rounded shadow-lg`}>
                <h3 className="text-xl font-bold mb-4">比赛走势</h3>
                <div className="h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={stats.match_trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="our_score" stroke="#10b981" strokeWidth={3} /><Line type="monotone" dataKey="opponent_score" stroke="#ef4444" strokeWidth={3} /></LineChart></ResponsiveContainer></div>
            </div>
        </div>
    );
};

const MatchModule = ({ user, theme }) => {
    const [matches, setMatches] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({});
    const canEdit = user.role === 'captain';

    const fetchMatches = async () => { try { setMatches((await api.get('/matches')).data); } catch (e) { } };
    useEffect(() => { fetchMatches(); }, []);

    const handleCreate = async (e) => { e.preventDefault(); await api.post('/matches', formData); setShowForm(false); fetchMatches(); };
    const handleDelete = async (id) => { if (confirm('确定删除?')) { await api.delete(`/matches/${id}`); fetchMatches(); } };
    const handleSignup = async (id) => { try { await api.post(`/matches/${id}/signup`); alert('报名成功'); fetchMatches(); } catch (e) { alert(e.response.data.message); } };
    const handleUpdateScore = async (id, our, opp, finished) => { await api.put(`/matches/${id}`, { our_score: our, opponent_score: opp, is_finished: finished }); fetchMatches(); };

    return (
        <div>
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold">比赛事宜</h2>
                <div className="flex gap-2">
                    <button onClick={fetchMatches} className={`${theme.secondaryBtn} p-2 rounded`} title="刷新"><RotateCcw size={16} /></button>
                    {canEdit && <button onClick={() => setShowForm(!showForm)} className={`${theme.primaryBtn} px-4 py-2 rounded flex items-center gap-2`}><Plus size={16} /> 发布</button>}
                </div>
            </div>
            {showForm && (
                <form onSubmit={handleCreate} className={`${theme.card} p-6 rounded mb-6`}>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <input type="datetime-local" className={`p-2 rounded ${theme.input}`} onChange={e => setFormData({ ...formData, match_time: formatDateInput(e.target.value) })} required />
                        <input type="text" placeholder="对手" className={`p-2 rounded ${theme.input}`} onChange={e => setFormData({ ...formData, opponent: e.target.value })} required />
                        <input type="text" placeholder="地点" className={`p-2 rounded ${theme.input}`} onChange={e => setFormData({ ...formData, location: e.target.value })} required />
                    </div>
                    <button type="submit" className={`${theme.primaryBtn} px-6 py-2 rounded`}>发布</button>
                </form>
            )}
            <div className="grid gap-4">{matches.map(m => (
                <div key={m.id} className={`${theme.card} p-6 rounded shadow-lg relative overflow-hidden`}>
                    <div className={`absolute top-0 right-0 p-2 px-4 rounded-bl-lg text-sm font-bold ${theme.bg} ${theme.textMuted}`}>{m.location}</div>
                    {canEdit && <button onClick={() => handleDelete(m.id)} className="absolute bottom-4 right-4 text-red-400"><Trash2 size={20} /></button>}
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2"><Clock size={20} className={theme.accentText} /> {m.match_time}</h3>
                    <div className="bg-black/10 p-4 rounded-lg my-4 flex items-center justify-between">
                        <div className="text-center"><span className="block text-xs text-gray-500">我方</span>{canEdit ? <input type="number" className="w-16 text-center text-2xl font-bold bg-transparent border-b border-gray-400" defaultValue={m.our_score} onBlur={(e) => handleUpdateScore(m.id, e.target.value, m.opponent_score, m.is_finished)} /> : <span className="text-3xl font-bold text-green-600">{m.our_score}</span>}</div>
                        <span className="text-2xl font-bold text-gray-400">VS</span>
                        <div className="text-center"><span className="block text-xs text-gray-500">{m.opponent}</span>{canEdit ? <input type="number" className="w-16 text-center text-2xl font-bold bg-transparent border-b border-gray-400" defaultValue={m.opponent_score} onBlur={(e) => handleUpdateScore(m.id, m.our_score, e.target.value, m.is_finished)} /> : <span className="text-3xl font-bold text-red-500">{m.opponent_score}</span>}</div>
                    </div>
                    {canEdit && <label className="flex items-center gap-2 cursor-pointer mb-2"><input type="checkbox" checked={m.is_finished} onChange={(e) => handleUpdateScore(m.id, m.our_score, m.opponent_score, e.target.checked)} /><span className="text-sm">标记为已结束</span></label>}
                    <div className="mt-4"><div className="flex flex-wrap gap-2 mb-4">{m.participants.map((p, idx) => <span key={idx} className={`${theme.bg} px-2 py-1 rounded text-sm border ${theme.divider}`}>{p}</span>)}</div>
                        {!m.is_signed_up && (user.role === 'player' || user.role === 'captain') && <button onClick={() => handleSignup(m.id)} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold shadow-md">报名</button>}
                        {m.is_signed_up && <span className={`font-bold flex items-center gap-1 ${theme.successText}`}><CheckCircle size={18} /> 已报名</span>}
                    </div>
                </div>))}
            </div>
        </div>
    );
};

// --- Venue Module (OBS Version) ---
const VenueModule = ({ user, theme }) => {
    const [venues, setVenues] = useState([]);
    const [formData, setFormData] = useState({});
    const [isUploading, setIsUploading] = useState(false);

    const fetchVenues = async () => { try { setVenues((await api.get('/venues')).data); } catch { } };
    useEffect(() => { fetchVenues(); }, []);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', file);
        try {
            const res = await api.post('/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, proof_photo_url: res.data.url }));
        } catch (err) {
            alert('凭证上传失败');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        await api.post('/venues', formData);
        setFormData({});
        fetchVenues();
        alert('预约提交成功');
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">场地预约记录</h2>
            {['captain', 'manager'].includes(user.role) && (
                <form onSubmit={handleCreate} className={`${theme.card} p-4 rounded mb-6 flex flex-col md:flex-row gap-4 items-end`}>
                    <div className="flex-1 w-full"><label className="text-xs">开始</label><input type="datetime-local" className={`w-full p-2 rounded ${theme.input}`} onChange={e => setFormData({ ...formData, start_time: formatDateInput(e.target.value) })} required /></div>
                    <div className="flex-1 w-full"><label className="text-xs">结束</label><input type="datetime-local" className={`w-full p-2 rounded ${theme.input}`} onChange={e => setFormData({ ...formData, end_time: formatDateInput(e.target.value) })} required /></div>

                    <div className="flex-1 w-full">
                        <label className="text-xs block mb-1">预约凭证 (图片)</label>
                        <div className="relative">
                            <input type="file" className={`w-full text-sm ${theme.textMuted}`} onChange={handleFileUpload} accept="image/*" />
                            {isUploading && <span className="absolute right-0 top-0 text-xs text-yellow-500">上传中...</span>}
                            {formData.proof_photo_url && !isUploading && <span className="absolute right-0 top-0 text-xs text-green-500">✅ 已就绪</span>}
                        </div>
                    </div>

                    <button type="submit" disabled={isUploading} className={`${theme.primaryBtn} px-4 py-2 rounded`}>提交</button>
                </form>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{venues.map(v => (<div key={v.id} className={`${theme.card} p-4 rounded flex gap-4 items-center`}>
                {v.proof_photo_url ? <img src={v.proof_photo_url} className="w-24 h-24 object-cover rounded bg-gray-200" /> : <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-xs">无图</div>}
                <div><p className="font-bold">{v.start_time}</p><p className={theme.textMuted}>至 {v.end_time.split(' ')[1]}</p></div>
            </div>))}</div>
        </div>
    );
};

// --- Photo Module (OBS Version) ---
const PhotoModule = ({ user, theme }) => {
    const [photos, setPhotos] = useState([]);
    const [description, setDescription] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const fetchPhotos = async () => { try { setPhotos((await api.get('/photos')).data); } catch { } };
    useEffect(() => { fetchPhotos(); }, []);

    const handleUpload = async (e) => {
        e.preventDefault();
        const fileInput = e.target.elements.fileInput;
        const file = fileInput.files[0];
        if (!file) return alert("请选择图片");

        setIsUploading(true);
        try {
            // 1. 上传到 OBS
            const uploadData = new FormData();
            uploadData.append('file', file);
            const uploadRes = await api.post('/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // 2. 提交到照片墙
            await api.post('/photos', {
                url: uploadRes.data.url,
                description: description || 'Team moment'
            });

            setDescription('');
            fileInput.value = '';
            fetchPhotos();
        } catch (err) {
            alert('上传失败');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('确定要删除这张照片吗？')) {
            try { await api.delete(`/photos/${id}`); fetchPhotos(); } catch (e) { alert('删除失败'); }
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">风采展示墙</h2>
            {user.role === 'captain' && (
                <form onSubmit={handleUpload} className="mb-8 flex flex-col md:flex-row gap-2 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-xs mb-1 block">选择照片</label>
                        <input name="fileInput" type="file" className={`w-full p-2 rounded ${theme.input} text-sm`} accept="image/*" required />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-xs mb-1 block">描述</label>
                        <input type="text" placeholder="描述一下..." className={`w-full p-2 rounded ${theme.input}`} value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    <button type="submit" disabled={isUploading} className={`${theme.primaryBtn} px-6 py-2 rounded font-bold`}>
                        {isUploading ? '上传中...' : '上传'}
                    </button>
                </form>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map(p => (
                    <div key={p.id} className={`aspect-[4/3] ${theme.card} rounded overflow-hidden relative group`}>
                        <img src={p.url} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 w-full bg-black/50 text-white text-xs p-1 truncate">{p.description}</div>
                        {user.role === 'captain' && (
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-700">
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Personal Module (OBS Version) ---
const PersonalModule = ({ user, theme }) => {
    const [logs, setLogs] = useState([]);
    const [formData, setFormData] = useState({ item_name: '', photo_url: '' });
    const [isUploading, setIsUploading] = useState(false);

    const fetchLogs = async () => { try { setLogs((await api.get('/personal_trainings')).data); } catch { } };
    useEffect(() => { fetchLogs(); }, []);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', file);
        try {
            const res = await api.post('/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, photo_url: res.data.url }));
        } catch (err) { alert('图片上传失败'); } finally { setIsUploading(false); }
    };

    const handleLog = async (e) => {
        e.preventDefault();
        await api.post('/personal_trainings', formData);
        setFormData({ item_name: '', photo_url: '' });
        fetchLogs();
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">个人加练打卡</h2>
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-1/3">
                    <form onSubmit={handleLog} className={`${theme.card} p-6 rounded shadow-lg sticky top-8 border-t-4 ${theme.accentBorder}`}>
                        <h3 className="text-xl font-bold mb-4">打卡</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="训练项目 (如: 三分球100个)" className={`w-full p-2 rounded ${theme.input}`} value={formData.item_name} onChange={e => setFormData({ ...formData, item_name: e.target.value })} required />

                            <div>
                                <label className="text-xs mb-1 block text-gray-500">打卡照片 (可选)</label>
                                <div className="flex items-center gap-2">
                                    <input type="file" className="text-sm w-full" onChange={handleFileUpload} accept="image/*" />
                                    {isUploading && <span className="text-xs text-yellow-500 shrink-0">上传中...</span>}
                                    {formData.photo_url && !isUploading && <CheckCircle size={16} className="text-green-500 shrink-0" />}
                                </div>
                            </div>

                            <button type="submit" disabled={isUploading} className={`w-full py-2 rounded font-bold ${theme.primaryBtn}`}>提交</button>
                        </div>
                    </form>
                </div>
                <div className="flex-1 space-y-4">
                    {logs.map(log => (
                        <div key={log.id} className={`${theme.card} p-4 rounded flex items-start gap-4 shadow-sm`}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl overflow-hidden shrink-0 ${theme.bg} ${theme.accentText}`}>
                                {log.user?.avatar_url ? <img src={log.user.avatar_url} className="w-full h-full object-cover" /> : (log.real_name?.[0] || 'U')}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <h4 className="font-bold">{log.real_name}</h4>
                                    <span className={`text-sm ${theme.textMuted}`}>{log.timestamp}</span>
                                </div>
                                <p className={`mt-1 font-bold ${theme.accentText}`}>{log.item_name}</p>
                                {log.photo_url && (
                                    <img src={log.photo_url} className="mt-2 h-32 rounded border border-gray-200 object-cover" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Dashboard = ({ user, onLogout, isDark, toggleTheme }) => {
    const [view, setView] = useState('stats');
    const [currentUser, setCurrentUser] = useState(user);
    const theme = useThemeClasses(isDark);

    const handleUserUpdate = (updatedData) => {
        setCurrentUser(updatedData);
    };

    const navItems = [
        { id: 'stats', label: '数据仪表盘', icon: <BarChart3 /> },
        { id: 'tactics', label: '战术画板', icon: <PenTool /> },
        { id: 'training', label: '日常训练', icon: <ClipboardList /> },
        { id: 'match', label: '比赛事宜', icon: <Trophy /> },
        { id: 'venue', label: '场地预约', icon: <MapPin /> },
        { id: 'photo', label: '风采展示', icon: <Camera /> },
        { id: 'personal', label: '个人打卡', icon: <CheckCircle /> },
        { id: 'personnel', label: '人员名单', icon: <Users /> },
        { id: 'profile', label: '个人设置', icon: <Settings /> },
    ];

    return (
        <div className={`min-h-screen ${theme.bg} ${theme.text} flex transition-colors duration-300`}>
            {/* Sidebar */}
            <div className={`w-64 ${theme.sidebar} p-4 flex flex-col transition-colors duration-300`}>
                <h1 className={`text-2xl font-bold mb-8 flex items-center gap-2 ${theme.accentText}`}><Trophy /> 球队管家</h1>
                <div className="flex-1 space-y-2 overflow-y-auto">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => setView(item.id)} className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${view === item.id ? theme.sidebarActive : `hover:bg-opacity-10 hover:bg-gray-500 ${theme.textMuted}`}`}>{item.icon} {item.label}</button>
                    ))}
                </div>
                <div className={`mt-auto ${theme.divider} border-t pt-4`}>
                    <div className="flex items-center justify-between mb-4"><span className="text-xs font-bold uppercase text-gray-400">切换主题</span><button onClick={toggleTheme} className={`p-2 rounded-full ${isDark ? 'bg-gray-700 text-yellow-300' : 'bg-blue-100 text-blue-600'}`}>{isDark ? <Moon size={16} /> : <Sun size={16} />}</button></div>

                    <div className="flex items-center gap-2 mb-2 px-2">
                        {currentUser.avatar_url ? (
                            <img src={currentUser.avatar_url} className="w-10 h-10 rounded-full object-cover border border-gray-400" />
                        ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isDark ? 'bg-gray-700' : 'bg-blue-100 text-blue-600'}`}>
                                <User size={20} />
                            </div>
                        )}
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate">{currentUser.real_name || currentUser.username}</p>
                            <p className={`text-xs uppercase ${theme.textMuted}`}>{currentUser.role}</p>
                        </div>
                    </div>

                    <button onClick={onLogout} className="w-full flex items-center gap-2 p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><LogOut size={16} /> 退出登录</button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto relative">
                <div className={view === 'stats' ? 'block' : 'hidden'}><StatsDashboard theme={theme} isDark={isDark} /></div>
                <div className={view === 'tactics' ? 'block' : 'hidden'}><TacticalBoard user={currentUser} theme={theme} isVisible={view === 'tactics'} /></div>
                <div className={view === 'training' ? 'block' : 'hidden'}><TrainingModule user={currentUser} theme={theme} /></div>
                <div className={view === 'match' ? 'block' : 'hidden'}><MatchModule user={currentUser} theme={theme} /></div>
                <div className={view === 'venue' ? 'block' : 'hidden'}><VenueModule user={currentUser} theme={theme} /></div>
                <div className={view === 'photo' ? 'block' : 'hidden'}><PhotoModule user={currentUser} theme={theme} /></div>
                <div className={view === 'personal' ? 'block' : 'hidden'}><PersonalModule user={currentUser} theme={theme} /></div>
                <div className={view === 'personnel' ? 'block' : 'hidden'}><PersonnelModule user={currentUser} theme={theme} /></div>
                <div className={view === 'profile' ? 'block' : 'hidden'}><ProfileSettings user={currentUser} theme={theme} onUpdateUser={handleUserUpdate} /></div>
            </div>
        </div>
    );
};

const App = () => {
    const [user, setUser] = useState(null);
    const [isDark, setIsDark] = useState(true);
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) setIsDark(storedTheme === 'dark');
    }, []);
    const toggleTheme = () => { setIsDark(!isDark); localStorage.setItem('theme', !isDark ? 'dark' : 'light'); };
    const handleLogin = (userData) => { setUser(userData); };
    const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); };

    return <div className={isDark ? 'dark' : ''}>{!user ? <Login onLogin={handleLogin} isDark={isDark} toggleTheme={toggleTheme} /> : <Dashboard user={user} onLogout={handleLogout} isDark={isDark} toggleTheme={toggleTheme} />}</div>;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

export default App;