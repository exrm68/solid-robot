import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot, setDoc
} from 'firebase/firestore';
import {
  X, Plus, Trash2, Edit2, Save, Lock, Eye, EyeOff,
  PlaySquare, CheckSquare, Megaphone, Users,
  FolderPlus, ChevronRight, ToggleLeft, ToggleRight, Send, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ADMIN_PASSWORD = 'admin1234'; // ✅ তোমার password এখানে বদলাও

// ─── Types ────────────────────────────────────────────────────────────────────
type Category = { id: string; name: string };
type Content = {
  id: string; title: string; thumbnail: string; link: string;
  category: string; adCount: number; price: number; premium: boolean;
  views: string; time: string;
};
type Task = { id: string; title: string; link: string; reward: number; type: string; icon: string };
type AdNetwork = {
  id: string; name: string; blockId: string; type: string;
  reward: number; maxViews: number; color: string; active: boolean;
};
type User = {
  id: string; username: string; balance: number; referrals: number;
  totalAdsWatched: number; unlockedContents: string[]; joinDate: string;
};

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-[#1a1a1a]">
          <h2 className="font-black text-white text-base">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </div>
  );
}

function Input({ label, ...props }: any) {
  return (
    <div>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">{label}</label>
      <input {...props} className="w-full bg-black border border-white/10 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-pink-500/50" />
    </div>
  );
}

function Select({ label, children, ...props }: any) {
  return (
    <div>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">{label}</label>
      <select {...props} className="w-full bg-black border border-white/10 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-pink-500/50">
        {children}
      </select>
    </div>
  );
}

// ─── Login ───────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (pw === ADMIN_PASSWORD) { onLogin(); }
      else { setError('Wrong password!'); setLoading(false); }
    }, 600);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-[400] bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-[0_0_30px_rgba(236,72,153,0.4)]">
            <Lock size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-black text-white">Admin Panel</h1>
          <p className="text-slate-500 text-xs mt-1">Authorized access only</p>
        </div>
        <form onSubmit={submit} className="bg-[#111] border border-white/10 rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Password</label>
            <div className="relative">
              <input type={show ? 'text' : 'password'} value={pw}
                onChange={e => { setPw(e.target.value); setError(''); }}
                className="w-full bg-black border border-white/10 rounded-xl py-2.5 px-3 pr-10 text-white text-sm focus:outline-none focus:border-pink-500/50"
                placeholder="Enter password" autoFocus />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {error && <p className="text-red-400 text-xs mt-1 font-bold">{error}</p>}
          </div>
          <button type="submit" disabled={loading || !pw}
            className="w-full py-2.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-pink-500 to-purple-600 disabled:opacity-50 active:scale-95">
            {loading ? 'Checking...' : 'Enter →'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

// ─── Content Tab ─────────────────────────────────────────────────────────────
function ContentTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [activeCat, setActiveCat] = useState('all');
  const [showContent, setShowContent] = useState(false);
  const [showCat, setShowCat] = useState(false);
  const [editing, setEditing] = useState<Content | null>(null);
  const [newCat, setNewCat] = useState('');
  const [loading, setLoading] = useState(false);
  const emptyForm = { title: '', thumbnail: '', link: '', category: '', adCount: 2, price: 0, premium: false, views: '0', time: 'Just now' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'categories'), s => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() } as Category))));
    const u2 = onSnapshot(collection(db, 'contents'), s => setContents(s.docs.map(d => ({ id: d.id, ...d.data() } as Content))));
    return () => { u1(); u2(); };
  }, []);

  const addCat = async () => {
    if (!newCat.trim()) return;
    await addDoc(collection(db, 'categories'), { name: newCat.trim() });
    setNewCat(''); setShowCat(false);
  };

  const saveContent = async () => {
    setLoading(true);
    try {
      if (editing) await updateDoc(doc(db, 'contents', editing.id), { ...form });
      else await addDoc(collection(db, 'contents'), { ...form });
      setShowContent(false); setEditing(null); setForm(emptyForm);
    } finally { setLoading(false); }
  };

  const filtered = activeCat === 'all' ? contents : contents.filter(c => c.category === activeCat);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-bold">{contents.length} contents</p>
        <div className="flex gap-2">
          <button onClick={() => setShowCat(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold">
            <FolderPlus size={13} /> Category
          </button>
          <button onClick={() => { setForm(emptyForm); setEditing(null); setShowContent(true); }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-black">
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setActiveCat('all')}
          className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${activeCat === 'all' ? 'bg-pink-500 text-white' : 'bg-[#1a1a1a] border border-white/10 text-slate-400'}`}>
          All ({contents.length})
        </button>
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-1 shrink-0">
            <button onClick={() => setActiveCat(cat.name)}
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${activeCat === cat.name ? 'bg-pink-500 text-white' : 'bg-[#1a1a1a] border border-white/10 text-slate-400'}`}>
              {cat.name} ({contents.filter(c => c.category === cat.name).length})
            </button>
            <button onClick={() => deleteDoc(doc(db, 'categories', cat.id))} className="text-slate-600 hover:text-red-400"><X size={10} /></button>
          </div>
        ))}
      </div>

      {/* Content list */}
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center text-slate-600 py-8 font-bold text-sm">No content yet</p>}
        {filtered.map(c => (
          <div key={c.id} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-3 flex gap-3 items-center">
            <img src={c.thumbnail || 'https://picsum.photos/seed/def/80/45'} className="w-20 h-11 object-cover rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-black text-white text-xs truncate">{c.title}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full font-bold">{c.category || '—'}</span>
                <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-bold">{c.adCount} ads</span>
                {c.price > 0
                  ? <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full font-bold">৳{c.price}</span>
                  : <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">Free</span>}
                {c.premium && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">⭐</span>}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => { setEditing(c); setForm({ title: c.title, thumbnail: c.thumbnail, link: c.link, category: c.category, adCount: c.adCount, price: c.price, premium: c.premium, views: c.views, time: c.time }); setShowContent(true); }}
                className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400"><Edit2 size={13} /></button>
              <button onClick={() => deleteDoc(doc(db, 'contents', c.id))}
                className="p-1.5 rounded-lg bg-red-500/20 text-red-400"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Content Modal */}
      {showContent && (
        <Modal title={editing ? 'Edit Content' : 'Add Content'} onClose={() => { setShowContent(false); setEditing(null); }}>
          <div className="space-y-3">
            <Input label="Title" value={form.title} onChange={(e: any) => setForm({ ...form, title: e.target.value })} placeholder="Content title..." />
            <Input label="Thumbnail URL" value={form.thumbnail} onChange={(e: any) => setForm({ ...form, thumbnail: e.target.value })} placeholder="https://..." />
            <Input label="Link (Telegram / Drive / Any)" value={form.link} onChange={(e: any) => setForm({ ...form, link: e.target.value })} placeholder="https://t.me/..." />
            <Select label="Category" value={form.category} onChange={(e: any) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select category</option>
              {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </Select>
            <Select label="Ads to Unlock" value={form.adCount} onChange={(e: any) => setForm({ ...form, adCount: Number(e.target.value), price: Number(e.target.value) === 0 ? form.price : 0 })}>
              <option value={0}>Paid (no ads)</option>
              <option value={1}>1 Ad</option>
              <option value={2}>2 Ads</option>
              <option value={3}>3 Ads</option>
            </Select>
            {form.adCount === 0 && (
              <Input label="Price (৳)" type="number" value={form.price} onChange={(e: any) => setForm({ ...form, price: Number(e.target.value) })} placeholder="0" />
            )}
            <div className="flex items-center gap-3 p-3 bg-black rounded-xl border border-white/10">
              <input type="checkbox" id="prem" checked={form.premium} onChange={e => setForm({ ...form, premium: e.target.checked })} className="accent-pink-500 w-4 h-4" />
              <label htmlFor="prem" className="text-sm font-bold text-white cursor-pointer">Premium ⭐</label>
            </div>
            <button onClick={saveContent} disabled={loading || !form.title || !form.link}
              className="w-full py-3 rounded-xl font-black text-sm text-white bg-gradient-to-r from-pink-500 to-purple-600 disabled:opacity-50 active:scale-95">
              {loading ? 'Saving...' : editing ? 'Update' : 'Add Content'}
            </button>
          </div>
        </Modal>
      )}

      {/* Add Category Modal */}
      {showCat && (
        <Modal title="Add Category" onClose={() => setShowCat(false)}>
          <div className="space-y-3">
            <Input label="Category Name" value={newCat} onChange={(e: any) => setNewCat(e.target.value)} placeholder="e.g. Exclusive 🔞" />
            <button onClick={addCat} disabled={!newCat.trim()}
              className="w-full py-3 rounded-xl font-black text-sm text-white bg-gradient-to-r from-pink-500 to-purple-600 disabled:opacity-50 active:scale-95">
              Add Category
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────
function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const emptyForm = { title: '', link: '', reward: 5, type: 'social', icon: '📢' };
  const [form, setForm] = useState(emptyForm);
  const ICONS = ['📢', '▶️', '🐦', '🎬', '🎁', '💬', '⭐', '🔔', '🤖', '🌐'];

  useEffect(() => {
    return onSnapshot(collection(db, 'tasks'), s => setTasks(s.docs.map(d => ({ id: d.id, ...d.data() } as Task))));
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      if (editing) await updateDoc(doc(db, 'tasks', editing.id), { ...form });
      else await addDoc(collection(db, 'tasks'), { ...form });
      setShowModal(false); setEditing(null); setForm(emptyForm);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-bold">{tasks.length} tasks</p>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setShowModal(true); }}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-black">
          <Plus size={13} /> Add Task
        </button>
      </div>

      <div className="space-y-2">
        {tasks.length === 0 && <p className="text-center text-slate-600 py-8 font-bold text-sm">No tasks yet</p>}
        {tasks.map(t => (
          <div key={t.id} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black border border-white/5 flex items-center justify-center text-xl shrink-0">{t.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-white text-xs truncate">{t.title}</p>
              <div className="flex gap-1 mt-1">
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">৳{t.reward}</span>
                <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-bold">{t.type}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setEditing(t); setForm({ title: t.title, link: t.link, reward: t.reward, type: t.type, icon: t.icon }); setShowModal(true); }}
                className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400"><Edit2 size={13} /></button>
              <button onClick={() => deleteDoc(doc(db, 'tasks', t.id))}
                className="p-1.5 rounded-lg bg-red-500/20 text-red-400"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Task' : 'Add Task'} onClose={() => { setShowModal(false); setEditing(null); }}>
          <div className="space-y-3">
            <Input label="Task Title" value={form.title} onChange={(e: any) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Join Telegram Channel" />
            <Input label="Link (Telegram / Bot)" value={form.link} onChange={(e: any) => setForm({ ...form, link: e.target.value })} placeholder="https://t.me/..." />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Reward (৳)" type="number" value={form.reward} onChange={(e: any) => setForm({ ...form, reward: Number(e.target.value) })} />
              <Select label="Type" value={form.type} onChange={(e: any) => setForm({ ...form, type: e.target.value })}>
                {['social', 'watch', 'invite', 'verify', 'bot', 'other'].map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {ICONS.map(icon => (
                  <button key={icon} onClick={() => setForm({ ...form, icon })}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all ${form.icon === icon ? 'bg-pink-500/20 border-pink-500/50' : 'bg-black border-white/10'}`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={save} disabled={loading || !form.title}
              className="w-full py-3 rounded-xl font-black text-sm text-white bg-gradient-to-r from-pink-500 to-purple-600 disabled:opacity-50 active:scale-95">
              {loading ? 'Saving...' : editing ? 'Update' : 'Add Task'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Ads Tab ──────────────────────────────────────────────────────────────────
function AdsTab() {
  const [networks, setNetworks] = useState<AdNetwork[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdNetwork | null>(null);
  const [loading, setLoading] = useState(false);
  const emptyForm = { name: '', blockId: '', type: 'adsgram', reward: 3, maxViews: 30, color: '#ec4899', active: true };
  const [form, setForm] = useState(emptyForm);
  const COLORS = ['#ec4899', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  useEffect(() => {
    return onSnapshot(collection(db, 'adNetworks'), s => setNetworks(s.docs.map(d => ({ id: d.id, ...d.data() } as AdNetwork))));
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      if (editing) await updateDoc(doc(db, 'adNetworks', editing.id), { ...form });
      else await addDoc(collection(db, 'adNetworks'), { ...form });
      setShowModal(false); setEditing(null); setForm(emptyForm);
    } finally { setLoading(false); }
  };

  const toggle = async (n: AdNetwork) => {
    await updateDoc(doc(db, 'adNetworks', n.id), { active: !n.active });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-bold">{networks.filter(n => n.active).length} active networks</p>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setShowModal(true); }}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-black">
          <Plus size={13} /> Add Network
        </button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
        <p className="text-blue-400 font-bold text-[10px]">ℹ️ Adsgram: Block ID দাও। Monetag: Zone ID দাও। Toggle করলে app এ সাথে সাথে on/off হবে।</p>
      </div>

      <div className="space-y-2">
        {networks.length === 0 && <p className="text-center text-slate-600 py-8 font-bold text-sm">No ad networks yet</p>}
        {networks.map(n => (
          <div key={n.id} className={`bg-[#1a1a1a] border rounded-xl p-3 flex items-center gap-3 transition-all ${n.active ? 'border-white/10' : 'border-white/5 opacity-50'}`}>
            <div className="w-10 h-10 rounded-xl border border-white/5 flex items-center justify-center font-black text-xs shrink-0"
              style={{ backgroundColor: n.color + '20', color: n.color }}>
              {n.type === 'adsgram' ? 'AG' : 'MT'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-white text-xs">{n.name}</p>
              <div className="flex gap-1 mt-1">
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">৳{n.reward}/ad</span>
                <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-bold">Max {n.maxViews}/day</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => toggle(n)} className={`p-1.5 rounded-lg transition-all ${n.active ? 'text-emerald-400' : 'text-slate-600'}`}>
                {n.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              </button>
              <button onClick={() => { setEditing(n); setForm({ name: n.name, blockId: n.blockId, type: n.type, reward: n.reward, maxViews: n.maxViews, color: n.color, active: n.active }); setShowModal(true); }}
                className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400"><Edit2 size={13} /></button>
              <button onClick={() => deleteDoc(doc(db, 'adNetworks', n.id))}
                className="p-1.5 rounded-lg bg-red-500/20 text-red-400"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Network' : 'Add Network'} onClose={() => { setShowModal(false); setEditing(null); }}>
          <div className="space-y-3">
            <Input label="Name" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Adsgram Premium" />
            <Select label="Type" value={form.type} onChange={(e: any) => setForm({ ...form, type: e.target.value })}>
              <option value="adsgram">Adsgram</option>
              <option value="monetag">Monetag</option>
              <option value="other">Other</option>
            </Select>
            <Input label={form.type === 'adsgram' ? 'Adsgram Block ID' : 'Zone ID'} value={form.blockId} onChange={(e: any) => setForm({ ...form, blockId: e.target.value })} placeholder="ID from dashboard..." />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Reward (৳)" type="number" value={form.reward} onChange={(e: any) => setForm({ ...form, reward: Number(e.target.value) })} />
              <Input label="Max Views/Day" type="number" value={form.maxViews} onChange={(e: any) => setForm({ ...form, maxViews: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Color</label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <button onClick={save} disabled={loading || !form.name}
              className="w-full py-3 rounded-xl font-black text-sm text-white bg-gradient-to-r from-pink-500 to-purple-600 disabled:opacity-50 active:scale-95">
              {loading ? 'Saving...' : editing ? 'Update' : 'Add'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), s => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() } as User))));
  }, []);

  const pendingWithdrawals = users.flatMap((u: any) =>
    ((u.withdrawals || []) as any[]).filter((w: any) => w.status === 'pending').map((w: any) => ({ ...w, username: u.username, userId: u.id }))
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Users', value: users.length, color: 'text-blue-400' },
          { label: 'Pending Withdraw', value: pendingWithdrawals.length, color: 'text-orange-400' },
          { label: 'Total Referrals', value: users.reduce((a, u) => a + (u.referrals || 0), 0), color: 'text-pink-400' },
          { label: 'Ads Watched', value: users.reduce((a, u) => a + (u.totalAdsWatched || 0), 0), color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-3">
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {users.length === 0 && <p className="text-center text-slate-600 py-8 font-bold text-sm">No users yet. They appear when users sign up in the app.</p>}

      {users.map(u => (
        <div key={u.id} className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden">
          <div onClick={() => setExpanded(expanded === u.id ? null : u.id)}
            className="p-3 flex items-center gap-3 cursor-pointer hover:bg-white/5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center font-black text-white text-sm shrink-0">
              {(u.username || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-white text-sm">{u.username || u.id}</p>
              <p className="text-[9px] text-slate-500 font-bold">{u.joinDate || '—'}</p>
            </div>
            <div className="flex gap-3 text-right shrink-0">
              <div><p className="text-xs font-black text-emerald-400">৳{(u.balance || 0).toFixed(0)}</p><p className="text-[8px] text-slate-600 uppercase">Balance</p></div>
              <div><p className="text-xs font-black text-pink-400">{u.referrals || 0}</p><p className="text-[8px] text-slate-600 uppercase">Refs</p></div>
              <div><p className="text-xs font-black text-purple-400">{(u.unlockedContents || []).length}</p><p className="text-[8px] text-slate-600 uppercase">Unlocked</p></div>
            </div>
            <ChevronRight size={14} className={`text-slate-600 transition-transform ${expanded === u.id ? 'rotate-90' : ''}`} />
          </div>
          {expanded === u.id && (
            <div className="px-3 pb-3 border-t border-white/5 pt-3 space-y-2">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Unlocked Content</p>
              <div className="flex flex-wrap gap-1">
                {(u.unlockedContents || []).length === 0
                  ? <p className="text-[10px] text-slate-600">None</p>
                  : (u.unlockedContents || []).map((id: string) => (
                    <span key={id} className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full font-bold">{id}</span>
                  ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Settings Tab ────────────────────────────────────────────────────────────
function SettingsTab() {
  const [form, setForm] = useState({
    botUsername: '',
    howToUnlockLink: '',
    appName: 'DESI HUB',
    referralReward: 5,
    minWithdraw: 50,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'app'), snap => {
      if (snap.exists()) setForm(f => ({ ...f, ...snap.data() }));
    });
    return () => unsub();
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'app'), form, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 font-bold">App-wide settings. Changes apply immediately.</p>

      <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4 space-y-4">
        <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Telegram Bot</p>
        <Input label="Bot Username (without @)" value={form.botUsername}
          onChange={(e: any) => setForm({ ...form, botUsername: e.target.value })}
          placeholder="e.g. MyAppBot" />
        <div className="bg-black rounded-xl p-3 border border-white/5">
          <p className="text-[9px] text-slate-500 font-bold">Referral link preview:</p>
          <p className="text-[10px] text-pink-400 font-mono mt-1">
            https://t.me/{form.botUsername || 'YOUR_BOT'}?start=USER_ID
          </p>
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4 space-y-4">
        <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Home Screen</p>
        <Input label="How to Unlock Banner Link" value={form.howToUnlockLink}
          onChange={(e: any) => setForm({ ...form, howToUnlockLink: e.target.value })}
          placeholder="https://t.me/..." />
        <Input label="App Name" value={form.appName}
          onChange={(e: any) => setForm({ ...form, appName: e.target.value })}
          placeholder="DESI HUB" />
      </div>

      <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4 space-y-4">
        <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Rewards</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Referral Reward (৳)" type="number" value={form.referralReward}
            onChange={(e: any) => setForm({ ...form, referralReward: Number(e.target.value) })} />
          <Input label="Min Withdraw (৳)" type="number" value={form.minWithdraw}
            onChange={(e: any) => setForm({ ...form, minWithdraw: Number(e.target.value) })} />
        </div>
      </div>

      <button onClick={save} disabled={loading}
        className={`w-full py-3 rounded-xl font-black text-sm text-white transition-all active:scale-95 ${
          saved ? 'bg-emerald-500' : 'bg-gradient-to-r from-pink-500 to-purple-600'} disabled:opacity-50`}>
        {loading ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}

// ─── Channels Tab ─────────────────────────────────────────────────────────────
function ChannelsTab() {
  const [channels, setChannels] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const emptyForm = { name: '', link: '', icon: '📢', members: '', type: 'channel' };
  const [form, setForm] = useState(emptyForm);
  const ICONS = ['📢', '👥', '🔔', '💬', '🌐', '⭐', '🎬', '🔞', '💎', '🔥'];

  useEffect(() => {
    return onSnapshot(collection(db, 'channels'), s =>
      setChannels(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      if (editing) await updateDoc(doc(db, 'channels', editing.id), { ...form });
      else await addDoc(collection(db, 'channels'), { ...form });
      setShowModal(false); setEditing(null); setForm(emptyForm);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-bold">{channels.length} channels/groups</p>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setShowModal(true); }}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-black">
          <Plus size={13} /> Add
        </button>
      </div>
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
        <p className="text-blue-400 font-bold text-[10px]">ℹ️ এখানে add করলে Profile tab এ "Our Channels" এ দেখাবে। User click করলে Telegram এ যাবে।</p>
      </div>
      <div className="space-y-2">
        {channels.length === 0 && <p className="text-center text-slate-600 py-8 font-bold text-sm">No channels yet</p>}
        {channels.map(ch => (
          <div key={ch.id} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-xl shrink-0">{ch.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-white text-xs">{ch.name}</p>
              <p className="text-[9px] text-slate-500 font-bold truncate">{ch.link}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setEditing(ch); setForm({ name: ch.name, link: ch.link, icon: ch.icon, members: ch.members, type: ch.type }); setShowModal(true); }}
                className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400"><Edit2 size={13} /></button>
              <button onClick={() => deleteDoc(doc(db, 'channels', ch.id))}
                className="p-1.5 rounded-lg bg-red-500/20 text-red-400"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
      {showModal && (
        <Modal title={editing ? 'Edit Channel' : 'Add Channel/Group'} onClose={() => { setShowModal(false); setEditing(null); }}>
          <div className="space-y-3">
            <Input label="Name" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="Channel name" />
            <Input label="Telegram Link" value={form.link} onChange={(e: any) => setForm({ ...form, link: e.target.value })} placeholder="https://t.me/..." />
            <Input label="Members (optional)" value={form.members} onChange={(e: any) => setForm({ ...form, members: e.target.value })} placeholder="e.g. 10K+ members" />
            <Select label="Type" value={form.type} onChange={(e: any) => setForm({ ...form, type: e.target.value })}>
              <option value="channel">Channel</option>
              <option value="group">Group</option>
              <option value="bot">Bot</option>
            </Select>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {ICONS.map(icon => (
                  <button key={icon} onClick={() => setForm({ ...form, icon })}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all ${form.icon === icon ? 'bg-pink-500/20 border-pink-500/50' : 'bg-black border-white/10'}`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={save} disabled={loading || !form.name || !form.link}
              className="w-full py-3 rounded-xl font-black text-sm text-white bg-gradient-to-r from-pink-500 to-purple-600 disabled:opacity-50 active:scale-95">
              {loading ? 'Saving...' : editing ? 'Update' : 'Add'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Main Admin Panel ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'content', label: 'Content', icon: <PlaySquare size={16} /> },
  { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={16} /> },
  { id: 'ads', label: 'Ads', icon: <Megaphone size={16} /> },
  { id: 'channels', label: 'Channels', icon: <Send size={16} /> },
  { id: 'users', label: 'Users', icon: <Users size={16} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
];

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState('content');

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  return (
    <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25 }}
      className="fixed inset-0 z-[300] bg-[#0f0f0f] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#111] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Lock size={14} className="text-white" />
          </div>
          <div>
            <h1 className="font-black text-white text-sm leading-none">Admin Panel</h1>
            <p className="text-[9px] text-pink-500 font-bold uppercase tracking-widest">Control Center</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-slate-400">
          <X size={18} />
        </button>
      </div>

      {/* Tab Bar — scroll করা যাবে */}
      <div className="flex overflow-x-auto border-b border-white/5 bg-[#111] shrink-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 text-[9px] font-black uppercase tracking-wide transition-all ${activeTab === tab.id ? 'text-pink-500 border-b-2 border-pink-500' : 'text-slate-500'}`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'content' && <ContentTab />}
        {activeTab === 'tasks' && <TasksTab />}
        {activeTab === 'ads' && <AdsTab />}
        {activeTab === 'channels' && <ChannelsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </motion.div>
  );
}
