"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Address, formatUnits } from "viem";
import {
  useCancelPaymentLink,
  useCreatorLinks,
  useCreatorPaymentLinks,
  useCreatorPayments,
} from "@/hooks/usePayClick";
import { activeChain, explorerAddressUrl, explorerTxUrl } from "@/lib/config";
import { formatTokenAmount, shortError, truncateAddress } from "@/lib/utils";

export default function LinksPage() {
  const { address, isConnected } = useAccount();
  const { cancel, isPending } = useCancelPaymentLink();

  const { data: linkIds, refetch } = useCreatorLinks(address);
  const { data: rows, isLoading: linksLoading, error: linksError } = useCreatorPaymentLinks(address);
  const { data: payments, isLoading: paymentsLoading } = useCreatorPayments(address);

  const [error, setError] = useState("");
  const [now, setNow] = useState(() => BigInt(Math.floor(Date.now() / 1000)));
  const loading = linksLoading || paymentsLoading;

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(BigInt(Math.floor(Date.now() / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const paidMap = useMemo(() => {
    const map = new Map<string, { payout: bigint; tx: string; payer: Address }>();
    if (payments) {
      for (const p of payments) {
        map.set(p.linkId.toString(), {
          payout: p.payout,
          tx: p.tx,
          payer: p.payer,
        });
      }
    }
    return map;
  }, [payments]);

  const totalEarned = useMemo(() => {
    let sum = 0n;
    for (const info of paidMap.values()) sum += info.payout;
    return sum;
  }, [paidMap]);

  async function handleCancel(id: bigint) {
    try {
      await cancel(id);
      await refetch();
    } catch (e) {
      setError(shortError(e instanceof Error ? e : new Error(String(e))));
    }
  }

  if (!isConnected) {
    return (
      <div className="card mt-10 text-center">
        <p className="text-lg font-semibold text-white">Connect your wallet</p>
        <p className="mt-2 text-sm text-slate-400">
          Your links are tied to your wallet address — no account needed.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My payment links</h1>
          <p className="mt-2 text-sm text-slate-400">
            {linkIds?.length ?? 0} link{linkIds?.length === 1 ? "" : "s"} ·{" "}
            <span className="text-brand font-semibold">{formatUnits(totalEarned, 6)} USDT</span> earned (payout after 1% fee)
          </p>
        </div>
        <Link href="/" className="btn-brand py-2! px-4 text-sm">New link</Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {!loading && (!rows || rows.length === 0) && (
        <div className="card text-center text-sm text-slate-400 py-12">
          <div className="mb-4 text-4xl">📭</div>
          <p>No links yet.</p>
          <Link href="/" className="text-brand hover:underline font-medium mt-2 inline-block">Create your first one →</Link>
        </div>
      )}

      <div className="space-y-3">
        {rows?.map((row) => {
          const paid = paidMap.get(row.id.toString());
          const expired = Number(row.status) === 0 && row.expiry !== 0n && now > row.expiry;
          return (
            <div key={row.id.toString()} className="card p-4! hover:border-brand/30 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/pay/${row.id}`} className="font-mono text-sm text-brand hover:underline block truncate">
                    /pay/{row.id.toString()}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-semibold text-white">
                      {formatTokenAmount(row.amount, 6)} USDT
                    </span>
                    {paid && (
                      <span className="text-xs text-slate-500">
                        from {truncateAddress(paid.payer)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "badge " +
                      (Number(row.status) === 1
                        ? "bg-brand/10 text-brand"
                        : Number(row.status) === 2 || expired
                        ? "bg-red-500/10 text-red-400"
                        : "bg-yellow-500/10 text-yellow-400")
                    }
                  >
                    {Number(row.status) === 1 ? "Paid" : Number(row.status) === 2 ? "Cancelled" : expired ? "Expired" : "Active"}
                  </span>
                  <button
                    className="btn-ghost px-2.5! py-1! text-xs"
                    onClick={() => {
                      const url = typeof window !== 'undefined' ? window.location.origin + `/pay/${row.id}` : `/pay/${row.id}`;
                      navigator.clipboard.writeText(url);
                    }}
                  >
                    Copy
                  </button>
                  {Number(row.status) === 0 && !expired && (
                    <button
                      className="btn-ghost px-2.5! py-1! text-xs hover:border-red-500! hover:text-red-400"
                      disabled={isPending}
                      onClick={() => handleCancel(row.id)}
                    >
                      Cancel
                    </button>
                  )}
                  {paid && (
                    <a href={explorerTxUrl(activeChain.id, paid.tx)} target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-white">
                      Tx ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-12 text-center text-xs text-slate-600">
        Payout address:{" "}
        {address && (
          <a href={explorerAddressUrl(activeChain.id, address)} target="_blank" rel="noreferrer" className="font-mono hover:text-slate-400 text-slate-500">
            {truncateAddress(address)}
          </a>
        )}
      </p>
    </div>
  );
}