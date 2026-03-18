import React, { useState, useEffect } from 'react';
import { Settings, HelpCircle, ChevronRight, PlaySquare, Users, Copy, CheckCircle2, Star, LockOpen, ArrowLeft, Send, MessageCircle, ShieldCheck, Globe, Info, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';

// ── Telegram WebApp SDK ───────────────────────────────────────────────────────
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
          start_param?: string; // referral param
        };
        ready?: () => void;
        openTelegramLink?: (url: string) => void;
        openLink?: (url: string) => void;
      };
    };
  }
}

// ── Telegram user data নাও ────────────────────────────────────────────────────
function getTelegramUser() {
  const tg = window.Telegram?.WebApp;
  if (tg?.ready) tg.ready();
  const user = tg?.initDataUnsafe?.user;
  if (user) return user;
  // Dev fallback — browser এ test করার সময়
  return {
    id: 123456789,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    photo_url: 'https://picsum.photos/seed/tgprofile/200/200',
  };
}

function getTelegramStartParam() {
  return window.Telegram?.WebApp?.initDataUnsafe?.start_param || null;
}

export default function ProfileTab({ showToast, balance, setBalance }: any) {
  const [activeView, setActiveView] = useState('main');
  const [copied, setCopied] = useState(false);
  const [tgUser] = useState(getTelegramUser());
  const [userData, setUserData] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);

  // ── Firebase: user data load / create ────────────────────────────────────
  useEffect(() => {
    if (!tgUser?.id) return;
    const userRef = doc(db, 'users', String(tgUser.id));

    // Check referral param
    const refParam = getTelegramStartParam();

    const unsub = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        setUserData(snap.data());
      } else {
        // নতুন user — create করো
        const newUser = {
          id: String(tgUser.id),
          username: tgUser.username || tgUser.first_name,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name || '',
          photoUrl: tgUser.photo_url || '',
          balance: 0,
          referrals: 0,
          totalAdsWatched: 0,
          unlockedContents: [],
          referredBy: refParam || null,
          joinDate: new Date().toLocaleDateString('bn-BD'),
          withdrawals: [],
        };
        await setDoc(userRef, newUser);
        setUserData(newUser);

        // Referral credit — শুধু যদি আলাদা user refer করে
        if (refParam && refParam !== String(tgUser.id)) {
          const refDoc = doc(db, 'users', refParam);
          const refSnap = await getDoc(refDoc);
          if (refSnap.exists()) {
            // Referral reward — video play করলে count হবে (এখানে join করলে pending mark করি)
            const refData = refSnap.data();
            await updateDoc(refDoc, {
              pendingReferrals: [...(refData.pendingReferrals || []), String(tgUser.id)],
            });
          }
        }
      }
    });

    return () => unsub();
  }, [tgUser?.id]);

  // ── Admin থেকে channels load ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'channels'), (snap) => {
      setChannels(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const botUsername = (window as any)._appSettings?.botUsername || 'YourBot';
  const referralLink = `https://t.me/${botUsername}?start=${tgUser?.id}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    showToast('Referral link copied! 🎉', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = () => {
    const text = `🔥 Join me on Desi Hub and earn money watching videos!\n\n${referralLink}`;
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('🔥 Join me on Desi Hub!')}`);
    } else {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('🔥 Join Desi Hub!')}`, '_blank');
    }
  };

  // ── Views ─────────────────────────────────────────────────────────────────
  if (activeView === 'invite') {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
        className="space-y-5 px-4 pt-4 pb-24">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setActiveView('main')} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><ArrowLeft size={20} /></button>
          <h2 className="text-xl font-black text-white tracking-tight">Invite Friends</h2>
        </div>

        {/* How it works */}
        <div className="bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-500/20 rounded-3xl p-5 space-y-3">
          <h3 className="font-black text-white text-sm uppercase tracking-widest">How Referral Works</h3>
          <div className="space-y-2">
            {[
              { step: '1', text: 'Share your referral link' },
              { step: '2', text: 'Friend joins via your link' },
              { step: '3', text: 'Friend watches their 1st video' },
              { step: '4', text: 'You get ৳5.00 reward! 🎉' },
            ].map(s => (
              <div key={s.step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-[10px] font-black text-white shrink-0">{s.step}</div>
                <p className="text-sm text-slate-300 font-medium">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="bg-black/40 rounded-2xl p-3 border border-white/5">
            <p className="text-[10px] text-slate-400 font-bold">⚠️ Anti-Fake: Reward only counts after friend plays a video. Self-referral & saved messages don't work.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-pink-500">{userData?.referrals || 0}</p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Total Referrals</p>
          </div>
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-400">৳{((userData?.referrals || 0) * 5).toFixed(2)}</p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Total Earned</p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Your Referral Link</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-black rounded-xl px-3 py-2.5 text-xs text-slate-400 font-mono truncate border border-white/5">
              {referralLink}
            </div>
            <button onClick={copyReferralLink} className="p-2.5 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/20">
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <button onClick={shareReferral}
            className="w-full py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-pink-500 to-purple-600 shadow-[0_0_20px_rgba(236,72,153,0.3)] active:scale-95 flex items-center justify-center gap-2">
            <Send size={16} /> Share on Telegram
          </button>
        </div>
      </motion.div>
    );
  }

  if (activeView === 'channels') {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
        className="space-y-4 px-4 pt-4 pb-24">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setActiveView('main')} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><ArrowLeft size={20} /></button>
          <h2 className="text-xl font-black text-white tracking-tight">Our Channels</h2>
        </div>
        <div className="space-y-3">
          {channels.length === 0 && <p className="text-center text-slate-600 py-8 font-bold">No channels added yet.</p>}
          {channels.map((ch: any) => (
            <button key={ch.id}
              onClick={() => {
                const tg = window.Telegram?.WebApp;
                if (tg?.openTelegramLink) tg.openTelegramLink(ch.link);
                else window.open(ch.link, '_blank');
              }}
              className="w-full flex items-center gap-4 p-4 bg-[#111] border border-white/5 rounded-2xl hover:border-pink-500/20 transition-all active:scale-95">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-2xl border border-blue-500/20 shrink-0">
                {ch.icon || '📢'}
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-white text-sm">{ch.name}</p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">{ch.members || ''}</p>
              </div>
              <Send size={16} className="text-blue-400 shrink-0" />
            </button>
          ))}
        </div>
      </motion.div>
    );
  }

  if (activeView === 'help') {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
        className="space-y-4 px-4 pt-4 pb-24">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setActiveView('main')} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><ArrowLeft size={20} /></button>
          <h2 className="text-xl font-black text-white tracking-tight">Help & Support</h2>
        </div>
        <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-white/5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-2">
              <Info size={16} className="text-pink-500" /> About
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">Watch exclusive content, complete tasks, earn rewards and withdraw to bKash, Nagad or USDT.</p>
          </div>
          <button onClick={() => showToast('Opening support...', 'info')} className="w-full p-5 flex items-center justify-between hover:bg-white/5 border-b border-white/5">
            <div className="flex items-center gap-3"><MessageCircle size={20} className="text-blue-400" /><span className="text-sm font-bold text-white">Live Chat Support</span></div>
            <ChevronRight size={16} className="text-slate-500" />
          </button>
          <button onClick={() => showToast('Opening FAQ...', 'info')} className="w-full p-5 flex items-center justify-between hover:bg-white/5">
            <div className="flex items-center gap-3"><HelpCircle size={20} className="text-emerald-400" /><span className="text-sm font-bold text-white">FAQ & Guides</span></div>
            <ChevronRight size={16} className="text-slate-500" />
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Main Profile View ─────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 px-4 pt-4 pb-24">

      {/* Telegram Profile Card */}
      <div className="flex flex-col items-center pt-2 pb-2">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#111] shadow-[0_0_20px_rgba(236,72,153,0.3)]">
            {tgUser?.photo_url
              ? <img src={tgUser.photo_url} alt="Profile" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-3xl font-black text-white">
                  {tgUser?.first_name?.[0]?.toUpperCase() || '?'}
                </div>}
          </div>
          <div className="absolute bottom-0 right-0 bg-emerald-500 w-5 h-5 rounded-full border-4 border-black" />
        </div>

        <h2 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
          {tgUser?.first_name} {tgUser?.last_name || ''}
          <CheckCircle2 size={18} className="text-pink-500 fill-pink-500/20" />
        </h2>
        {tgUser?.username && <p className="text-pink-500 font-bold mt-0.5 text-sm">@{tgUser.username}</p>}

        <button onClick={() => { navigator.clipboard.writeText(String(tgUser?.id)).catch(() => {}); showToast('ID copied!', 'success'); }}
          className="mt-3 flex items-center gap-2 bg-[#111] hover:bg-white/5 text-slate-400 px-4 py-1.5 rounded-full text-xs font-bold border border-white/5">
          ID: {tgUser?.id}
          <Copy size={12} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox icon={<PlaySquare size={18} />} label="Unlocked" value={userData?.unlockedContents?.length || 0} color="text-pink-500" bg="bg-pink-500/10" />
        <StatBox icon={<Star size={18} />} label="Ads" value={userData?.totalAdsWatched || 0} color="text-emerald-500" bg="bg-emerald-500/10" />
        <StatBox icon={<Users size={18} />} label="Referrals" value={userData?.referrals || 0} color="text-purple-500" bg="bg-purple-500/10" />
      </div>

      {/* Balance */}
      <div className="bg-gradient-to-r from-pink-500/10 to-purple-600/10 border border-pink-500/20 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Balance</p>
          <p className="text-2xl font-black text-white mt-0.5">৳{(balance || 0).toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Referral Earned</p>
          <p className="text-lg font-black text-emerald-400">৳{((userData?.referrals || 0) * 5).toFixed(2)}</p>
        </div>
      </div>

      {/* Menu */}
      <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <ProfileMenuItem icon={<Globe size={20} />} label="Our Channels & Groups" onClick={() => setActiveView('channels')} />
        <ProfileMenuItem icon={<LockOpen size={20} />} label="My Unlocked Content" onClick={() => showToast('Coming soon!', 'info')} />
        <ProfileMenuItem icon={<Users size={20} />} label="Invite Friends" badge="৳5/ref" onClick={() => setActiveView('invite')} />
        <ProfileMenuItem icon={<HelpCircle size={20} />} label="Help & Support" onClick={() => setActiveView('help')} />
      </div>

      <div className="text-center pt-2">
        <div className="flex items-center justify-center gap-2 text-slate-600">
          <ShieldCheck size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Secure & Encrypted</span>
        </div>
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Desi Hub v2.0 © {new Date().getFullYear()}</p>
      </div>
    </motion.div>
  );
}

function StatBox({ icon, label, value, color, bg }: any) {
  return (
    <div className="bg-[#111] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm">
      <div className={`${color} ${bg} p-2.5 rounded-xl`}>{icon}</div>
      <div className="text-center">
        <p className="text-lg font-black text-white leading-none">{value}</p>
        <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function ProfileMenuItem({ icon, label, badge, onClick }: any) {
  return (
    <motion.button onClick={onClick} whileTap={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      className="w-full flex items-center justify-between p-4 transition-colors border-b border-white/5 last:border-0 text-slate-300 hover:bg-white/5">
      <div className="flex items-center gap-4 font-bold text-sm">
        <div className="p-2 rounded-xl bg-black border border-white/5">{icon}</div>
        {label}
      </div>
      <div className="flex items-center gap-3">
        {badge && <span className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">{badge}</span>}
        <ChevronRight size={18} className="text-slate-600" />
      </div>
    </motion.button>
  );
}
