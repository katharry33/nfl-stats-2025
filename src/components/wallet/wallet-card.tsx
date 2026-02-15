'use client';

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export function WalletCard() {
  const { user, loading } = useAuth();

  // Dummy data for wallet
  const wallet = {
    balance: 1000,
    currency: "USD",
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">Loading wallet...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet</CardTitle>
      </CardHeader>
      <CardContent>
        {user ? (
          <div>
            <p className="text-2xl font-bold">{wallet.balance} {wallet.currency}</p>
            <p className="text-sm text-gray-500">
              Welcome, {user.email ?? "Anonymous Guru"}
            </p>
          </div>
        ) : (
          <p>Please sign in to view your wallet.</p>
        )}
      </CardContent>
    </Card>
  );
}