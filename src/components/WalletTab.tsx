import React, { useState } from 'react';
import { Send, CreditCard, Coins, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, Shield, Wallet, Edit2, AlertCircle, Sparkles, ChevronRight, Wifi, Activity } from 'lucide-react';
import { motion } from 'motion/react';

const TRANSACTIONS = [
  { id: 1, title: 'Ad Reward (ADSGRAM)', type: 'credit', amount: '+৳3.00', date: 'Today, 10:23 AM', status: 'completed' },
  { id: 2, title: 'Task: Join Channel', type: 'credit', amount: '+৳2.00', date: 'Yesterday, 14:05', status: 'completed' },
  { id: 3, title: 'Withdrawal (bKash)', type: 'debit', amount: '-৳500.00', date: '12 Mar 2026', status: 'pending' },
];

const METHODS = [
  { id: 'bkash', name: 'bKash', logo: 'https://freelogopng.com/images/all_img/1656234841bkash-icon-png.png', color: '#E2136E' },
  { id: 'nagad', name: 'Nagad', logo: 'https://freelogopng.com/images/all_img/1679248787Nagad-Logo.png', color: '#ED1C24' },
  { id: 'usdt', name: 'USDT', logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png', color: '#26A17B', invert: true }
];

export default function WalletTab({ balance, showToast, walletInfo, setWalletInfo }: any) {
  const withdrawLimit = 1500;
  const progress = Math.min((balance / withdrawLimit) * 100, 100);
  
  const [setupType, setSetupType] = useState<'bkash' | 'nagad' | 'usdt'>('bkash');
  const [setupAddress, setSetupAddress] = useState('');
  
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const handleSaveWallet = () => {
    if (!setupAddress || setupAddress.length < 5) {
      showToast('Please enter a valid wallet address/number', 'error');
      return;
    }
    setWalletInfo({ type: setupType, address: setupAddress });
    showToast('Wallet saved successfully!', 'success');
  };

  const handleWithdraw = () => {
    if (balance < withdrawLimit) return;
    if (!withdrawAmount || Number(withdrawAmount) < withdrawLimit) {
      showToast(`Minimum withdrawal is ৳${withdrawLimit}`, 'error');
      return;
    }
    if (Number(withdrawAmount) > balance) {
      showToast('Insufficient balance', 'error');
      return;
    }
    showToast('Withdrawal request submitted!', 'success');
    setWithdrawAmount('');
  };

  const getExchangeRate = () => {
    if (walletInfo?.type === 'usdt') {
      const usdtAmount = (Number(withdrawAmount || 0) / 122).toFixed(2);
      return `≈ $${usdtAmount} USDT (Rate: 1$ = ৳122)`;
    }
    return null;
  };

  return (
    <div className="space-y-6 px-4 pt-4 pb-24">
      
      {/* Hyper-Realistic Physical Card */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, rotateX: 10 }}
        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
        className="relative w-full aspect-[1.586/1] rounded-3xl p-6 flex flex-col justify-between overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] group perspective-1000"
      >
        {/* Card Background & Texture */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1c1c1e] via-[#000000] to-[#111111] z-0"></div>
        
        {/* Animated Glows */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-[60px] group-hover:bg-emerald-500/30 transition-colors duration-700 z-0"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/20 rounded-full blur-[60px] group-hover:bg-blue-600/30 transition-colors duration-700 z-0"></div>
        
        {/* Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        
        {/* Card Border Highlight */}
        <div className="absolute inset-0 rounded-3xl border border-white/10 z-20 pointer-events-none"></div>
        <div className="absolute inset-0 rounded-3xl border border-t-white/20 border-l-white/20 border-b-transparent border-r-transparent z-20 pointer-events-none mix-blend-overlay"></div>

        {/* Top Row: Chip & NFC */}
        <div className="relative z-10 flex justify-between items-center">
          <div className="w-11 h-8 rounded-md bg-gradient-to-br from-[#e6c27a] via-[#d4af37] to-[#aa7c11] border border-[#f9e596]/40 flex flex-col justify-evenly p-1 shadow-inner overflow-hidden">
            <div className="w-full h-[1px] bg-black/30"></div>
            <div className="w-full h-[1px] bg-black/30"></div>
            <div className="w-full h-[1px] bg-black/30"></div>
            {/* Vertical lines for chip detail */}
            <div className="absolute top-0 bottom-0 left-1/3 w-[1px] bg-black/20"></div>
            <div className="absolute top-0 bottom-0 right-1/3 w-[1px] bg-black/20"></div>
          </div>
          <Wifi className="rotate-90 text-white/40" size={26} strokeWidth={2.5} />
        </div>

        {/* Middle Row: Balance */}
        <div className="relative z-10 mt-auto mb-6">
          <p className="text-white/50 text-[10px] uppercase tracking-[0.2em] mb-1.5 font-semibold">Total Balance</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl text-white/60 font-medium">৳</span>
            <h2 className="text-4xl font-black text-white tracking-tight drop-shadow-md">{balance.toFixed(2)}</h2>
          </div>
        </div>

        {/* Bottom Row: Details & Logo */}
        <div className="relative z-10 flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-white/40 text-sm font-mono tracking-widest drop-shadow-sm">**** **** **** 2026</p>
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Desi Hub Member</p>
          </div>
          {/* Faux Mastercard/Visa style logo */}
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-red-500/80 mix-blend-screen"></div>
            <div className="w-6 h-6 rounded-full bg-yellow-500/80 -ml-3 mix-blend-screen"></div>
          </div>
        </div>
      </motion.div>

      {/* Goal Progress Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#111111] border border-white/5 rounded-2xl p-4 shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        <div className="flex justify-between items-end mb-3">
          <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <Activity size={14} className="text-emerald-400" />
            Withdrawal Goal
          </span>
          <span className="text-sm font-black text-white">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 w-full bg-black rounded-full overflow-hidden border border-white/5 shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full relative"
          >
            <div className="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_2s_infinite] -skew-x-12 translate-x-[-100%]"></div>
          </motion.div>
        </div>
        <div className="flex justify-between text-[10px] text-zinc-500 mt-2.5 font-bold uppercase tracking-wider">
          <span>Min: ৳{withdrawLimit}</span>
          <span>Max: ৳25,000</span>
        </div>
      </motion.div>

      {/* Wallet Action Area */}
      {!walletInfo ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#111111] border border-white/5 rounded-3xl p-5 space-y-6 shadow-xl relative"
        >
          <div className="text-center space-y-1.5">
            <h3 className="text-lg font-black text-white tracking-tight">Link Payment Method</h3>
            <p className="text-[11px] text-zinc-400 font-medium">Select where you want to receive your earnings</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {METHODS.map((method) => (
              <button 
                key={method.id}
                onClick={() => setSetupType(method.id as any)}
                className={`relative p-3.5 rounded-2xl border flex flex-col items-center gap-2.5 transition-all duration-300 ${
                  setupType === method.id 
                    ? 'bg-white/10 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)] scale-[1.02]' 
                    : 'bg-black border-white/5 hover:bg-white/5'
                }`}
              >
                {setupType === method.id && (
                  <motion.div layoutId="activeMethodBorder" className="absolute inset-0 rounded-2xl border border-white/30 pointer-events-none" />
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner overflow-hidden p-1.5 ${method.invert ? 'bg-[#26A17B]' : 'bg-white'}`}>
                  <img src={method.logo} alt={method.name} className={`w-full h-full object-contain ${method.invert ? 'brightness-0 invert' : ''}`} referrerPolicy="no-referrer" />
                </div>
                <span className={`text-[11px] font-bold ${setupType === method.id ? 'text-white' : 'text-zinc-500'}`}>{method.name}</span>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-focus-within:bg-white/10 transition-colors">
                <CreditCard className="text-zinc-400 group-focus-within:text-white transition-colors" size={16} />
              </div>
              <input 
                type="text" 
                value={setupAddress}
                onChange={(e) => setSetupAddress(e.target.value)}
                placeholder={setupType === 'usdt' ? "Enter USDT (TRC20) Address" : `Enter ${setupType === 'bkash' ? 'bKash' : 'Nagad'} Number`} 
                className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-sm text-white font-medium placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-all shadow-inner"
              />
            </div>

            <button 
              onClick={handleSaveWallet}
              className="w-full bg-white text-black hover:bg-zinc-200 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]"
            >
              Connect Wallet
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#111111] border border-white/5 rounded-3xl p-5 space-y-6 shadow-xl relative"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white tracking-tight">Withdraw Funds</h3>
            <button 
              onClick={() => setWalletInfo(null)}
              className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 bg-black border border-white/10 px-3 py-1.5 rounded-full transition-colors"
            >
              <Edit2 size={12} /> Change Method
            </button>
          </div>

          {/* Active Wallet Display */}
          <div className="bg-black border border-white/5 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            {METHODS.map(m => m.id === walletInfo.type && (
              <div key={m.id} className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 overflow-hidden p-2 ${m.invert ? 'bg-[#26A17B]' : 'bg-white'}`}>
                <img src={m.logo} alt={m.name} className={`w-full h-full object-contain ${m.invert ? 'brightness-0 invert' : ''}`} referrerPolicy="no-referrer" />
              </div>
            ))}
            <div className="overflow-hidden relative z-10">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                {walletInfo.type === 'usdt' ? 'USDT (TRC20)' : walletInfo.type.toUpperCase()} ACCOUNT
              </p>
              <p className="text-sm font-black text-white truncate tracking-wide">{walletInfo.address}</p>
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-3">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-focus-within:bg-white/10 transition-colors">
                <span className="text-zinc-400 font-bold group-focus-within:text-white transition-colors">৳</span>
              </div>
              <input 
                type="number" 
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00" 
                className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-14 pr-24 text-lg font-black text-white placeholder:text-zinc-700 focus:outline-none focus:border-white/30 transition-all shadow-inner"
              />
              <button 
                onClick={() => setWithdrawAmount(balance.toString())}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black bg-white text-black px-3 py-2 rounded-xl hover:bg-zinc-200 transition-colors uppercase tracking-wider shadow-sm"
              >
                Max
              </button>
            </div>
            
            {getExchangeRate() && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 text-[11px] font-bold text-[#26A17B] bg-[#26A17B]/10 px-4 py-3 rounded-xl border border-[#26A17B]/20">
                <AlertCircle size={14} />
                {getExchangeRate()}
              </motion.div>
            )}
          </div>

          <button 
            onClick={handleWithdraw}
            disabled={balance < withdrawLimit}
            className={`w-full font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 ${
              balance >= withdrawLimit 
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-zinc-200 active:scale-[0.98]' 
                : 'bg-black text-zinc-600 cursor-not-allowed border border-white/5'
            }`}
          >
            {balance >= withdrawLimit ? (
              <>Confirm Withdrawal <ChevronRight size={16} /></>
            ) : (
              `Need ৳${(withdrawLimit - balance).toFixed(2)} more`
            )}
          </button>
        </motion.div>
      )}

      {/* Recent Transactions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="pt-2"
      >
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-sm font-black text-white tracking-tight">Recent Activity</h3>
          <button className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-wider transition-colors">View All</button>
        </div>
        <div className="space-y-2.5">
          {TRANSACTIONS.map((tx, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + (i * 0.1) }}
              key={tx.id} 
              className="group bg-[#111111] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between hover:bg-white/5 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-105 ${
                  tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                }`}>
                  {tx.type === 'credit' ? <ArrowDownLeft size={18} strokeWidth={2.5} /> : <ArrowUpRight size={18} strokeWidth={2.5} />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-0.5">{tx.title}</h4>
                  <p className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5">
                    {tx.status === 'pending' ? <Clock size={12} className="text-orange-400" /> : <CheckCircle2 size={12} className="text-emerald-400" />}
                    {tx.date}
                  </p>
                </div>
              </div>
              <div className={`text-sm font-black tracking-tight ${tx.type === 'credit' ? 'text-emerald-400' : 'text-white'}`}>
                {tx.amount}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
