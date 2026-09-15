"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { parseUnits, parseEventLogs, type Address } from "viem";
import { PAYCLICK_ABI, ERC20_ABI } from "@/lib/abi";
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
  const publicClient = usePublicClient({ chainId: activeChain.id });
  const { writeContractAsync, isPending } = useWriteContract();

  const [token, setToken] = useState<Address>(USDT_ADDRESS);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [expiry, setExpiry] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; url: string; tx: string } | null>(null);
  const [error, setError] = useState("");


  const { data: decimals } = useReadContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "decimals",
    chainId: activeChain.id,
  });

  const { data: symbol } = useReadContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "symbol",
    chainId: activeChain.id,
  });

  const { data: isSupported } = useReadContract({
    address: PAYCLICK_ADDRESS,
    abi: PAYCLICK_ABI,
    functionName: "supportedTokens",
    args: [token],
    chainId: activeChain.id,
  });

  async function handleCreate() {
    setError("");
    setCreated(null);
    if (!publicClient || !PAYCLICK_ADDRESS) return;
    if (!isConnected || !address) return setError("Connect your wallet first.");
    if (chainId !== activeChain.id) {
      try {
        await switchChainAsync({ chainId: activeChain.id });
      } catch (e) {
        return setError(shortError(e));
      }
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError("Enter a valid amount.");
    if (isSupported === false) return setError("This token is not supported by the contract.");

    let expiryTs = 0;
    if (expiry) {
      const ts = Math.floor(new Date(expiry).getTime() / 1000);
      if (Number.isNaN(ts)) return setError("Invalid expiry date.");
      if (ts <= Math.floor(Date.now() / 1000)) return setError("Expiry must be in the future.");
      expiryTs = ts;
    }

    setBusy(true);
    try {
      const parsed = parseUnits(amount, decimals ?? 6);
      const tx = await writeContractAsync({
        address: PAYCLICK_ADDRESS,
        abi: PAYCLICK_ABI,
        functionName: "createPaymentLink",
        args: [token, parsed, memo, expiryTs],
        chainId: activeChain.id,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      const logs = parseEventLogs({
        abi: PAYCLICK_ABI,
        logs: receipt.logs,
        eventName: "PaymentLinkCreated",
      });
      const id = (logs[0].args as unknown as { linkId: bigint }).linkId.toString();
      setCreated({ id, url: shareUrl(`/pay/${id}`), tx });
    } catch (e) {
      setError(shortError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-white">
          Get paid in stablecoins, <span className="text-brand">one click.</span>
        </h1>
        <p className="mt-3 text-slate-400">
          Generate a payment link on BOT Chain. Your client pays in USDT.
          You keep 99%. No middleman, no backend.
        </p>
      </div>

      {created && (
        <div className="card mb-8 border-brand/50">
          <p className="mb-2 text-sm font-medium text-brand">Payment link created 🎉</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-ink px-3 py-2 text-sm">{created.url}</code>
            <button
              className="btn-brand py-2! text-sm"
              onClick={() => navigator.clipboard.writeText(created.url)}
            >
              Copy
            </button>
          </div>
          <div className="mt-3 flex gap-4 text-sm">
            <Link href={`/pay/${created.id}`} className="text-brand hover:underline">
              Preview payment page →
            </Link>
            <a href={explorerTxUrl(activeChain.id, created.tx)} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white">
              View on BOTScan ↗
            </a>
          </div>
        </div>
      )}

      <div className="card mx-auto max-w-xl">
        <h2 className="mb-5 text-lg font-semibold text-white">Create a payment link</h2>

        <label className="label">Token</label>
        <input
          className="input font-mono text-sm"
          value={token}
          onChange={(e) => setToken(e.target.value as Address)}
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-slate-500">
          Default is USDT on {activeChain.name}. Contract must allowlist the token.
          {isSupported === false && <span className="text-red-400"> ⚠ Not supported by contract.</span>}
        </p>

        <div className="mt-4">
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
          <p className="mt-1 text-xs text-slate-500">
            1% protocol fee deducted from payout — you receive 99%.
          </p>
        </div>

        <div className="mt-4">
          <label className="label">Memo (optional)</label>
          <input
            className="input"
            placeholder="e.g. Logo design — invoice #12"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="mt-4">
          <label className="label">Expires (optional)</label>
          <input className="input" type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          <p className="mt-1 text-xs text-slate-500">Leave empty for a link that never expires.</p>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button onClick={handleCreate} disabled={busy || isPending} className="btn-brand mt-6 w-full">
          {busy || isPending ? "Creating…" : "Generate payment link"}
        </button>

        {!isConnected && (
          <p className="mt-3 text-center text-xs text-slate-500">
            Connect your wallet to create a link — your wallet address is the payout address.
          </p>
        )}
      </div>

      <div className="mx-auto mt-12 grid max-w-xl grid-cols-3 gap-4 text-center text-sm text-slate-400">
        {[
          ["1", "Create link", "Amount in USDT, on-chain"],
          ["2", "Share link", "Send to your client anywhere"],
          ["3", "Get paid", "Payout lands in your wallet"],
        ].map(([n, t, d]) => (
          <div key={n} className="card p-4!">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 font-bold text-brand">
              {n}
            </div>
            <p className="font-semibold text-white">{t}</p>
            <p className="mt-1 text-xs">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}