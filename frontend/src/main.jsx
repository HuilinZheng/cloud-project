import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import {
    Users, Calendar, ClipboardList, Camera, Trophy, MapPin,
    LogOut, Plus, CheckCircle, Clock, User, Moon, Sun, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';

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
        primaryBtn: isDark
            ? 'bg-orange-600 hover:bg-orange-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white',
        secondaryBtn: isDark
            ? 'bg-gray-600 hover:bg-gray-500 text-white'
            : 'bg-slate-200 hover:bg-slate-300 text-slate-800',
        accentText: isDark ? 'text-orange-400' : 'text-blue-600',
        accentBorder: isDark ? 'border-orange-500' : 'border-yellow-400',
        sidebar: isDark ? 'bg-gray-800' : 'bg-white border-r border-slate-200',
        sidebarActive: isDark ? 'bg-orange-600 text-white' : 'bg-blue-100 text-blue-700',
        successText: isDark ? 'text-green-400' : 'text-green-600',
        divider: isDark ? 'border-gray-700' : 'border-slate-200',
    };
};

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
                    <input
                        type="text" placeholder="用户名" className={`w-full p-2 rounded outline-none ${theme.input}`}
                        value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required
                    />
                    <input
                        type="password" placeholder="密码" className={`w-full p-2 rounded outline-none ${theme.input}`}
                        value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required
                    />
                    {isRegister && (
                        <>
                            <select
                                className={`w-full p-2 rounded outline-none ${theme.input}`}
                                value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="player">队员 (Player)</option>
                                <option value="captain">队长 (Captain)</option>
                                <option value="coach">教练 (Coach)</option>
                                <option value="manager">经理 (Manager)</option>
                            </select>
                            <input
                                type="text" placeholder="真实姓名" className={`w-full p-2 rounded outline-none ${theme.input}`}
                                value={formData.real_name} onChange={e => setFormData({ ...formData, real_name: e.target.value })} required
                            />
                            <input
                                type="text" placeholder="学号" className={`w-full p-2 rounded outline-none ${theme.input}`}
                                value={formData.student_id} onChange={e => setFormData({ ...formData, student_id: e.target.value })} required
                            />
                        </>
                    )}
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button type="submit" className={`w-full p-2 rounded font-bold transition-colors ${theme.primaryBtn}`}>
                        {isRegister ? '注册' : '登录'}
                    </button>
                </form>
                <p className={`mt-4 text-center text-sm cursor-pointer hover:underline ${theme.textMuted}`} onClick={() => setIsRegister(!isRegister)}>
                    {isRegister ? '已有账号？去登录' : '新队员？点此注册'}
                </p>
            </div>
        </div>
    );
};

const Dashboard = ({ user, onLogout, isDark, toggleTheme }) => {
    const [view, setView] = useState('training'); // training, match, venue, photo, personal
    const theme = useThemeClasses(isDark);

    const navItems = [
        { id: 'training', label: '日常训练', icon: <ClipboardList /> },
        { id: 'match', label: '比赛事宜', icon: <Trophy /> },
        { id: 'venue', label: '场地预约', icon: <MapPin /> },
        { id: 'photo', label: '风采展示', icon: <Camera /> },
        { id: 'personal', label: '个人打卡', icon: <CheckCircle /> },
    ];

    return (
        <div className={`min-h-screen ${theme.bg} ${theme.text} flex transition-colors duration-300`}>
            {/* Sidebar */}
            <div className={`w-64 ${theme.sidebar} p-4 flex flex-col transition-colors duration-300`}>
                <h1 className={`text-2xl font-bold mb-8 flex items-center gap-2 ${theme.accentText}`}>
                    <Trophy /> 球队管家
                </h1>
                <div className="flex-1 space-y-2">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${view === item.id ? theme.sidebarActive : `hover:bg-opacity-10 hover:bg-gray-500 ${theme.textMuted}`
                                }`}
                        >
                            {item.icon} {item.label}
                        </button>
                    ))}
                </div>
                <div className={`mt-auto ${theme.divider} border-t pt-4`}>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase text-gray-400">切换主题</span>
                        <button onClick={toggleTheme} className={`p-2 rounded-full ${isDark ? 'bg-gray-700 text-yellow-300' : 'bg-blue-100 text-blue-600'}`}>
                            {isDark ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-blue-100 text-blue-600'}`}>
                            <User size={16} />
                        </div>
                        <div>
                            <p className="text-sm font-bold">{user.real_name || user.username}</p>
                            <p className={`text-xs uppercase ${theme.textMuted}`}>{user.role}</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full flex items-center gap-2 p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                        <LogOut size={16} /> 退出登录
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                {view === 'training' && <TrainingModule user={user} theme={theme} />}
                {view === 'match' && <MatchModule user={user} theme={theme} />}
                {view === 'venue' && <VenueModule user={user} theme={theme} />}
                {view === 'photo' && <PhotoModule user={user} theme={theme} />}
                {view === 'personal' && <PersonalModule user={user} theme={theme} />}
            </div>
        </div>
    );
};

// --- Helper: 日期格式化 (截取前16位，去掉秒) ---
const formatDateInput = (value) => {
    // value 可能是 2023-10-25T14:30:00，截取为 2023-10-25T14:30，再换空格
    return value.slice(0, 16).replace('T', ' ');
};

// --- Module Components ---

const TrainingModule = ({ user, theme }) => {
    const [trainings, setTrainings] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showLeaveForm, setShowLeaveForm] = useState(false);

    // 训练内容现在是一个数组，用于多项输入
    const [planItems, setPlanItems] = useState(['']);
    const [formData, setFormData] = useState({ start_time: '', end_time: '' });

    const [leaveData, setLeaveData] = useState({ training_id: '', duration_hours: '', reason: '' });
    const [expandedId, setExpandedId] = useState(null);

    const canEdit = user.role === 'captain';
    const canLeave = ['player', 'captain', 'manager'].includes(user.role);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [tRes, lRes] = await Promise.all([api.get('/trainings'), api.get('/leaves')]);
            setTrainings(tRes.data);
            setLeaves(lRes.data);
        } catch (e) {
            console.error("Fetch error", e);
        }
    };

    const handleItemChange = (index, value) => {
        const newItems = [...planItems];
        newItems[index] = value;
        setPlanItems(newItems);
    };
    const addItem = () => setPlanItems([...planItems, '']);
    const removeItem = (index) => {
        const newItems = planItems.filter((_, i) => i !== index);
        setPlanItems(newItems.length ? newItems : ['']);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        const validItems = planItems.filter(item => item.trim() !== '');
        if (validItems.length === 0) return alert('请至少填写一项训练内容');
        if (!formData.start_time || !formData.end_time) return alert('请选择开始和结束时间');

        try {
            await api.post('/trainings', {
                ...formData,
                plan_content: JSON.stringify(validItems)
            });
            setShowForm(false);
            setPlanItems(['']);
            setFormData({ start_time: '', end_time: '' });
            fetchData();
        } catch (err) {
            alert('发布失败: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('确定要删除这条训练计划吗？相关的请假记录也会被删除。')) return;
        try {
            await api.delete(`/trainings/${id}`);
            fetchData();
        } catch (err) {
            alert('删除失败: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleLeave = async (e) => {
        e.preventDefault();
        try {
            await api.post('/leaves', leaveData);
            setShowLeaveForm(false);
            fetchData();
        } catch (err) {
            alert('请假提交失败: ' + (err.response?.data?.message || err.message));
        }
    };

    const parseContent = (content) => {
        try {
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) ? parsed : [content];
        } catch (e) {
            return [content];
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">日常训练计划</h2>
                <div className="flex gap-2">
                    {canEdit && <button onClick={() => setShowForm(!showForm)} className={`${theme.primaryBtn} px-4 py-2 rounded flex items-center gap-2 shadow-sm`}><Plus size={16} /> 发布新计划</button>}
                    {canLeave && <button onClick={() => setShowLeaveForm(!showLeaveForm)} className={`${theme.secondaryBtn} px-4 py-2 rounded flex items-center gap-2 shadow-sm`}>请假申请</button>}
                </div>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className={`${theme.card} p-6 rounded mb-6 border-l-4 ${theme.accentBorder}`}>
                    <h3 className="font-bold mb-4 text-lg">新建训练计划</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className={`block text-sm mb-1 ${theme.textMuted}`}>开始时间</label>
                            <input type="datetime-local" className={`w-full p-2 rounded ${theme.input}`} required onChange={e => setFormData({ ...formData, start_time: formatDateInput(e.target.value) })} />
                        </div>
                        <div>
                            <label className={`block text-sm mb-1 ${theme.textMuted}`}>结束时间</label>
                            <input type="datetime-local" className={`w-full p-2 rounded ${theme.input}`} required onChange={e => setFormData({ ...formData, end_time: formatDateInput(e.target.value) })} />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className={`block text-sm mb-2 ${theme.textMuted}`}>训练项目列表</label>
                        <div className="space-y-2">
                            {planItems.map((item, index) => (
                                <div key={index} className="flex gap-2">
                                    <span className="py-2 text-gray-500 w-6 text-center">{index + 1}.</span>
                                    <input
                                        type="text"
                                        placeholder={`输入第 ${index + 1} 项训练内容`}
                                        className={`flex-1 p-2 rounded ${theme.input}`}
                                        value={item}
                                        onChange={(e) => handleItemChange(index, e.target.value)}
                                    />
                                    {planItems.length > 1 && (
                                        <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 px-2">
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addItem} className={`mt-2 text-sm flex items-center gap-1 ${theme.accentText} hover:underline`}>
                            <Plus size={14} /> 添加一项
                        </button>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">取消</button>
                        <button type="submit" className={`${theme.primaryBtn} px-6 py-2 rounded`}>发布</button>
                    </div>
                </form>
            )}

            {showLeaveForm && (
                <form onSubmit={handleLeave} className={`${theme.card} p-6 rounded mb-6 border border-gray-300`}>
                    <h3 className="font-bold mb-4">提交请假申请</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input type="number" placeholder="请假时长 (小时)" step="0.5" className={`p-2 rounded ${theme.input}`} required onChange={e => setLeaveData({ ...leaveData, duration_hours: e.target.value })} />
                        <select className={`p-2 rounded ${theme.input}`} onChange={e => setLeaveData({ ...leaveData, training_id: e.target.value })}>
                            <option value="">通用/其他 (非特定场次)</option>
                            {trainings.map(t => <option key={t.id} value={t.id}>{t.start_time} 的训练</option>)}
                        </select>
                    </div>
                    <textarea placeholder="请假原因" className={`w-full p-2 rounded mb-4 ${theme.input}`} rows="2" required onChange={e => setLeaveData({ ...leaveData, reason: e.target.value })}></textarea>
                    <button type="submit" className={`${theme.secondaryBtn} px-6 py-2 rounded`}>提交申请</button>
                </form>
            )}

            <div className="grid gap-4">
                {trainings.map(t => {
                    const items = parseContent(t.plan_content);
                    const isExpanded = expandedId === t.id;
                    const displayItems = isExpanded ? items : items.slice(0, 2);
                    const hasMore = items.length > 2;

                    return (
                        <div
                            key={t.id}
                            className={`${theme.card} p-5 rounded shadow-sm border-l-4 ${theme.accentBorder} cursor-pointer transition-all hover:shadow-md relative`}
                            onClick={() => setExpandedId(isExpanded ? null : t.id)}
                        >
                            <div className="flex justify-between items-start mb-2 pr-8">
                                <h3 className={`font-bold text-xl ${theme.accentText}`}>
                                    {t.start_time} <span className="text-sm text-gray-400 mx-2">至</span> {t.end_time.split(' ')[1]}
                                </h3>
                                <span className={`text-xs px-2 py-1 rounded-full ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </span>
                            </div>

                            {/* Delete Button for Captain */}
                            {canEdit && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                                    className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                    title="删除"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}

                            <div className={`pl-4 border-l-2 ${theme.divider} space-y-1`}>
                                {displayItems.map((item, idx) => (
                                    <p key={idx} className={theme.text}>• {item}</p>
                                ))}
                                {!isExpanded && hasMore && <p className={theme.textMuted}>... (点击查看剩余 {items.length - 2} 项)</p>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <h3 className="text-xl font-bold mt-8 mb-4">请假记录</h3>
            <div className="grid gap-2">
                {leaves.length === 0 && <p className={theme.textMuted}>暂无请假记录。</p>}
                {leaves.map(l => (
                    <div key={l.id} className={`${theme.card} p-3 rounded flex justify-between items-center shadow-sm`}>
                        <span><span className={`${theme.accentText} font-bold`}>{l.real_name}</span>: {l.reason} ({l.duration_hours}小时)</span>
                        <span className={`text-sm px-2 py-1 rounded ${l.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                            {l.status === 'pending' ? '待审核' : l.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MatchModule = ({ user, theme }) => {
    const [matches, setMatches] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ match_time: '', opponent: '', location: '' });
    const canEdit = user.role === 'captain';

    useEffect(() => { fetchMatches(); }, []);
    const fetchMatches = async () => {
        const res = await api.get('/matches');
        setMatches(res.data);
    };
    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/matches', formData);
            setShowForm(false);
            fetchMatches();
        } catch (err) {
            alert('发布失败: ' + (err.response?.data?.message || err.message));
        }
    };
    const handleDelete = async (id) => {
        if (!confirm('确定要删除这场比赛吗？相关的报名和请假记录也会被删除。')) return;
        try {
            await api.delete(`/matches/${id}`);
            fetchMatches();
        } catch (err) {
            alert('删除失败: ' + (err.response?.data?.message || err.message));
        }
    };
    const handleSignup = async (id) => {
        try {
            await api.post(`/matches/${id}/signup`);
            alert('报名成功！');
            fetchMatches();
        } catch (e) { alert(e.response.data.message); }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">比赛事宜</h2>
                {canEdit && <button onClick={() => setShowForm(!showForm)} className={`${theme.primaryBtn} px-4 py-2 rounded flex items-center gap-2`}><Plus size={16} /> 发布比赛</button>}
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className={`${theme.card} p-6 rounded mb-6 border-l-4 ${theme.accentBorder}`}>
                    <h3 className="font-bold mb-4">发布新比赛</h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <input type="datetime-local" className={`p-2 rounded ${theme.input}`} required onChange={e => setFormData({ ...formData, match_time: formatDateInput(e.target.value) })} />
                        <input type="text" placeholder="对手名称" className={`p-2 rounded ${theme.input}`} required onChange={e => setFormData({ ...formData, opponent: e.target.value })} />
                        <input type="text" placeholder="比赛地点" className={`p-2 rounded ${theme.input}`} required onChange={e => setFormData({ ...formData, location: e.target.value })} />
                    </div>
                    <button type="submit" className={`${theme.primaryBtn} px-6 py-2 rounded`}>确认发布</button>
                </form>
            )}

            <div className="grid gap-4">
                {matches.map(m => (
                    <div key={m.id} className={`${theme.card} p-6 rounded shadow-lg relative overflow-hidden group hover:scale-[1.01] transition-transform`}>
                        <div className={`absolute top-0 right-0 p-2 px-4 rounded-bl-lg text-sm font-bold ${theme.bg} ${theme.textMuted}`}>
                            {m.location}
                        </div>

                        {/* Delete Button for Captain */}
                        {canEdit && (
                            <button
                                onClick={() => handleDelete(m.id)}
                                className="absolute bottom-4 right-4 z-10 text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                title="删除比赛"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}

                        <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                            <Clock size={20} className={theme.accentText} /> {m.match_time} <span className="text-gray-400">vs</span> {m.opponent}
                        </h3>
                        <div className="mt-4">
                            <h4 className={`text-sm mb-2 ${theme.textMuted}`}>已报名名单 ({m.participants.length}):</h4>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {m.participants.length === 0 && <span className="text-sm text-gray-400">暂无报名</span>}
                                {m.participants.map((p, idx) => (
                                    <span key={idx} className={`${theme.bg} px-2 py-1 rounded text-sm border ${theme.divider}`}>{p}</span>
                                ))}
                            </div>

                            {!m.is_signed_up && (user.role === 'player' || user.role === 'captain') && (
                                <button onClick={() => handleSignup(m.id)} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold shadow-md">
                                    立即报名
                                </button>
                            )}
                            {m.is_signed_up && <span className={`font-bold flex items-center gap-1 ${theme.successText}`}><CheckCircle size={18} /> 已报名</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const VenueModule = ({ user, theme }) => {
    const [venues, setVenues] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ start_time: '', end_time: '', proof_photo_url: '' });
    const canEdit = ['captain', 'manager'].includes(user.role);

    useEffect(() => { fetchVenues(); }, []);
    const fetchVenues = async () => {
        const res = await api.get('/venues');
        setVenues(res.data);
    };
    const handleCreate = async (e) => {
        e.preventDefault();
        await api.post('/venues', formData);
        setShowForm(false);
        fetchVenues();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">场地预约记录</h2>
                {canEdit && <button onClick={() => setShowForm(!showForm)} className={`${theme.primaryBtn} px-4 py-2 rounded flex items-center gap-2`}><Plus size={16} /> 新增预约</button>}
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className={`${theme.card} p-4 rounded mb-6 border-l-4 ${theme.accentBorder}`}>
                    <h3 className="font-bold mb-4">录入场地预约</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input type="datetime-local" className={`p-2 rounded ${theme.input}`} required onChange={e => setFormData({ ...formData, start_time: formatDateInput(e.target.value) })} />
                        <input type="datetime-local" className={`p-2 rounded ${theme.input}`} required onChange={e => setFormData({ ...formData, end_time: formatDateInput(e.target.value) })} />
                    </div>
                    <input type="text" placeholder="预约凭证图片链接 (URL)" className={`w-full p-2 rounded mb-4 ${theme.input}`} onChange={e => setFormData({ ...formData, proof_photo_url: e.target.value })} />
                    <button type="submit" className={`${theme.primaryBtn} px-6 py-2 rounded`}>提交</button>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {venues.map(v => (
                    <div key={v.id} className={`${theme.card} p-4 rounded flex gap-4 items-center`}>
                        {v.proof_photo_url ? (
                            <img src={v.proof_photo_url} alt="Proof" className="w-24 h-24 object-cover rounded bg-gray-200" />
                        ) : <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs">暂无图片</div>}
                        <div>
                            <p className="font-bold text-lg">{v.start_time}</p>
                            <p className={theme.textMuted}>至 {v.end_time.split(' ')[1]}</p>
                            <span className={`text-sm mt-2 block ${theme.successText}`}>已预约成功</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PhotoModule = ({ user, theme }) => {
    const [photos, setPhotos] = useState([]);
    const [url, setUrl] = useState('');
    const canEdit = user.role === 'captain';

    useEffect(() => {
        api.get('/photos').then(res => setPhotos(res.data));
    }, []);

    const handleUpload = async (e) => {
        e.preventDefault();
        await api.post('/photos', { url, description: 'Team moment' });
        setUrl('');
        api.get('/photos').then(res => setPhotos(res.data));
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">风采展示墙</h2>
            {canEdit && (
                <form onSubmit={handleUpload} className="mb-8 flex gap-2">
                    <input type="text" placeholder="输入照片 URL..." className={`flex-1 p-2 rounded ${theme.input}`} value={url} onChange={e => setUrl(e.target.value)} required />
                    <button type="submit" className={`${theme.primaryBtn} px-4 rounded`}>上传照片</button>
                </form>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map(p => (
                    <div key={p.id} className={`relative group aspect-square ${theme.card} rounded overflow-hidden`}>
                        <img src={p.url} alt="Team" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    </div>
                ))}
            </div>
        </div>
    );
};

const PersonalModule = ({ user, theme }) => {
    const [logs, setLogs] = useState([]);
    const [formData, setFormData] = useState({ item_name: '', photo_url: '' });

    useEffect(() => {
        api.get('/personal_trainings').then(res => setLogs(res.data));
    }, []);

    const handleLog = async (e) => {
        e.preventDefault();
        await api.post('/personal_trainings', formData);
        setFormData({ item_name: '', photo_url: '' });
        api.get('/personal_trainings').then(res => setLogs(res.data));
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">个人加练打卡</h2>
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-1/3">
                    <form onSubmit={handleLog} className={`${theme.card} p-6 rounded shadow-lg sticky top-8 border-t-4 ${theme.accentBorder}`}>
                        <h3 className="text-xl font-bold mb-4">开始打卡</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="训练项目 (例如: 投篮100个)" className={`w-full p-2 rounded ${theme.input}`} value={formData.item_name} onChange={e => setFormData({ ...formData, item_name: e.target.value })} required />
                            <input type="text" placeholder="凭证照片 URL (选填)" className={`w-full p-2 rounded ${theme.input}`} value={formData.photo_url} onChange={e => setFormData({ ...formData, photo_url: e.target.value })} />
                            <button type="submit" className={`w-full py-2 rounded font-bold ${theme.primaryBtn}`}>立即打卡</button>
                        </div>
                    </form>
                </div>
                <div className="flex-1 space-y-4">
                    {logs.map(log => (
                        <div key={log.id} className={`${theme.card} p-4 rounded flex items-start gap-4 shadow-sm`}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${theme.bg} ${theme.accentText}`}>
                                {log.real_name?.[0] || 'U'}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <h4 className="font-bold">{log.real_name || log.username}</h4>
                                    <span className={`text-sm ${theme.textMuted}`}>{log.timestamp}</span>
                                </div>
                                <p className={`mt-1 ${theme.accentText}`}>{log.item_name}</p>
                                {log.photo_url && <img src={log.photo_url} alt="Proof" className="mt-2 h-32 rounded object-cover bg-gray-100" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Main App ---

const App = () => {
    const [user, setUser] = useState(null);
    // 默认开启夜间模式，或者从 localStorage 读取
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));

        // 读取上次的主题偏好
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            setIsDark(storedTheme === 'dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    };

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <div className={isDark ? 'dark' : ''}>
            {/* 传递主题状态和切换函数给子组件 */}
            {!user ? (
                <Login onLogin={handleLogin} isDark={isDark} toggleTheme={toggleTheme} />
            ) : (
                <Dashboard user={user} onLogout={handleLogout} isDark={isDark} toggleTheme={toggleTheme} />
            )}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

export default App;