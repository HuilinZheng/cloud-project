import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import {
    Users, Calendar, ClipboardList, Camera, Trophy, MapPin,
    LogOut, Plus, CheckCircle, Clock, User
} from 'lucide-react';

// --- Axios Config ---
const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// --- Components ---

const Login = ({ onLogin }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '', role: 'player', real_name: '', student_id: '' });
    const [error, setError] = useState('');

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
                alert('Registration successful! Please login.');
                setIsRegister(false);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Action failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96">
                <h2 className="text-2xl font-bold mb-6 text-orange-500 flex items-center gap-2">
                    <Trophy /> {isRegister ? 'Join the Team' : 'Team Login'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text" placeholder="Username" className="w-full p-2 bg-gray-700 rounded"
                        value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required
                    />
                    <input
                        type="password" placeholder="Password" className="w-full p-2 bg-gray-700 rounded"
                        value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required
                    />
                    {isRegister && (
                        <>
                            <select
                                className="w-full p-2 bg-gray-700 rounded"
                                value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="player">Player (队员)</option>
                                <option value="captain">Captain (队长)</option>
                                <option value="coach">Coach (教练)</option>
                                <option value="manager">Manager (经理)</option>
                            </select>
                            <input
                                type="text" placeholder="Real Name (姓名)" className="w-full p-2 bg-gray-700 rounded"
                                value={formData.real_name} onChange={e => setFormData({ ...formData, real_name: e.target.value })} required
                            />
                            <input
                                type="text" placeholder="Student ID (学号)" className="w-full p-2 bg-gray-700 rounded"
                                value={formData.student_id} onChange={e => setFormData({ ...formData, student_id: e.target.value })} required
                            />
                        </>
                    )}
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 p-2 rounded font-bold">
                        {isRegister ? 'Register' : 'Login'}
                    </button>
                </form>
                <p className="mt-4 text-center text-gray-400 text-sm cursor-pointer" onClick={() => setIsRegister(!isRegister)}>
                    {isRegister ? 'Already have an account? Login' : 'New recruit? Register here'}
                </p>
            </div>
        </div>
    );
};

const Dashboard = ({ user, onLogout }) => {
    const [view, setView] = useState('training'); // training, match, venue, photo, personal

    const navItems = [
        { id: 'training', label: '日常训练', icon: <ClipboardList />, roles: ['all'] },
        { id: 'match', label: '比赛事宜', icon: <Trophy />, roles: ['all'] },
        { id: 'venue', label: '场地预约', icon: <MapPin />, roles: ['all'] },
        { id: 'photo', label: '风采展示', icon: <Camera />, roles: ['all'] },
        { id: 'personal', label: '个人打卡', icon: <CheckCircle />, roles: ['all'] },
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex">
            {/* Sidebar */}
            <div className="w-64 bg-gray-800 p-4 flex flex-col">
                <h1 className="text-2xl font-bold text-orange-500 mb-8 flex items-center gap-2">
                    <Trophy /> Ball Manager
                </h1>
                <div className="flex-1 space-y-2">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${view === item.id ? 'bg-orange-600 text-white' : 'hover:bg-gray-700 text-gray-300'
                                }`}
                        >
                            {item.icon} {item.label}
                        </button>
                    ))}
                </div>
                <div className="mt-auto border-t border-gray-700 pt-4">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                            <User size={16} />
                        </div>
                        <div>
                            <p className="text-sm font-bold">{user.real_name || user.username}</p>
                            <p className="text-xs text-gray-400 uppercase">{user.role}</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full flex items-center gap-2 p-2 text-red-400 hover:text-red-300">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                {view === 'training' && <TrainingModule user={user} />}
                {view === 'match' && <MatchModule user={user} />}
                {view === 'venue' && <VenueModule user={user} />}
                {view === 'photo' && <PhotoModule user={user} />}
                {view === 'personal' && <PersonalModule user={user} />}
            </div>
        </div>
    );
};

// --- Module Components ---

const TrainingModule = ({ user }) => {
    const [trainings, setTrainings] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showLeaveForm, setShowLeaveForm] = useState(false);
    const [formData, setFormData] = useState({ start_time: '', end_time: '', plan_content: '' });
    const [leaveData, setLeaveData] = useState({ training_id: '', duration_hours: '', reason: '' });

    const canEdit = user.role === 'captain';
    const canLeave = ['player', 'captain', 'manager'].includes(user.role);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const [tRes, lRes] = await Promise.all([api.get('/trainings'), api.get('/leaves')]);
        setTrainings(tRes.data);
        setLeaves(lRes.data);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        await api.post('/trainings', formData);
        setShowForm(false);
        fetchData();
    };

    const handleLeave = async (e) => {
        e.preventDefault();
        await api.post('/leaves', leaveData);
        setShowLeaveForm(false);
        fetchData();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">日常训练 (Training)</h2>
                <div className="flex gap-2">
                    {canEdit && <button onClick={() => setShowForm(!showForm)} className="bg-orange-600 px-4 py-2 rounded flex items-center gap-2"><Plus size={16} /> New Plan</button>}
                    {canLeave && <button onClick={() => setShowLeaveForm(!showLeaveForm)} className="bg-gray-600 px-4 py-2 rounded flex items-center gap-2">请假 (Request Leave)</button>}
                </div>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="bg-gray-800 p-4 rounded mb-6 border border-orange-500">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input type="datetime-local" className="bg-gray-700 p-2 rounded text-white" required onChange={e => setFormData({ ...formData, start_time: e.target.value.replace('T', ' ') })} />
                        <input type="datetime-local" className="bg-gray-700 p-2 rounded text-white" required onChange={e => setFormData({ ...formData, end_time: e.target.value.replace('T', ' ') })} />
                    </div>
                    <textarea placeholder="Training Plan Content" className="w-full bg-gray-700 p-2 rounded mb-4 text-white" rows="3" required onChange={e => setFormData({ ...formData, plan_content: e.target.value })}></textarea>
                    <button type="submit" className="bg-orange-600 px-6 py-2 rounded">Publish</button>
                </form>
            )}

            {showLeaveForm && (
                <form onSubmit={handleLeave} className="bg-gray-800 p-4 rounded mb-6 border border-gray-500">
                    <h3 className="font-bold mb-2">Leave Application</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input type="number" placeholder="Duration (Hours)" step="0.5" className="bg-gray-700 p-2 rounded text-white" required onChange={e => setLeaveData({ ...leaveData, duration_hours: e.target.value })} />
                        <select className="bg-gray-700 p-2 rounded text-white" onChange={e => setLeaveData({ ...leaveData, training_id: e.target.value })}>
                            <option value="">General Leave (No specific session)</option>
                            {trainings.map(t => <option key={t.id} value={t.id}>{t.start_time}</option>)}
                        </select>
                    </div>
                    <textarea placeholder="Reason for leave" className="w-full bg-gray-700 p-2 rounded mb-4 text-white" rows="2" required onChange={e => setLeaveData({ ...leaveData, reason: e.target.value })}></textarea>
                    <button type="submit" className="bg-gray-600 px-6 py-2 rounded">Submit</button>
                </form>
            )}

            <div className="grid gap-4">
                {trainings.map(t => (
                    <div key={t.id} className="bg-gray-800 p-4 rounded shadow-lg border-l-4 border-orange-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-xl text-orange-400">{t.start_time} - {t.end_time.split(' ')[1]}</h3>
                                <p className="mt-2 text-gray-300 whitespace-pre-wrap">{t.plan_content}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <h3 className="text-xl font-bold mt-8 mb-4">Leave Requests</h3>
            <div className="grid gap-2">
                {leaves.length === 0 && <p className="text-gray-500">No leave records.</p>}
                {leaves.map(l => (
                    <div key={l.id} className="bg-gray-800 p-3 rounded flex justify-between items-center">
                        <span><span className="text-orange-400 font-bold">{l.real_name}</span>: {l.reason} ({l.duration_hours}h)</span>
                        <span className="text-sm bg-gray-700 px-2 py-1 rounded">{l.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MatchModule = ({ user }) => {
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
        await api.post('/matches', formData);
        setShowForm(false);
        fetchMatches();
    };
    const handleSignup = async (id) => {
        try {
            await api.post(`/matches/${id}/signup`);
            alert('Signed up!');
            fetchMatches();
        } catch (e) { alert(e.response.data.message); }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">比赛事宜 (Matches)</h2>
                {canEdit && <button onClick={() => setShowForm(!showForm)} className="bg-orange-600 px-4 py-2 rounded flex items-center gap-2"><Plus size={16} /> New Match</button>}
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="bg-gray-800 p-4 rounded mb-6 border border-orange-500">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <input type="datetime-local" className="bg-gray-700 p-2 rounded text-white" required onChange={e => setFormData({ ...formData, match_time: e.target.value.replace('T', ' ') })} />
                        <input type="text" placeholder="Opponent" className="bg-gray-700 p-2 rounded text-white" required onChange={e => setFormData({ ...formData, opponent: e.target.value })} />
                        <input type="text" placeholder="Location" className="bg-gray-700 p-2 rounded text-white" required onChange={e => setFormData({ ...formData, location: e.target.value })} />
                    </div>
                    <button type="submit" className="bg-orange-600 px-6 py-2 rounded">Create</button>
                </form>
            )}

            <div className="grid gap-4">
                {matches.map(m => (
                    <div key={m.id} className="bg-gray-800 p-6 rounded shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-gray-700 p-2 px-4 rounded-bl-lg">
                            {m.location}
                        </div>
                        <h3 className="text-2xl font-bold mb-2">{m.match_time} vs {m.opponent}</h3>
                        <div className="mt-4">
                            <h4 className="text-sm text-gray-400 mb-2">Roster ({m.participants.length}):</h4>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {m.participants.map((p, idx) => (
                                    <span key={idx} className="bg-gray-700 px-2 py-1 rounded text-sm">{p}</span>
                                ))}
                            </div>
                            {!m.is_signed_up && user.role === 'player' && (
                                <button onClick={() => handleSignup(m.id)} className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-bold">Sign Up Now</button>
                            )}
                            {m.is_signed_up && <span className="text-green-500 font-bold">✓ You are in</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const VenueModule = ({ user }) => {
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
                <h2 className="text-3xl font-bold">场地预约 (Venues)</h2>
                {canEdit && <button onClick={() => setShowForm(!showForm)} className="bg-orange-600 px-4 py-2 rounded flex items-center gap-2"><Plus size={16} /> Reserve</button>}
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="bg-gray-800 p-4 rounded mb-6 border border-orange-500">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input type="datetime-local" className="bg-gray-700 p-2 rounded text-white" required onChange={e => setFormData({ ...formData, start_time: e.target.value.replace('T', ' ') })} />
                        <input type="datetime-local" className="bg-gray-700 p-2 rounded text-white" required onChange={e => setFormData({ ...formData, end_time: e.target.value.replace('T', ' ') })} />
                    </div>
                    <input type="text" placeholder="Proof Photo URL (e.g., http://...)" className="w-full bg-gray-700 p-2 rounded mb-4 text-white" onChange={e => setFormData({ ...formData, proof_photo_url: e.target.value })} />
                    <button type="submit" className="bg-orange-600 px-6 py-2 rounded">Submit Reservation</button>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {venues.map(v => (
                    <div key={v.id} className="bg-gray-800 p-4 rounded flex gap-4">
                        {v.proof_photo_url ? (
                            <img src={v.proof_photo_url} alt="Proof" className="w-24 h-24 object-cover rounded bg-gray-700" />
                        ) : <div className="w-24 h-24 bg-gray-700 rounded flex items-center justify-center text-gray-500">No Img</div>}
                        <div>
                            <p className="font-bold text-lg">{v.start_time}</p>
                            <p className="text-gray-400">to {v.end_time.split(' ')[1]}</p>
                            <span className="text-green-500 text-sm mt-2 block">Reserved</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PhotoModule = ({ user }) => {
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
            <h2 className="text-3xl font-bold mb-6">风采展示 (Gallery)</h2>
            {canEdit && (
                <form onSubmit={handleUpload} className="mb-8 flex gap-2">
                    <input type="text" placeholder="Image URL" className="flex-1 bg-gray-800 p-2 rounded text-white" value={url} onChange={e => setUrl(e.target.value)} required />
                    <button type="submit" className="bg-orange-600 px-4 rounded">Upload</button>
                </form>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map(p => (
                    <div key={p.id} className="relative group aspect-square bg-gray-800 rounded overflow-hidden">
                        <img src={p.url} alt="Team" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    </div>
                ))}
            </div>
        </div>
    );
};

const PersonalModule = ({ user }) => {
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
            <h2 className="text-3xl font-bold mb-6">个人训练打卡 (Check-in)</h2>
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-1/3">
                    <form onSubmit={handleLog} className="bg-gray-800 p-6 rounded shadow-lg sticky top-8">
                        <h3 className="text-xl font-bold mb-4">New Check-in</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="Training Item (e.g. 100 shots)" className="w-full bg-gray-700 p-2 rounded text-white" value={formData.item_name} onChange={e => setFormData({ ...formData, item_name: e.target.value })} required />
                            <input type="text" placeholder="Evidence Photo URL" className="w-full bg-gray-700 p-2 rounded text-white" value={formData.photo_url} onChange={e => setFormData({ ...formData, photo_url: e.target.value })} />
                            <button type="submit" className="w-full bg-orange-600 py-2 rounded font-bold">Clock In</button>
                        </div>
                    </form>
                </div>
                <div className="flex-1 space-y-4">
                    {logs.map(log => (
                        <div key={log.id} className="bg-gray-800 p-4 rounded flex items-start gap-4">
                            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center font-bold text-xl">
                                {log.real_name?.[0] || 'U'}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <h4 className="font-bold">{log.real_name || log.username}</h4>
                                    <span className="text-gray-500 text-sm">{log.timestamp}</span>
                                </div>
                                <p className="text-orange-400">{log.item_name}</p>
                                {log.photo_url && <img src={log.photo_url} alt="Proof" className="mt-2 h-32 rounded bg-black" />}
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

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <div className="bg-black min-h-screen text-white">
            {!user ? <Login onLogin={handleLogin} /> : <Dashboard user={user} onLogout={handleLogout} />}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

export default App;