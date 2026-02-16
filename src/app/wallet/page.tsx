'use client';

import React, { useState, useEffect } from "react";
// Using relative paths to ensure build succeeds
import { PageHeader } from "../../components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useFirestore, useAuth } from "@/lib/firebase/provider"; 
import { toast } from "sonner";
import { Loader2, Wallet, ArrowUpCircle, ArrowDownCircle, History } from "lucide-react";
import { collection, query, where, doc, serverTimestamp, onSnapshot, updateDoc, increment, addDoc } from "firebase/firestore";

// Move this OUTSIDE the component to ensure it's globally available in the file
interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bet_payout' | 'bet_stake';
  amount: number;
  status: string;
  createdAt: any;
}

export default function WalletPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const { user } = useAuth();
  const userId = user?.uid;
  
  useEffect(() => {
    if (!firestore || !userId) {
        if (!userId) setLoading(false);
        return;
    }

    const walletRef = doc(firestore, "wallets", userId);
    const unsubscribeWallet = onSnapshot(walletRef, (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().balance || 0);
      }
      setLoading(false);
    });

    const q = query(collection(firestore, "transactions"), where("userId", "==", userId));
    const unsubscribeTxs = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(txs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });

    return () => {
      unsubscribeWallet();
      unsubscribeTxs();
    };
  }, [firestore, userId]);

  const handleTransaction = async (type: 'deposit' | 'withdrawal') => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    if (!firestore || !userId) return;
    setIsProcessing(true);

    try {
      const walletRef = doc(firestore, "wallets", userId);
      await updateDoc(walletRef, {
        balance: increment(type === 'deposit' ? numAmount : -numAmount),
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(firestore, "transactions"), {
        userId,
        type,
        amount: numAmount,
        status: 'completed',
        createdAt: serverTimestamp()
      });

      setAmount("");
      toast.success(`${type === 'deposit' ? 'Deposited' : 'Withdrawn'} $${numAmount}`);
    } catch (error: any) {
      toast.error("Transaction failed", { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Wallet" description="Manage your funds and view transaction history." />
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Balance</CardTitle>
              <CardDescription>Your available funds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold tracking-tighter">
                ${balance.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Fund Your Account</CardTitle>
              <CardDescription>Deposit or withdraw funds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  placeholder="e.g., 50.00" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  disabled={isProcessing}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => handleTransaction('deposit')} 
                  disabled={isProcessing || !amount}
                >
                  <ArrowUpCircle className="mr-2 h-4 w-4" /> Deposit
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleTransaction('withdrawal')} 
                  disabled={isProcessing || !amount || balance < parseFloat(amount)}
                >
                  <ArrowDownCircle className="mr-2 h-4 w-4" /> Withdraw
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Your last 50 transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold capitalize">{tx.type.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(tx.createdAt?.seconds * 1000).toLocaleString()}
                        </p>
                      </div>
                      <div className={`font-semibold ${tx.type === 'deposit' || tx.type === 'bet_payout' ? 'text-green-500' : 'text-red-500'}`}>
                        ${tx.amount.toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <History className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-sm text-gray-500">No transactions yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}