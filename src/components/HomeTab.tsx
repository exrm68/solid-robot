import React, { useState, useEffect } from 'react';
import { Lock, Play, Clock, ShieldCheck, ExternalLink, Flame, Eye, AlertTriangle, Unlock, ArrowLeft, Maximize, Volume2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase/config';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';

// ── Ad State Type ─────────────────────────────────────────────────────────────
type AdState = {
  video: any;
  adNumber: number;
  totalAds: number;
  phase: 'watching' | 'cooldown' | 'next_ready' | 'done';
  timeLeft: number;
};

export default function HomeTab({ showToast, balance, setBalance }: any) {
  const [categories, setCategories] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [activeCategory, setActiveCategory] = useState('');
  const [unlockedVideos, setUnlockedVideos] = useState<{id: string, unlockTime: number}[]>([]);
  const [loadingVideo, setLoadingVideo] = useState<string | null>(null);
  const [unlockConfirm, setUnlockConfirm] = useState<any>(null);
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [adState, setAdState] = useState<AdState | null>(null);

  // ── Firebase load ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Categories
    const u1 = onSnapshot(collection(db, 'categories'), snap => {
      const cats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCategories(cats);
      if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0].name);
    });
    // Contents
    const u2 = onSnapshot(collection(db, 'contents'), snap => {
      setContents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    // Settings (how to unlock link, bot username etc)
    const u3 = onSnapshot(doc(db, 'settings', 'app'), snap => {
      if (snap.exists()) setSettings(snap.data());
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  // ── 24h unlock expiry ─────────────────────────────────────────────────────
  useEffect(() => {
    const now = Date.now();
    const valid = unlockedVideos.filter(v => now - v.unlockTime < 24 * 60 * 60 * 1000);
    if (valid.length !== unlockedVideos.length) setUnlockedVideos(valid);
  }, [activeCategory]);

  // ── Ad countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!adState || adState.phase === 'next_ready' || adState.phase === 'done') return;
    if (adState.timeLeft <= 0) {
      if (adState.phase === 'watching') {
        setAdState(prev => prev ? { ...prev, phase: 'cooldown', timeLeft: 5 } : null);
      } else if (adState.phase === 'cooldown') {
        if (adState.adNumber < adState.totalAds) {
          setAdState(prev => prev ? { ...prev, phase: 'next_ready' } : null);
        } else {
          doUnlock(adState.video);
        }
      }
      return;
    }
    const t = setTimeout(() => setAdState(prev => prev ? { ...prev, timeLeft: prev.timeLeft - 1 } : null), 1000);
    return () => clearTimeout(t);
  }, [adState]);

  const doUnlock = (video: any) => {
    setUnlockedVideos(prev => [...prev, { id: video.id, unlockTime: Date.now() }]);
    showToast('Unlocked! 🎉 Tap to watch.', 'success');
    setShowUnlockAnimation(true);
    setTimeout(() => {
      setShowUnlockAnimation(false);
      setAdState(null);
      setActiveVideo(video);
    }, 1500);
  };

  const handleUnlockClick = (video: any) => {
    const isUnlocked = unlockedVideos.some(v => v.id === video.id);
    if (isUnlocked) { setActiveVideo(video); return; }
    if (video.price > 0) { setUnlockConfirm(video); return; }
    const totalAds = video.adCount || 2;
    setAdState({ video, adNumber: 1, totalAds, phase: 'watching', timeLeft: 5 });
  };

  const startNextAd = () => {
    if (!adState) return;
    setAdState({ ...adState, adNumber: adState.adNumber + 1, phase: 'watching', timeLeft: 5 });
  };

  const processPaidUnlock = (video: any) => {
    setUnlockConfirm(null);
    setLoadingVideo(video.id);
    setTimeout(() => {
      if (balance >= video.price) {
        setBalance((p: number) => p - video.price);
        doUnlock(video);
      } else {
        showToast('Insufficient balance!', 'error');
      }
      setLoadingVideo(null);
    }, 1500);
  };

  const filteredContents = contents.filter(c => c.category === activeCategory);

  // ── Video Player Page ─────────────────────────────────────────────────────
  if (activeVideo) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="fixed inset-0 z-[200] bg-black text-white overflow-y-auto">
        <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setActiveVideo(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><ArrowLeft size={20} /></button>
          <h2 className="text-sm font-bold truncate flex-1">{activeVideo.title}</h2>
        </div>

        {/* Thumbnail — click করলে admin এর link এ যাবে */}
        <div className="relative w-full aspect-video bg-zinc-900 flex items-center justify-center group cursor-pointer"
          onClick={() => {
            if (activeVideo.link) {
              const tg = (window as any).Telegram?.WebApp;
              if (tg?.openLink) tg.openLink(activeVideo.link);
              else window.open(activeVideo.link, '_blank');
            }
          }}>
          <img src={activeVideo.thumbnail || activeVideo.image} alt={activeVideo.title}
            className="absolute inset-0 w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div className="w-16 h-16 bg-pink-500/80 rounded-full flex items-center justify-center backdrop-blur-md border border-pink-400/50 shadow-[0_0_30px_rgba(236,72,153,0.5)] hover:scale-110 transition-transform">
              <Play size={24} className="text-white fill-white ml-1" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Play size={20} className="text-white fill-white cursor-pointer" />
              <Volume2 size={20} className="text-white cursor-pointer" />
              <span className="text-xs font-mono">00:00 / {activeVideo.duration || '—'}</span>
            </div>
            <div className="flex items-center gap-4">
              <Settings size={20} className="text-white cursor-pointer" />
              <Maximize size={20} className="text-white cursor-pointer" />
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <h1 className="text-xl font-black leading-tight">{activeVideo.title}</h1>
          <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1"><Eye size={14} /> {activeVideo.views || '0'} Views</span>
            <span className="flex items-center gap-1"><Clock size={14} /> {activeVideo.time || 'Now'}</span>
          </div>
          {activeVideo.link && (
            <button
              onClick={() => {
                const tg = (window as any).Telegram?.WebApp;
                if (tg?.openLink) tg.openLink(activeVideo.link);
                else window.open(activeVideo.link, '_blank');
              }}
              className="w-full py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(236,72,153,0.3)] active:scale-95">
              <ExternalLink size={16} /> Open Full Content
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 pb-4 relative">

      {/* ── Ad Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {adState && adState.phase !== 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center relative overflow-hidden">

              {/* Progress dots */}
              <div className="flex gap-2 mb-5">
                {Array.from({ length: adState.totalAds }).map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i < adState.adNumber ? 'bg-pink-500 w-8' : 'bg-white/10 w-8'}`} />
                ))}
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Ad {adState.adNumber} of {adState.totalAds}</p>

              {adState.phase === 'watching' && (
                <>
                  <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center mb-5 border border-pink-500/30">
                    <Play size={32} className="text-pink-500 fill-pink-500 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Ad Playing...</h3>
                  <p className="text-sm text-slate-400 mb-6">Please wait. Do not close.</p>
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#ffffff10" strokeWidth="6" />
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#ec4899" strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (adState.timeLeft / 5)}`}
                        className="transition-all duration-1000" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-pink-500">{adState.timeLeft}</span>
                  </div>
                </>
              )}

              {adState.phase === 'cooldown' && (
                <>
                  <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mb-5 border border-orange-500/30">
                    <Clock size={32} className="text-orange-500 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Ad {adState.adNumber} Done!</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    {adState.adNumber < adState.totalAds ? 'Get ready for next ad...' : 'Almost unlocked!'}
                  </p>
                  <div className="text-5xl font-black text-orange-500">{adState.timeLeft}</div>
                  <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">cooldown</p>
                </>
              )}

              {adState.phase === 'next_ready' && (
                <>
                  <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-5 border border-blue-500/30">
                    <Play size={32} className="text-blue-400" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">{adState.totalAds - adState.adNumber} More Ad!</h3>
                  <p className="text-sm text-slate-400 mb-8">Watch {adState.totalAds - adState.adNumber} more ad{adState.totalAds - adState.adNumber > 1 ? 's' : ''} to unlock content.</p>
                  <button onClick={startNextAd}
                    className="w-full py-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-pink-500 to-purple-600 shadow-[0_0_20px_rgba(236,72,153,0.4)] active:scale-95 uppercase tracking-widest">
                    Watch Ad {adState.adNumber + 1} →
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Categories (Firebase থেকে) ─────────────────────────────────── */}
      <div className="sticky top-[64px] z-40 bg-black/90 backdrop-blur-xl py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4">
          {categories.length === 0 && (
            <p className="text-slate-600 text-xs font-bold px-2 py-1">No categories yet. Add from Admin Panel.</p>
          )}
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.name)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[11px] font-black tracking-wide uppercase transition-all ${
                activeCategory === cat.name
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                  : 'bg-[#111] text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white'}`}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── How to Unlock Banner (link admin থেকে) ─────────────────────── */}
      {settings?.howToUnlockLink && (
        <div className="px-4">
          <motion.div whileTap={{ scale: 0.98 }}
            onClick={() => {
              const tg = (window as any).Telegram?.WebApp;
              if (tg?.openLink) tg.openLink(settings.howToUnlockLink);
              else window.open(settings.howToUnlockLink, '_blank');
            }}
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-3 flex items-center justify-between shadow-[0_0_20px_rgba(79,70,229,0.2)] cursor-pointer border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
                <Play size={18} className="text-white fill-white ml-0.5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white leading-tight uppercase tracking-wide">How to Unlock?</h3>
                <p className="text-[10px] text-blue-100 font-medium mt-0.5">Watch quick tutorial video</p>
              </div>
            </div>
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md shrink-0">
              <ExternalLink size={16} className="text-white" />
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Content Feed (Firebase থেকে) ───────────────────────────────── */}
      <div className="px-4">
        {filteredContents.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-600 font-bold text-sm">No content in this category.</p>
            <p className="text-slate-700 text-xs mt-1">Add content from Admin Panel.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeCategory} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
              className="grid grid-cols-2 gap-3">
              {filteredContents.map(content => {
                const isUnlocked = unlockedVideos.some(v => v.id === content.id);
                const isLoading = loadingVideo === content.id;
                return (
                  <GridCard key={content.id} video={content} isUnlocked={isUnlocked}
                    isLoading={isLoading} onUnlock={() => handleUnlockClick(content)} />
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Unlock Animation ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showUnlockAnimation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.5, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.5, opacity: 0 }} transition={{ type: 'spring', bounce: 0.5 }}
              className="flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.6)] mb-4 border-4 border-emerald-200/20">
                <Unlock size={48} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-widest">Unlocked!</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Paid Confirm Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {unlockConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-[#111] border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4 border border-orange-500/20">
                  <AlertTriangle className="text-orange-500" size={32} />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Confirm Unlock</h3>
                <p className="text-sm text-slate-400">Unlock <span className="text-white font-bold">"{unlockConfirm.title}"</span></p>
                <div className="mt-4 bg-black/50 border border-white/5 rounded-xl py-3 px-6 inline-flex items-center gap-2">
                  <span className="text-xs text-slate-400 uppercase font-bold">Cost:</span>
                  <span className="text-xl font-black text-pink-500">৳{unlockConfirm.price}</span>
                </div>
                <div className="flex gap-3 w-full mt-6">
                  <button onClick={() => setUnlockConfirm(null)}
                    className="flex-1 py-3.5 rounded-xl bg-white/5 text-white text-xs font-black uppercase tracking-widest">Cancel</button>
                  <button onClick={() => processPaidUnlock(unlockConfirm)}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-black uppercase tracking-widest active:scale-95">Confirm</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Grid Card ─────────────────────────────────────────────────────────────────
function GridCard({ video, isUnlocked, isLoading, onUnlock }: any) {
  return (
    <div className={`group bg-[#111] rounded-2xl overflow-hidden border shadow-lg flex flex-col transition-colors ${isUnlocked ? 'border-emerald-500/30' : 'border-white/5'}`}>
      <div className="relative w-full aspect-video bg-black overflow-hidden">
        <img src={video.thumbnail || `https://picsum.photos/seed/${video.id}/600/337`}
          alt={video.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />

        {/* Badge */}
        {video.premium && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest shadow-[0_4px_10px_rgba(245,158,11,0.5)] flex items-center gap-1 z-20 border border-amber-400/50">
            <Flame size={10} className="fill-white" /> PREMIUM
          </div>
        )}

        {/* Unlocked play icon */}
        {isUnlocked && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full flex items-center justify-center pl-0.5 backdrop-blur-md border bg-emerald-500/30 border-emerald-400/40 text-emerald-400">
              <Play className="fill-current" size={16} />
            </div>
          </div>
        )}

        {/* Duration */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 text-white text-[11px] font-black px-1.5 py-0.5 rounded backdrop-blur-sm bg-black/20 z-20">{video.duration}</div>
        )}
      </div>

      <div className="p-2.5 flex flex-col flex-1 justify-between">
        <div>
          <h4 className="text-[11px] font-bold text-white leading-snug line-clamp-2 mb-1.5">{video.title}</h4>
          <div className="flex items-center justify-between text-[9px] text-slate-400 mb-2">
            <span className="flex items-center gap-1"><Eye size={10} /> {video.views || '0'}</span>
            <span className="flex items-center gap-1 text-pink-500"><Lock size={10} /> {video.unlockedCount || '0'}</span>
          </div>
        </div>

        {/* Action Button */}
        {isUnlocked ? (
          <button onClick={onUnlock}
            className="w-full py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all">
            <Play size={10} className="fill-current" /> PLAY NOW
          </button>
        ) : (
          <button onClick={onUnlock} disabled={isLoading}
            className={`w-full py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
              isLoading ? 'bg-white/10 text-slate-400 cursor-not-allowed'
                : video.price > 0
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]'}`}>
            {isLoading
              ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : video.price > 0
                ? <><Lock size={10} /> PAY ৳{video.price}</>
                : <><Lock size={10} /> WATCH {video.adCount || 2} ADS</>}
          </button>
        )}
      </div>
    </div>
  );
}
