import React, { useState, useEffect } from 'react';
import { CheckCircle2, Wallet, X, Loader2, Zap, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase/config';
import { collection, onSnapshot, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';

export default function TasksTab({ balance, setBalance, showToast, walletInfo, navigateToWallet }: any) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);

  // Telegram user ID
  const tgUserId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id || 'guest';

  useEffect(() => {
    // Tasks from Firebase (admin এ add করা)
    const u1 = onSnapshot(collection(db, 'tasks'), snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // User এর completed tasks load
    const loadCompleted = async () => {
      const userRef = doc(db, 'users', String(tgUserId));
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setCompletedIds(snap.data().completedTasks || []);
      }
    };
    loadCompleted();

    return () => u1();
  }, []);

  const completedCount = tasks.filter(t => completedIds.includes(t.id)).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const handleTaskAction = async (task: any) => {
    if (!walletInfo) { setShowWalletPrompt(true); return; }
    if (completedIds.includes(task.id)) return;

    // Task link এ পাঠাও
    if (task.link) {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.openTelegramLink && task.link.includes('t.me')) {
        tg.openTelegramLink(task.link);
      } else if (tg?.openLink) {
        tg.openLink(task.link);
      } else {
        window.open(task.link, '_blank');
      }
    }

    // 3 sec পরে claim করতে দেবে
    showToast('Complete the task then tap Claim!', 'info');
    setClaimingId(task.id + '_pending');
    setTimeout(() => setClaimingId(task.id + '_ready'), 3000);
  };

  const claimTask = async (task: any) => {
    setClaimingId(task.id + '_claiming');
    try {
      const userRef = doc(db, 'users', String(tgUserId));
      const snap = await getDoc(userRef);
      const current = snap.exists() ? snap.data().completedTasks || [] : [];
      await updateDoc(userRef, { completedTasks: [...current, task.id] });
      setCompletedIds(prev => [...prev, task.id]);
      setBalance((p: number) => p + task.reward);
      showToast(`Task done! Earned ৳${task.reward.toFixed(2)} 🎉`, 'success');
    } catch {
      showToast('Error claiming task. Try again.', 'error');
    }
    setClaimingId(null);
  };

  return (
    <div className="space-y-6 px-4 pt-4 pb-24">

      {/* Wallet Prompt */}
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
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">Set up your wallet first.</p>
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

      {/* Header & Progress */}
      <div className="bg-[#111] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-5">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2 uppercase tracking-tight">
                Missions <Target className="text-pink-500" size={24} />
              </h2>
              <p className="text-xs text-slate-400 mt-1">Complete tasks to earn rewards</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-pink-500">{completedCount}/{tasks.length}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Completed</p>
            </div>
          </div>
          <div className="h-2 bg-black rounded-full overflow-hidden border border-white/5">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full" />
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600 font-bold">No tasks yet. Admin এ add করো।</p>
          </div>
        )}
        {tasks.map((task, index) => {
          const isCompleted = completedIds.includes(task.id);
          const isPending = claimingId === task.id + '_pending';
          const isReady = claimingId === task.id + '_ready';
          const isClaiming = claimingId === task.id + '_claiming';

          return (
            <motion.div key={task.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`relative overflow-hidden border rounded-2xl p-4 flex items-center gap-4 transition-all ${
                isCompleted ? 'bg-[#111]/50 border-white/5 opacity-60' : 'bg-[#111] border-white/10 hover:border-pink-500/30 shadow-lg'}`}>

              {isCompleted && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
                  <div className="bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-2 font-bold text-xs uppercase">
                    <CheckCircle2 size={14} /> Completed
                  </div>
                </div>
              )}

              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-black border border-white/5 text-2xl">
                {task.icon || '📢'}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-black text-white text-sm truncate tracking-wide">{task.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-emerald-500 font-black text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">৳{Number(task.reward).toFixed(2)}</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase">{task.type}</span>
                </div>
              </div>

              {/* Button */}
              {isCompleted ? (
                <div className="shrink-0 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase">DONE</div>
              ) : isReady ? (
                <button onClick={() => claimTask(task)}
                  className="shrink-0 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-gradient-to-r from-emerald-500 to-teal-500 text-white active:scale-95">
                  <CheckCircle2 size={12} className="inline mr-1" /> CLAIM
                </button>
              ) : isClaiming || isPending ? (
                <div className="shrink-0 px-3 py-2 rounded-xl bg-pink-500/20 text-pink-400 text-[10px] font-black flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> {isPending ? 'WAIT...' : 'CLAIMING'}
                </div>
              ) : (
                <button onClick={() => handleTaskAction(task)}
                  className="shrink-0 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white text-black hover:bg-zinc-200 active:scale-95 flex items-center gap-1.5">
                  <Zap size={12} className="fill-current" /> START
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
