import React, { useState, useEffect } from 'react';
import { Video, Play, Sparkles, Calendar, TrendingUp, CheckCircle2, Wallet, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase/config';
import { collection, onSnapshot, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

declare global {
  interface Window {
    Adsgram?: {
      init: (config: { blockId: string; debug?: boolean }) => {
        show: () => Promise<{ done: boolean; error?: string }>;
      };
    };
  }
}

export default function EarnTab({ balance, setBalance, showToast, walletInfo, navigateToWallet }: any) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const currentDay = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  const [dailyCheckedIn, setDailyCheckedIn] = useState(false);
  const [networks, setNetworks] = useState<any[]>([]);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [adViewer, setAdViewer] = useState<{
    networkId: string; state: 'loading' | 'watching' | 'countdown' | 'claimable'; timeLeft: number;
  } | null>(null);

  const tgUserId = String((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id || 'guest');

  // ── Load networks from Firebase (admin থেকে) ─────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'adNetworks'), snap => {
      const nets = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((n: any) => n.active !== false);
      setNetworks(nets);
    });
    return () => unsub();
  }, []);

  // ── Load user's today view counts ─────────────────────────────────────────
  useEffect(() => {
    const loadViews = async () => {
      const ref = doc(db, 'users', tgUserId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const today = new Date().toDateString();
        if (data.adViewDate === today) {
          setViewCounts(data.adViews || {});
          setDailyCheckedIn(data.dailyCheckinDate === today);
        } else {
          // নতুন দিন — reset
          setViewCounts({});
        }
      }
    };
    loadViews();
  }, [tgUserId]);

  // ── Ad countdown timer ────────────────────────────────────────────────────
  useEffect(() => {
    let timer: any;
    if (!adViewer) return;
    if (adViewer.state === 'watching' && adViewer.timeLeft > 0) {
      timer = setTimeout(() => setAdViewer(p => p ? { ...p, timeLeft: p.timeLeft - 1 } : null), 1000);
    } else if (adViewer.state === 'watching' && adViewer.timeLeft === 0) {
      setAdViewer(p => p ? { ...p, state: 'countdown', timeLeft: 5 } : null);
    } else if (adViewer.state === 'countdown' && adViewer.timeLeft > 0) {
      timer = setTimeout(() => setAdViewer(p => p ? { ...p, timeLeft: p.timeLeft - 1 } : null), 1000);
    } else if (adViewer.state === 'countdown' && adViewer.timeLeft === 0) {
      setAdViewer(p => p ? { ...p, state: 'claimable' } : null);
    }
    return () => clearTimeout(timer);
  }, [adViewer]);

  const handleDailyCheckIn = async () => {
    if (dailyCheckedIn) return;
    const today = new Date().toDateString();
    setDailyCheckedIn(true);
    setBalance((p: number) => p + 1.50);
    showToast('Daily Check-in Claimed! +৳1.50', 'success');
    try {
      await setDoc(doc(db, 'users', tgUserId), { dailyCheckinDate: today }, { merge: true });
    } catch {}
  };

  const handleWatchAd = async (networkId: string) => {
    if (!walletInfo) { setShowWalletPrompt(true); return; }
    const network = networks.find(n => n.id === networkId);
    if (!network) return;
    const currentViews = viewCounts[networkId] || 0;
    if (currentViews >= (network.maxViews || 30)) {
      showToast('Daily limit reached for this network.', 'error');
      return;
    }

    // Adsgram real SDK
    if (network.type === 'adsgram' && network.blockId && window.Adsgram) {
      setAdViewer({ networkId, state: 'loading', timeLeft: 0 });
      try {
        const AdController = window.Adsgram.init({ blockId: network.blockId });
        const result = await AdController.show();
        if (result.done) {
          await claimAdReward(networkId, network);
        } else {
          showToast('Ad skipped. No reward.', 'error');
        }
        setAdViewer(null);
      } catch {
        showToast('Ad failed to load.', 'error');
        setAdViewer(null);
      }
      return;
    }

    // Simulated flow (Monetag / others)
    setAdViewer({ networkId, state: 'watching', timeLeft: 5 });
  };

  const claimAdReward = async (networkId: string, network?: any) => {
    const net = network || networks.find(n => n.id === networkId);
    if (!net) return;
    const today = new Date().toDateString();
    const newViews = { ...viewCounts, [networkId]: (viewCounts[networkId] || 0) + 1 };
    setViewCounts(newViews);
    setBalance((p: number) => p + net.reward);
    showToast(`Earned ৳${Number(net.reward).toFixed(2)} from ${net.name}! 🎉`, 'success');
    try {
      await setDoc(doc(db, 'users', tgUserId), {
        adViews: newViews,
        adViewDate: today,
        totalAdsWatched: Object.values(newViews).reduce((a: any, b: any) => a + b, 0),
      }, { merge: true });
    } catch {}
    setAdViewer(null);
  };

  return (
    <div className="space-y-6 px-4 pt-2 pb-24">

      {/* Wallet Prompt Modal */}
      <AnimatePresence>
        {showWalletPrompt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-600" />
              <button onClick={() => setShowWalletPrompt(false)} className="absolute top-4 right-4 text-slate-500"><X size={20} /></button>
              <div className="text-center space-y-4 mb-6 mt-2">
                <div className="w-16 h-16 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto text-pink-500 border border-pink-500/20">
                  <Wallet size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Wallet Required</h3>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">Set up your withdrawal wallet before earning rewards.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowWalletPrompt(false)} className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-300 bg-white/5">Cancel</button>
                <button onClick={() => { setShowWalletPrompt(false); navigateToWallet(); }}
                  className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-gradient-to-r from-pink-500 to-purple-600 active:scale-95">Go to Wallet</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad Viewer Modal */}
      <AnimatePresence>
        {adViewer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center">

              {adViewer.state === 'loading' && (
                <>
                  <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center mb-6 border border-pink-500/30">
                    <Video size={32} className="text-pink-500 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Loading Ad...</h3>
                  <p className="text-sm text-slate-400">Please wait...</p>
                </>
              )}

              {adViewer.state === 'watching' && (
                <>
                  <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center mb-6 border border-pink-500/30">
                    <Video size={32} className="text-pink-500 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Watching Ad...</h3>
                  <p className="text-sm text-slate-400 mb-6">Please wait. Do not close.</p>
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#ffffff10" strokeWidth="6" />
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#ec4899" strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (adViewer.timeLeft / 5)}`}
                        className="transition-all duration-1000" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-pink-500">{adViewer.timeLeft}</span>
                  </div>
                </>
              )}

              {adViewer.state === 'countdown' && (
                <>
                  <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mb-6 border border-orange-500/30">
                    <Clock size={32} className="text-orange-500 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Ad Finished!</h3>
                  <p className="text-sm text-slate-400 mb-4">Claim your reward in...</p>
                  <div className="text-5xl font-black text-orange-500">{adViewer.timeLeft}</div>
                </>
              )}

              {adViewer.state === 'claimable' && (
                <>
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 size={40} className="text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">Reward Ready!</h3>
                  <p className="text-sm text-slate-400 mb-8">Tap below to claim your earnings.</p>
                  <button onClick={() => claimAdReward(adViewer.networkId)}
                    className="w-full py-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 uppercase tracking-widest">
                    Claim & Next
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="text-center space-y-2 py-4">
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto text-pink-500 border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
          <Video size={28} />
        </motion.div>
        <h2 className="text-2xl font-black text-white tracking-tight uppercase">Watch & Earn</h2>
        <p className="text-xs text-slate-400 max-w-[250px] mx-auto font-medium">Watch ads to recharge your wallet</p>
      </div>

      {/* Daily Check-in */}
      <div className={`bg-[#111] border rounded-3xl p-5 shadow-2xl transition-colors ${dailyCheckedIn ? 'border-emerald-500/30' : 'border-white/5'}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
            <Calendar size={16} className={dailyCheckedIn ? 'text-emerald-500' : 'text-pink-500'} />
            Daily Check-in
          </h3>
          <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-1 rounded-md border border-orange-500/20 uppercase tracking-wider">
            Day Streak 🔥
          </span>
        </div>
        <div className="flex justify-between gap-1 mb-4">
          {days.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                i < currentDay || (i === currentDay && dailyCheckedIn)
                  ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                  : i === currentDay
                    ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                    : 'bg-black text-slate-600 border border-white/5'}`}>
                {i < currentDay || (i === currentDay && dailyCheckedIn) ? <CheckCircle2 size={14} /> : `+${(i + 1) * 2}`}
              </div>
              <span className={`text-[9px] font-bold ${i === currentDay ? 'text-pink-500' : 'text-slate-600'}`}>{day}</span>
            </div>
          ))}
        </div>
        <button onClick={handleDailyCheckIn} disabled={dailyCheckedIn}
          className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            dailyCheckedIn
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-not-allowed'
              : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-95'}`}>
          {dailyCheckedIn ? 'Claimed (৳1.50)' : 'Claim Daily Reward (৳1.50)'}
        </button>
      </div>

      {/* Ad Networks — Firebase থেকে */}
      <div className="space-y-3 pb-4">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Available Networks</h3>

        {networks.length === 0 && (
          <div className="text-center py-8 bg-[#111] border border-white/5 rounded-2xl">
            <p className="text-slate-600 font-bold text-sm">No ad networks yet.</p>
            <p className="text-slate-700 text-xs mt-1">Admin Panel → Ads তে add করো।</p>
          </div>
        )}

        {networks.map((network, index) => {
          const currentViews = viewCounts[network.id] || 0;
          const isCompleted = currentViews >= (network.maxViews || 30);
          const progress = (currentViews / (network.maxViews || 30)) * 100;

          return (
            <motion.div key={network.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`border rounded-3xl p-4 space-y-4 relative overflow-hidden ${
                isCompleted ? 'bg-[#111]/50 border-white/5' : 'bg-[#111] border-white/10 hover:border-white/20 shadow-lg'}`}>

              {isCompleted && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-3xl">
                  <CheckCircle2 size={28} className="text-emerald-500 mb-1" />
                  <p className="text-white font-bold text-sm">Completed for today</p>
                </div>
              )}

              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center border border-white/5"
                    style={{ color: network.color || '#ec4899' }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-sm tracking-wide">{network.name}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 font-bold">
                      <TrendingUp size={10} /> {network.type?.toUpperCase() || 'AD NETWORK'}
                    </p>
                  </div>
                </div>
                <div className="text-emerald-500 font-black text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                  ৳{Number(network.reward).toFixed(2)} / Ad
                </div>
              </div>

              <div className="space-y-2 bg-black p-3 rounded-2xl border border-white/5">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-500">VIEWS: <span className="text-white">{currentViews}/{network.maxViews || 30}</span></span>
                  <span style={{ color: network.color || '#ec4899' }}>
                    EARNED: ৳{(currentViews * Number(network.reward)).toFixed(2)}
                  </span>
                </div>
                <div className="h-1.5 bg-[#111] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: isCompleted ? '#10B981' : (network.color || '#ec4899') }} />
                </div>
              </div>

              <button onClick={() => handleWatchAd(network.id)} disabled={isCompleted}
                className={`w-full font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-widest ${
                  isCompleted ? 'bg-black text-slate-600' : 'text-white active:scale-95'}`}
                style={{ backgroundColor: isCompleted ? '' : (network.color || '#ec4899') }}>
                <Play size={16} className="fill-white" />
                Watch Ad
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
