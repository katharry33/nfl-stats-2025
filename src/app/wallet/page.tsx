'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  Loader2, Wallet as WalletIcon,
  ArrowUpCircle, ArrowDownCircle, History, TrendingUp,
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import {
  collection, query, where, doc, serverTimestamp, onSnapshot,
  updateDoc, increment, addDoc, setDoc, getDoc,
} from 'firebase/firestore';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bet_payout' | 'bet_stake';
  amount: number;
  status: string;
  createdAt: any;
}

const FIELD = 'text-[10px] uppercase font-black text-zinc-600 tracking-[0.2em]';
const INPUT = 'w-full bg-black/40 border border-white/[0.08] text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[#FFD700]/30 [color-scheme:dark]';

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();

  const [balance,        setBalance]        = useState<number>(0);
  const [amount,         setAmount]         = useState('');
  const [isProcessing,   setIsProcessing]   = useState(false);
  const [transactions,   setTransactions]   = useState<Transaction[]>([]);
  const [walletLoading,  setWalletLoading]  = useState(true);

  // Init wallet
  useEffect(() => {
    if (!user?.uid || !db) return;
    const walletRef = doc(db, 'wallets', user.uid);
    getDoc(walletRef).then(snap => {
      if (!snap.exists()) {
        setDoc(walletRef, {
          userId: user.uid, balance: 1000.00, bonusBalance: 250.00,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
      }
    });
  }, [user?.uid]);

  // Subscribe
  useEffect(() => {
    if (!db || !user?.uid) { setWalletLoading(false); return; }
    setWalletLoading(true);
    const unsubWallet = onSnapshot(doc(db, 'wallets', user.uid),
      snap => { setBalance(snap.exists() ? snap.data().balance || 0 : 0); setWalletLoading(false); },
      () => setWalletLoading(false)
    );
    const unsubTxs = onSnapshot(
      query(collection(db, 'transactions'), where('userId', '==', user.uid)),
      snap => setTransactions(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }) as Transaction)
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      )
    );
    return () => { unsubWallet(); unsubTxs(); };
  }, [user?.uid]);

  const handleTransaction = async (type: 'deposit' | 'withdrawal') => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { toast.error('Invalid amount'); return; }
    if (type === 'withdrawal' && num > balance) { toast.error('Insufficient funds'); return; }
    if (!db || !user?.uid) { toast.error('Please sign in'); return; }
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'wallets', user.uid), {
        balance: increment(type === 'deposit' ? num : -num),
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid, type, amount: num, status: 'completed', createdAt: serverTimestamp(),
      });
      setAmount('');
      toast.success(`${type === 'deposit' ? 'Deposited' : 'Withdrawn'} $${num.toFixed(2)}`, {
        style: { background: '#0f1115', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700' },
      });
    } catch (err: any) {
      toast.error('Transaction failed', { description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading || walletLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#060606]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#FFD700] mx-auto mb-4" />
          <p className="text-zinc-600 text-xs uppercase font-mono tracking-wider">Loading wallet…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#060606]">
        <div className="bg-[#0f1115] border border-white/[0.06] rounded-3xl p-10 text-center max-w-sm">
          <WalletIcon className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
          <h2 className="text-xl font-black text-white italic uppercase mb-2">Sign In Required</h2>
          <p className="text-zinc-600 text-sm mb-6">Please sign in to access your wallet.</p>
          <button className="px-6 py-3 bg-[#FFD700] hover:bg-[#e6c200] text-black font-black text-sm uppercase rounded-2xl transition-colors">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060606] p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl flex items-center justify-center">
            <WalletIcon className="h-5 w-5 text-[#FFD700]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">My Wallet</h1>
            <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Manage funds &amp; history</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">

          {/* Left: balance + actions */}
          <div className="md:col-span-1 space-y-4">

            {/* Balance card */}
            <div className="bg-[#0f1115] border border-white/[0.06] rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <p className={FIELD}>Available Balance</p>
              </div>
              <p className="text-4xl font-black tracking-tighter text-emerald-400 font-mono">
                ${balance.toFixed(2)}
              </p>
              <p className="text-[9px] text-zinc-700 uppercase tracking-wider mt-2 font-bold">Cash balance</p>
            </div>

            {/* Fund card */}
            <div className="bg-[#0f1115] border border-white/[0.06] rounded-3xl p-5 space-y-4">
              <p className="text-white font-black text-sm italic uppercase">Fund Account</p>
              <div className="space-y-1.5">
                <label className={FIELD}>Amount ($)</label>
                <input type="number" step="0.01" placeholder="0.00" value={amount}
                  onChange={e => setAmount(e.target.value)} disabled={isProcessing}
                  className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleTransaction('deposit')}
                  disabled={isProcessing || !amount}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500
                    disabled:opacity-40 text-white text-xs font-black uppercase rounded-xl transition-colors">
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowUpCircle className="h-3.5 w-3.5" /> Deposit</>}
                </button>
                <button onClick={() => handleTransaction('withdrawal')}
                  disabled={isProcessing || !amount || balance < parseFloat(amount || '0')}
                  className="flex items-center justify-center gap-1.5 py-2.5 border border-white/[0.08]
                    hover:bg-white/[0.04] text-zinc-400 hover:text-white disabled:opacity-40
                    text-xs font-black uppercase rounded-xl transition-colors">
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowDownCircle className="h-3.5 w-3.5" /> Withdraw</>}
                </button>
              </div>
            </div>
          </div>

          {/* Right: transaction history */}
          <div className="md:col-span-2">
            <div className="bg-[#0f1115] border border-white/[0.06] rounded-3xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
                <History className="h-4 w-4 text-zinc-600" />
                <p className="text-white font-black text-sm italic uppercase">Transaction History</p>
              </div>

              {transactions.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3">
                  <History className="h-8 w-8 text-zinc-700" />
                  <p className="text-zinc-600 text-sm">No transactions yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {transactions.slice(0, 50).map(tx => {
                    const isCredit = tx.type === 'deposit' || tx.type === 'bet_payout';
                    return (
                      <div key={tx.id}
                        className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                        <div>
                          <p className="text-sm font-bold text-white capitalize">
                            {tx.type.replace('_', ' ')}
                          </p>
                          <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                            {tx.createdAt?.seconds
                              ? new Date(tx.createdAt.seconds * 1000).toLocaleString()
                              : 'Just now'}
                          </p>
                        </div>
                        <span className={`text-sm font-black font-mono ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isCredit ? '+' : '-'}${tx.amount.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}