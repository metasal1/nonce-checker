export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

const RPC_URL = "https://viviyan-bkj12u-fast-mainnet.helius-rpc.com";
const NONCE_ACCOUNT_SIZE = 80;
const SYSTEM_PROGRAM = "11111111111111111111111111111111";

interface NonceAccount {
  address: string;
  authority: string;
  nonce: string;
  lamports: number;
}

async function rpcCall(method: string, params: unknown[]) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

async function getSquadsSigners(address: string): Promise<string[]> {
  // Try to parse as Squads v4 multisig
  try {
    const info = await rpcCall("getAccountInfo", [address, { encoding: "jsonParsed" }]);
    if (!info?.value) return [address];
    
    const owner = info.value.owner;
    const data = info.value.data;
    
    // If it's a Squads multisig (owner is SQDS program), parse members
    if (owner === "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf" ||
        owner === "SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu") {
      // For Squads v4, members are stored in the account data
      // Return the address itself as a signer for now
      // Full parsing would require decoding the Squads account layout
      return [address];
    }
    
    return [address];
  } catch {
    return [address];
  }
}

async function findNonceAccounts(authority: string): Promise<NonceAccount[]> {
  // Get all nonce accounts by looking for accounts owned by System Program
  // with the specific nonce account data size (80 bytes)
  // and matching authority
  
  const results: NonceAccount[] = [];
  
  try {
    // Method 1: getProgramAccounts with memcmp filter for authority
    // Nonce account layout: 4 bytes version + 4 bytes state + 32 bytes authority + 32 bytes nonce
    // Authority starts at offset 8
    const accounts = await rpcCall("getProgramAccounts", [
      SYSTEM_PROGRAM,
      {
        encoding: "base64",
        filters: [
          { dataSize: NONCE_ACCOUNT_SIZE },
          { memcmp: { offset: 8, bytes: authority } },
        ],
      },
    ]);

    if (accounts && Array.isArray(accounts)) {
      for (const acc of accounts) {
        const data = Buffer.from(acc.account.data[0], "base64");
        // Parse nonce account
        // Version: 4 bytes, State: 4 bytes, Authority: 32 bytes, Nonce: 32 bytes
        const state = data.readUInt32LE(4);
        if (state === 1) {
          // Initialized
          const bs58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
          results.push({
            address: acc.pubkey,
            authority: authority,
            nonce: `(nonce hash at offset 40)`,
            lamports: acc.account.lamports,
          });
        }
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Error finding nonce accounts:", msg);
  }

  return results;
}

async function checkAddress(address: string) {
  // 1. Get account info
  const info = await rpcCall("getAccountInfo", [address, { encoding: "jsonParsed" }]);
  if (!info?.value) {
    throw new Error("Account not found");
  }

  const owner = info.value.owner;
  const lamports = info.value.lamports;
  const isMultisig = owner === "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf" ||
                     owner === "SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu";

  // 2. Find nonce accounts where this address is the authority
  const nonceAccounts = await findNonceAccounts(address);

  // 3. Also check if the account itself IS a nonce account
  let isNonceAccount = false;
  let nonceAuthority = "";
  if (info.value.data && Array.isArray(info.value.data) && info.value.data[1] === "base64") {
    const data = Buffer.from(info.value.data[0], "base64");
    if (data.length === NONCE_ACCOUNT_SIZE) {
      const state = data.readUInt32LE(4);
      if (state === 1) {
        isNonceAccount = true;
        // Read authority (32 bytes at offset 8) - simplified
        nonceAuthority = "(authority at offset 8)";
      }
    }
  }

  // 4. Risk assessment
  const risks: { level: "critical" | "warning" | "info"; message: string }[] = [];

  if (nonceAccounts.length > 0) {
    risks.push({
      level: "critical",
      message: `Found ${nonceAccounts.length} durable nonce account(s) with this address as authority. These allow pre-signed transactions to be submitted at any time.`,
    });
  }

  if (isMultisig && nonceAccounts.length > 0) {
    risks.push({
      level: "critical",
      message: "MULTISIG WITH NONCE: This is a Squads multisig with active durable nonces. An attacker who compromises signers can pre-sign transactions and execute them later — exactly the Drift attack vector.",
    });
  }

  if (isNonceAccount) {
    risks.push({
      level: "warning",
      message: "This address IS a durable nonce account. Check who the authority is.",
    });
  }

  if (nonceAccounts.length === 0 && !isNonceAccount) {
    risks.push({
      level: "info",
      message: "No durable nonce accounts found associated with this address.",
    });
  }

  return {
    address,
    owner,
    lamports,
    isMultisig,
    isNonceAccount,
    nonceAuthority,
    nonceAccounts,
    risks,
    checkedAt: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    if (!address || typeof address !== "string" || address.length < 32) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }
    const result = await checkAddress(address.trim());
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
