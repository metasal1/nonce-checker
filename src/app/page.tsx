"use client";

import { useState } from "react";

interface Risk {
  level: "critical" | "warning" | "info";
  message: string;
}

interface NonceAccount {
  address: string;
  authority: string;
  lamports: number;
}

interface CheckResult {
  address: string;
  owner: string;
  lamports: number;
  isMultisig: boolean;
  isNonceAccount: boolean;
  nonceAuthority: string;
  nonceAccounts: NonceAccount[];
  risks: Risk[];
  checkedAt: string;
  error?: string;
}

export default function Home() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to connect to API");
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (level: string) => {
    switch (level) {
      case "critical": return "border-red-500 bg-red-500/10 text-red-400";
      case "warning": return "border-yellow-500 bg-yellow-500/10 text-yellow-400";
      default: return "border-green-500 bg-green-500/10 text-green-400";
    }
  };

  const riskIcon = (level: string) => {
    switch (level) {
      case "critical": return "!!!";
      case "warning": return "!!";
      default: return "OK";
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3">
          <span className="text-[#9945FF]">Nonce</span> Checker
        </h1>
        <p className="text-gray-400 text-lg">
          Scan Solana addresses for durable nonce attack vectors
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Inspired by the Drift exploit — detect suspicious nonce assignments on multisigs
        </p>
      </div>

      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          placeholder="Enter Solana address or multisig..."
          className="flex-1 bg-[#141414] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#9945FF] font-mono text-sm"
        />
        <button
          onClick={handleCheck}
          disabled={loading}
          className="bg-[#9945FF] hover:bg-[#8033e0] disabled:bg-[#9945FF]/50 disabled:cursor-wait text-white font-semibold px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
        >
          {loading ? "Scanning..." : "Check"}
        </button>
      </div>

      {error && (
        <div className="border border-red-500 bg-red-500/10 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Account Info */}
          <div className="bg-[#141414] border border-gray-800 rounded-lg p-5 glow">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Account Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Address</span>
                <span className="font-mono text-gray-200 truncate ml-4 max-w-[300px]">{result.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Owner Program</span>
                <span className="font-mono text-gray-200 truncate ml-4 max-w-[300px]">{result.owner}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Balance</span>
                <span className="text-gray-200">{(result.lamports / 1e9).toFixed(4)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Multisig</span>
                <span className={result.isMultisig ? "text-[#9945FF] font-semibold" : "text-gray-500"}>
                  {result.isMultisig ? "Yes (Squads)" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Is Nonce Account</span>
                <span className={result.isNonceAccount ? "text-yellow-400 font-semibold" : "text-gray-500"}>
                  {result.isNonceAccount ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          {/* Nonce Accounts Found */}
          {result.nonceAccounts.length > 0 && (
            <div className="bg-[#141414] border border-red-900 rounded-lg p-5">
              <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">
                Durable Nonce Accounts ({result.nonceAccounts.length})
              </h2>
              <div className="space-y-2">
                {result.nonceAccounts.map((nonce, i) => (
                  <div key={i} className="bg-red-500/5 border border-red-900/50 rounded p-3 text-sm font-mono">
                    <div className="text-red-300 truncate">{nonce.address}</div>
                    <div className="text-gray-500 text-xs mt-1">
                      {(nonce.lamports / 1e9).toFixed(4)} SOL
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Assessment */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Risk Assessment</h2>
            {result.risks.map((risk, i) => (
              <div key={i} className={`border rounded-lg p-4 ${riskColor(risk.level)}`}>
                <div className="flex items-start gap-3">
                  <span className="font-mono font-bold text-xs mt-0.5 shrink-0">
                    [{riskIcon(risk.level)}]
                  </span>
                  <span className="text-sm">{risk.message}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Timestamp */}
          <div className="text-center text-xs text-gray-600 mt-6">
            Checked at {new Date(result.checkedAt).toLocaleString()}
          </div>
        </div>
      )}

      {/* Context Box */}
      <div className="mt-12 bg-[#141414] border border-gray-800 rounded-lg p-5 text-sm text-gray-400">
        <h3 className="font-semibold text-gray-300 mb-2">What is a durable nonce attack?</h3>
        <p className="mb-2">
          Durable nonces on Solana allow transactions to be signed now and submitted later — 
          they don&apos;t expire like regular transactions (which have ~60 second blockhash windows).
        </p>
        <p className="mb-2">
          If an attacker compromises multisig signers, they can pre-sign transactions using durable nonces 
          and execute them at any time. The nonce assignment to a multisig signer should be an immediate red flag.
        </p>
        <p className="text-gray-500">
          This tool checks if a given address has any durable nonce accounts where it is the authority, 
          which could indicate a potential attack vector — especially for multisig wallets.
        </p>
      </div>

      <footer className="text-center mt-8 text-xs text-gray-600">
        Built by <a href="https://metasal.xyz" className="text-[#9945FF] hover:underline">metasal.xyz</a>
      </footer>
    </main>
  );
}
