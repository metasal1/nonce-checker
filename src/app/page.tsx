"use client";

import { useState, useCallback } from "react";

function CopyAddr({ addr, className = "" }: { addr: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [addr]);
  return (
    <span
      onClick={handleCopy}
      title="Click to copy"
      className={`cursor-pointer hover:text-[#9945FF] transition-colors font-mono truncate ${className}`}
    >
      {addr}
      {copied && <span className="ml-2 text-green-400 text-xs font-sans">Copied</span>}
    </span>
  );
}
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Keypair,
  SystemProgram,
  Transaction,
  NONCE_ACCOUNT_LENGTH,
  NonceAccount,
  PublicKey,
} from "@solana/web3.js";

// ── Types for Check tab ──

interface Risk {
  level: "critical" | "warning" | "info";
  message: string;
}

interface NonceAccountInfo {
  address: string;
  authority: string;
  lamports: number;
}

interface MemberNonce {
  member: string;
  nonces: NonceAccountInfo[];
}

interface CheckResult {
  address: string;
  owner: string;
  lamports: number;
  isMultisig: boolean;
  signerCount?: number;
  isNonceAccount: boolean;
  nonceAuthority: string;
  nonceAccounts: NonceAccountInfo[];
  memberNonces: MemberNonce[];
  risks: Risk[];
  checkedAt: string;
  error?: string;
}

type Tab = "check" | "create" | "get" | "use";

// ── Get Nonce result type ──

interface NonceInfo {
  authority: string;
  nonceValue: string;
  lamports: number;
  state: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("check");

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {/* Header + Wallet */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-[#9945FF]">Nonce</span> Checker
          </h1>
          <p className="text-gray-400 text-sm">
            Scan, create &amp; manage Solana durable nonces
          </p>
        </div>
        <WalletMultiButton />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-gray-800">
        {(["check", "create", "get", "use"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold capitalize transition-colors ${
              activeTab === tab
                ? "text-[#9945FF] border-b-2 border-[#9945FF]"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "check" && <CheckTab />}
      {activeTab === "create" && <CreateTab />}
      {activeTab === "get" && <GetTab />}
      {activeTab === "use" && <UseTab />}

      <footer className="text-center mt-12 text-xs text-gray-600">
        Built by{" "}
        <a href="https://metasal.xyz" className="text-[#9945FF] hover:underline">
          metasal.xyz
        </a>
      </footer>
    </main>
  );
}

// ══════════════════════════════════════════════════
// CHECK TAB (original functionality, preserved)
// ══════════════════════════════════════════════════

function CheckTab() {
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
    <div>
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
          <div className="bg-[#141414] border border-gray-800 rounded-lg p-5 glow">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Account Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Address</span>
                <CopyAddr addr={result.address} className="text-gray-200 ml-4 max-w-[300px]" />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Owner Program</span>
                <CopyAddr addr={result.owner} className="text-gray-200 ml-4 max-w-[300px]" />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Balance</span>
                <span className="text-gray-200">{(result.lamports / 1e9).toFixed(4)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Multisig</span>
                <span className={result.isMultisig ? "text-[#9945FF] font-semibold" : "text-gray-500"}>
                  {result.isMultisig ? `Yes (Squads, ${result.signerCount} signers)` : "No"}
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

          {result.nonceAccounts.length > 0 && (
            <div className="bg-[#141414] border border-red-900 rounded-lg p-5">
              <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">
                Durable Nonce Accounts ({result.nonceAccounts.length})
              </h2>
              <div className="space-y-2">
                {result.nonceAccounts.map((nonce, i) => (
                  <div key={i} className="bg-red-500/5 border border-red-900/50 rounded p-3 text-sm font-mono">
                    <div><CopyAddr addr={nonce.address} className="text-red-300" /></div>
                    <div className="text-gray-500 text-xs mt-1">
                      {(nonce.lamports / 1e9).toFixed(4)} SOL
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.memberNonces.length > 0 && (
            <div className="bg-[#141414] border border-red-700 rounded-lg p-5 bg-red-950/20">
              <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">
                Member Nonce Accounts ({result.memberNonces.reduce((sum, m) => sum + m.nonces.length, 0)})
              </h2>
              <div className="space-y-3">
                {result.memberNonces.map((member, i) => (
                  <div key={i} className="border border-red-900/50 rounded p-3">
                    <div className="text-red-400 text-sm font-semibold mb-2">
                      Signer: {member.member.slice(0, 8)}...
                    </div>
                    <div className="space-y-2">
                      {member.nonces.map((nonce, j) => (
                        <div key={j} className="bg-red-500/5 rounded p-2 text-sm font-mono">
                          <div><CopyAddr addr={nonce.address} className="text-red-300 text-xs" /></div>
                          <div className="text-gray-500 text-xs mt-1">
                            {(nonce.lamports / 1e9).toFixed(4)} SOL
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          <div className="text-center text-xs text-gray-600 mt-6">
            Checked at {new Date(result.checkedAt).toLocaleString()}
          </div>
        </div>
      )}

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
    </div>
  );
}

// ══════════════════════════════════════════════════
// CREATE TAB
// ══════════════════════════════════════════════════

function CreateTab() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ nonceAccount: string; signature: string } | null>(null);

  const handleCreate = async () => {
    if (!publicKey) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const nonceKeypair = Keypair.generate();
      const lamports = await connection.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH);

      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: nonceKeypair.publicKey,
          lamports,
          space: NONCE_ACCOUNT_LENGTH,
          programId: SystemProgram.programId,
        }),
        SystemProgram.nonceInitialize({
          noncePubkey: nonceKeypair.publicKey,
          authorizedPubkey: publicKey,
        })
      );

      const signature = await sendTransaction(transaction, connection, {
        signers: [nonceKeypair],
      });

      await connection.confirmTransaction(signature, "confirmed");

      setResult({
        nonceAccount: nonceKeypair.publicKey.toBase58(),
        signature,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-gray-400 text-sm mb-6">
        Create a new durable nonce account on Solana mainnet. Your connected wallet will be set as the authority.
      </p>

      {!publicKey ? (
        <div className="bg-[#141414] border border-gray-800 rounded-lg p-8 text-center text-gray-500">
          Connect your wallet to create a nonce account
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#141414] border border-gray-800 rounded-lg p-5">
            <div className="flex justify-between text-sm mb-4">
              <span className="text-gray-400">Authority</span>
              <CopyAddr addr={publicKey.toBase58()} className="text-gray-200 ml-4 max-w-[300px]" />
            </div>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full bg-[#9945FF] hover:bg-[#8033e0] disabled:bg-[#9945FF]/50 disabled:cursor-wait text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              {loading ? "Creating..." : "Create Nonce"}
            </button>
          </div>

          {error && (
            <div className="border border-red-500 bg-red-500/10 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-[#141414] border border-green-900 rounded-lg p-5 glow">
              <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3">
                Nonce Created
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400 block mb-1">Nonce Account</span>
                  <span className="font-mono text-green-300 text-xs break-all">{result.nonceAccount}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Transaction Signature</span>
                  <span className="font-mono text-gray-300 text-xs break-all">{result.signature}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// GET TAB
// ══════════════════════════════════════════════════

function GetTab() {
  const { connection } = useConnection();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState<NonceInfo | null>(null);

  const handleGet = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError("");
    setInfo(null);

    try {
      const pubkey = new PublicKey(address.trim());
      const accountInfo = await connection.getAccountInfo(pubkey);

      if (!accountInfo) {
        setError("Account not found");
        return;
      }

      if (accountInfo.data.length !== NONCE_ACCOUNT_LENGTH) {
        setError("This account is not a nonce account (wrong data size)");
        return;
      }

      const nonceAccount = NonceAccount.fromAccountData(accountInfo.data);

      setInfo({
        authority: nonceAccount.authorizedPubkey.toBase58(),
        nonceValue: nonceAccount.nonce,
        lamports: accountInfo.lamports,
        state: "Initialized",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-gray-400 text-sm mb-6">
        Fetch details of an existing nonce account — authority, nonce value, balance, and state.
      </p>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGet()}
          placeholder="Enter nonce account address..."
          className="flex-1 bg-[#141414] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#9945FF] font-mono text-sm"
        />
        <button
          onClick={handleGet}
          disabled={loading}
          className="bg-[#9945FF] hover:bg-[#8033e0] disabled:bg-[#9945FF]/50 disabled:cursor-wait text-white font-semibold px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
        >
          {loading ? "Fetching..." : "Get"}
        </button>
      </div>

      {error && (
        <div className="border border-red-500 bg-red-500/10 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {info && (
        <div className="bg-[#141414] border border-gray-800 rounded-lg p-5 glow">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Nonce Account Details
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">State</span>
              <span className="text-green-400 font-semibold">{info.state}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">Authority</span>
              <span className="font-mono text-gray-200 text-xs break-all">{info.authority}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">Nonce Value (Blockhash)</span>
              <span className="font-mono text-[#9945FF] text-xs break-all">{info.nonceValue}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Balance</span>
              <span className="text-gray-200">{(info.lamports / 1e9).toFixed(4)} SOL</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// USE (ADVANCE) TAB
// ══════════════════════════════════════════════════

function UseTab() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ newNonce: string; signature: string } | null>(null);

  const handleAdvance = async () => {
    if (!publicKey || !address.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const noncePubkey = new PublicKey(address.trim());

      const transaction = new Transaction().add(
        SystemProgram.nonceAdvance({
          noncePubkey,
          authorizedPubkey: publicKey,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      // Fetch the new nonce value
      const accountInfo = await connection.getAccountInfo(noncePubkey);
      let newNonce = "(fetch failed)";
      if (accountInfo && accountInfo.data.length === NONCE_ACCOUNT_LENGTH) {
        const nonceAccount = NonceAccount.fromAccountData(accountInfo.data);
        newNonce = nonceAccount.nonce;
      }

      setResult({ newNonce, signature });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-gray-400 text-sm mb-6">
        Advance (consume) a durable nonce, generating a new nonce value.
        Only the nonce authority can do this.
      </p>

      {!publicKey ? (
        <div className="bg-[#141414] border border-gray-800 rounded-lg p-8 text-center text-gray-500">
          Connect your wallet to advance a nonce
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#141414] border border-gray-800 rounded-lg p-5">
            <div className="flex justify-between text-sm mb-4">
              <span className="text-gray-400">Authority</span>
              <CopyAddr addr={publicKey.toBase58()} className="text-gray-200 ml-4 max-w-[300px]" />
            </div>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdvance()}
              placeholder="Enter nonce account address..."
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#9945FF] font-mono text-sm mb-4"
            />
            <button
              onClick={handleAdvance}
              disabled={loading || !address.trim()}
              className="w-full bg-[#9945FF] hover:bg-[#8033e0] disabled:bg-[#9945FF]/50 disabled:cursor-wait text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              {loading ? "Advancing..." : "Advance Nonce"}
            </button>
          </div>

          {error && (
            <div className="border border-red-500 bg-red-500/10 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-[#141414] border border-green-900 rounded-lg p-5 glow">
              <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3">
                Nonce Advanced
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400 block mb-1">New Nonce Value</span>
                  <span className="font-mono text-[#9945FF] text-xs break-all">{result.newNonce}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Transaction Signature</span>
                  <span className="font-mono text-gray-300 text-xs break-all">{result.signature}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
