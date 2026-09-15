"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useAccount,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { parseUnits, type Address } from "viem";
import {
  useCreatePaymentLink,
  useSupportedToken,
  useTokenMeta,
} from "@/hooks/usePayClick";
import {
  PAYCLICK_ADDRESS,
  USDT_ADDRESS,
  activeChain,
  explorerTxUrl,
} from "@/lib/config";
import { shortError, shareUrl } from "@/lib/utils";

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { create, isPending } = useCreatePaymentLink();

  const [token, setToken] = useState<Address>(USDT_ADDRESS);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [expiry, setExpiry] = useState("");
  const [created, setCreated] = useState<{ id: string; url: string; tx: string } | null>(null);
  const [error, setError] = useState("");

  const { symbol, decimals } = useTokenMeta(token);
  const { data: isSupported } = useSupportedToken(token);

  async function handleCreate() {
    setError("");
    setCreated(null);
    if (!PAYCLICK_ADDRESS) return;
    if (!isConnected || !address) return setError("Connect your wallet first.");
    if (chainId !== activeChain.id) {
      try {
        await switchChainAsync({ chainId: activeChain.id });
      } catch (e) {
        return setError(shortError(e instanceof Error ? e : new Error(String(e))));
      }
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError("Enter a valid amount.");
    if (isSupported === false) return setError("This token is not supported by the contract.");

    let expiryTs = 0n;
    if (expiry) {
      const ts = BigInt(Math.floor(new Date(expiry).getTime() / 1000));
      if (ts <= BigInt(Math.floor(Date.now() / 1000))) return setError("Expiry must be in the future.");
      expiryTs = ts;
    }

    try {
      const parsed = parseUnits(amount, decimals ?? 6);
      const { hash, linkId } = await create({
        token,
        amount: parsed,
        memo,
        expiry: expiryTs,
      });
      setCreated({ id: linkId.toString(), url: shareUrl(`/pay/${linkId}`), tx: hash });
    } catch (e) {
      setError(shortError(e instanceof Error ? e : new Error(String(e))));
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mb-12 text-center pt-10">
        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-brand/10 px-4 py-2">
          <span className="text-sm font-medium text-brand">✨ No account required</span>
        </div>
        <h1 className="text-5xl font-bold text-white tracking-tight">
          Get paid in stablecoins,
          <br />
          <span className="bg-linear-to-r from-brand to-purple-400 bg-clip-text text-transparent">
            one click.
          </span>
        </h1>
        <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto">
          Generate a payment link on BOT Chain. Your client pays in USDT.
          You keep 99%. No middleman, no backend.
        </p>
      </div>

      {created && (
        <div className="card mb-8 border border-brand/30 bg-linear-to-br from-brand/5 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20">
              <span className="text-lg">🎉</span>
            </div>
            <p className="text-sm font-semibold text-brand">Payment link created</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-black/30 px-4 py-3 text-sm font-mono text-slate-300">
              {window.location.origin + created.url}
            </code>
            <button
              className="btn-brand px-4 py-3 text-sm"
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}${created.url}`)}
            >
              Copy
            </button>
          </div>
          <div className="mt-4 flex gap-4 text-sm">
            <Link href={`/pay/${created.id}`} className="text-brand hover:underline font-medium">
              Preview payment page →
            </Link>
            <a href={explorerTxUrl(activeChain.id, created.tx)} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white">
              View on BOTScan ↗
            </a>
          </div>
        </div>
      )}

      <div className="card mx-auto max-w-xl shadow-2xl">
        <h2 className="mb-6 text-xl font-semibold text-white">Create a payment link</h2>

        <div className="space-y-5">
          <div>
            <label className="label">Token</label>
            <input
              className="input font-mono text-sm"
              value={token}
              onChange={(e) => setToken(e.target.value as Address)}
              spellCheck={false}
            />
            <p className="mt-2 text-xs text-slate-500">
              Default is USDT on {activeChain.name}. Contract must allowlist the token.
              {isSupported === false && <span className="ml-2 text-red-400">⚠ Not supported by contract.</span>}
            </p>
          </div>

          <div>
            <label className="label">Amount {symbol ? `(${symbol})` : ""}</label>
            <input
              className="input"
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 150"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="mt-2 text-xs text-slate-500">
              1% protocol fee deducted from payout — you receive 99%.
            </p>
          </div>

          <div>
            <label className="label">Memo (optional)</label>
            <input
              className="input"
              placeholder="e.g. Logo design — invoice #12"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <label className="label">Expires (optional)</label>
            <input className="input" type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            <p className="mt-2 text-xs text-slate-500">Leave empty for a link that never expires.</p>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}

        <button onClick={handleCreate} disabled={isPending} className="btn-brand mt-6 w-full text-base">
          {isPending ? "Creating…" : "Generate payment link"}
        </button>

        {!isConnected && (
          <p className="mt-3 text-center text-xs text-slate-500">
            Connect your wallet to create a link — your wallet address is the payout address.
          </p>
        )}
      </div>

      <div className="mx-auto mt-16 grid max-w-xl grid-cols-3 gap-6 text-center text-sm">
        {[
          ["1", "Create link", "Amount in USDT, on-chain"],
          ["2", "Share link", "Send to your client anywhere"],
          ["3", "Get paid", "Payout lands in your wallet"],
        ].map(([n, t, d]) => (
          <div key={n} className="card p-4! bg-linear-to-br from-white/5 to-transparent">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-brand to-purple-400 font-bold text-white text-lg">
              {n}
            </div>
            <p className="font-semibold text-white">{t}</p>
            <p className="mt-1 text-xs text-slate-400">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}