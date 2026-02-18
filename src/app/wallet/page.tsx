'use client';

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, Wallet as WalletIcon, ArrowUpCircle, ArrowDownCircle, History } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { collection, query, where, doc, serverTimestamp, onSnapshot, updateDoc, increment, addDoc, setDoc, getDoc } from "firebase/firestore";

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bet_payout' | 'bet_stake';
  amount: number;
  status: string;
  createdAt: any;
}

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletLoading, setWalletLoading] = useState(true);

  // Initialize wallet if it doesn't exist
  useEffect(() => {
    const initializeWallet = async () => {
      if (!user?.uid || !db) return;
      
      try {
        const walletRef = doc(db, "wallets", user.uid);
        const walletSnap = await getDoc(walletRef);
        
        if (!walletSnap.exists()) {
          // Create wallet with initial balance
          await setDoc(walletRef, {
            userId: user.uid,
            balance: 1000.00, // Starting balance
            bonusBalance: 250.00, // Starting bonus
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log('Wallet initialized for user:', user.uid);
        }
      } catch (error) {
        console.error('Error initializing wallet:', error);
      }
    };

    initializeWallet();
  }, [user?.uid]);

  // Subscribe to wallet and transactions
  useEffect(() => {
    if (!db || !user?.uid) {
      setWalletLoading(false);
      return;
    }

    setWalletLoading(true);

    try {
      // Subscribe to wallet
      const walletRef = doc(db, "wallets", user.uid);
      const unsubscribeWallet = onSnapshot(
        walletRef, 
        (docSnap) => {
          if (docSnap.exists()) {
            setBalance(docSnap.data().balance || 0);
          } else {
            setBalance(0);
          }
          setWalletLoading(false);
        },
        (error) => {
          console.error('Wallet subscription error:', error);
          setWalletLoading(false);
        }
      );

      // Subscribe to transactions
      const q = query(
        collection(db, "transactions"), 
        where("userId", "==", user.uid)
      );
      
      const unsubscribeTxs = onSnapshot(
        q, 
        (snapshot) => {
          const txs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          })) as Transaction[];
          
          setTransactions(
            txs.sort((a, b) => 
              (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
            )
          );
        },
        (error) => {
          console.error('Transactions subscription error:', error);
        }
      );

      return () => {
        unsubscribeWallet();
        unsubscribeTxs();
      };
    } catch (error) {
      console.error('Subscription setup error:', error);
      setWalletLoading(false);
    }
  }, [user?.uid]);

  const handleTransaction = async (type: 'deposit' | 'withdrawal') => {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    if (type === 'withdrawal' && numAmount > balance) {
      toast.error("Insufficient funds");
      return;
    }

    if (!db || !user?.uid) {
      toast.error("Please sign in to make transactions");
      return;
    }

    setIsProcessing(true);

    try {
      const walletRef = doc(db, "wallets", user.uid);
      
      // Update balance
      await updateDoc(walletRef, {
        balance: increment(type === 'deposit' ? numAmount : -numAmount),
        updatedAt: serverTimestamp()
      });

      // Record transaction
      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type,
        amount: numAmount,
        status: 'completed',
        createdAt: serverTimestamp()
      });

      setAmount("");
      toast.success(`${type === 'deposit' ? 'Deposited' : 'Withdrawn'} $${numAmount.toFixed(2)}`);
    } catch (error: any) {
      console.error('Transaction error:', error);
      toast.error("Transaction failed", { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state
  if (authLoading || walletLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading wallet...</p>
        </div>
      </div>
    );
  }

  // Not authenticated state
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <Card className="bg-slate-900 border-slate-800 max-w-md">
          <CardContent className="pt-6 text-center">
            <WalletIcon className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Sign In Required</h2>
            <p className="text-slate-400 mb-4">Please sign in to access your wallet</p>
            <Button className="bg-emerald-600 hover:bg-emerald-500">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-white tracking-tighter italic">MY WALLET</h1>
          <p className="text-slate-500 text-sm">Manage your funds and view transaction history</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Balance & Actions */}
          <div className="md:col-span-1 space-y-6">
            {/* Balance Card */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <WalletIcon className="h-5 w-5 text-emerald-500" />
                  Current Balance
                </CardTitle>
                <CardDescription className="text-slate-400">Your available funds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold tracking-tighter text-emerald-400">
                  ${balance.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            {/* Transaction Card */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Fund Your Account</CardTitle>
                <CardDescription className="text-slate-400">Deposit or withdraw funds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-slate-300">Amount</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    step="0.01"
                    placeholder="e.g., 50.00" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    disabled={isProcessing}
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => handleTransaction('deposit')} 
                    disabled={isProcessing || !amount}
                    className="bg-emerald-600 hover:bg-emerald-500"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ArrowUpCircle className="mr-2 h-4 w-4" /> Deposit
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleTransaction('withdrawal')} 
                    disabled={isProcessing || !amount || balance < parseFloat(amount || '0')}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ArrowDownCircle className="mr-2 h-4 w-4" /> Withdraw
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Transaction History */}
          <div className="md:col-span-2">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Transaction History</CardTitle>
                <CardDescription className="text-slate-400">Your recent transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.length > 0 ? (
                    transactions.slice(0, 50).map((tx) => (
                      <div 
                        key={tx.id} 
                        className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800"
                      >
                        <div>
                          <p className="font-semibold capitalize text-white">
                            {tx.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-slate-500">
                            {tx.createdAt?.seconds 
                              ? new Date(tx.createdAt.seconds * 1000).toLocaleString()
                              : 'Just now'}
                          </p>
                        </div>
                        <div className={`font-bold ${
                          tx.type === 'deposit' || tx.type === 'bet_payout' 
                            ? 'text-emerald-400' 
                            : 'text-red-400'
                        }`}>
                          {tx.type === 'deposit' || tx.type === 'bet_payout' ? '+' : '-'}
                          ${tx.amount.toFixed(2)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <History className="mx-auto h-12 w-12 text-slate-700" />
                      <p className="mt-4 text-sm text-slate-500">No transactions yet.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}