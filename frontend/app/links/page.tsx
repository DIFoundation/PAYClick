"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { formatUnits, type Address } from "viem";
import { PAYCLICK_ABI, PAYMENT_PAID_EVENT } from "@/lib/abi";
import { PAYCLICK_ADDRESS, activeChain, explorerAddressUrl, explorerTxUrl } from "@/lib/config";
import { formatTokenAmount, shortError, truncateAddress, shareUrl } from "@/lib/utils";

type LinkRow = {
  id: bigint;
  creator: Address;
  token: Address;
  amount: bigint;
  expiry: bigint;
  status: number;
};

type PaidInfo = { payout: bigint; tx: string; payer: Address };

export default function LinksPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: activeChain.id });
  const { writeContractAsync, isPending } = useWriteContract();

  const [rows, setRows] = useState<LinkRow[]>([]);
  const [paidMap, setPaidMap] = useState<Map<string, PaidInfo>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: linkIds, refetch } = useReadContract({
    address: PAYCLICK_ADDRESS,
    abi: PAYCLICK_ABI,
    functionName: "getCreatorLinks",
    args: address ? [address] : undefined,
    chainId: activeChain.id,
    query: { enabled: !!address && !!PAYCLICK_ADDRESS },
  });

  useEffect(() => {
    if (!publicClient || !PAYCLICK_ADDRESS || !linkIds || !address) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // 1. all link structs in one multicall
        const results = await publicClient.multicall({
          contracts: linkIds.map((id) => ({
            address: PAYCLICK_ADDRESS!,
            abi: PAYCLICK_ABI,
            functionName: "getLink" as const,
            args: [id] as const,
          })),
          allowFailure: false,
        });
        if (cancelled) return;
        setRows(
          results.map((r, i) => {
            const [creator, token, amount, expiry, status] = r as readonly [
              Address, Address, bigint, bigint, number
            ];
            return { id: linkIds[i], creator, token, amount, expiry, status: Number(status) };
          })
        );

        // 2. PaymentPaid events for earnings + payer info
        const logs = await publicClient.getLogs({
          address: PAYCLICK_ADDRESS,
          event: PAYMENT_PAID_EVENT,
          args: { creator: address },
          fromBlock: 0n,
          toBlock: "latest",
        });
        if (cancelled) return;
        const map = new Map<string, PaidInfo>();
        for (const log of logs) {
          map.set(log.args.linkId!.toString(), {
            payout: log.args.payout!,
            tx: log.transactionHash,
            payer: log.args.payer!,
          });
        }
        setPaidMap(map);
      } catch (e) {
        if (!cancelled) setError(shortError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, linkIds, address]);

  const totalEarned = useMemo(() => {
    let sum = 0n;
    for (const info of paidMap.values()) sum += info.payout;
    return sum;
  }, [paidMap]);

  async function handleCancel(id: bigint) {
    setError("");
    try {
      await writeContractAsync({
        address: PAYCLICK_ADDRESS!,
        abi: PAYCLICK_ABI,
        functionName: "cancelPaymentLink",
        args: [id],
        chainId: activeChain.id,
      });
      await refetch();
    } catch (e) {
      setError(shortError(e));
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
    <div className="mt-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My payment links</h1>
          <p className="mt-1 text-sm text-slate-400">
            {linkIds?.length ?? 0} link{linkIds?.length === 1 ? "" : "s"} ·{" "}
            <span className="text-brand">{formatUnits(totalEarned, 6)} USDT</span> earned (payout after 1% fee)
          </p>
        </div>
        <Link href="/" className="btn-brand !py-2 text-sm">New link</Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {!loading && rows.length === 0 && (
        <div className="card text-center text-sm text-slate-400">
          No links yet. <Link href="/" className="text-brand hover:underline">Create your first one →</Link>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((row) => {
          const paid = paidMap.get(row.id.toString());
          const now = BigInt(Math.floor(Date.now() / 1000));
          const expired = row.status === 0 && row.expiry !== 0n && now > row.expiry;
          return (
            <div key={row.id.toString()} className="card !p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link href={`/pay/${row.id}`} className="font-mono text-sm text-brand hover:underline">
                    /pay/{row.id.toString()}
                  </Link>
                  <span className="ml-3 font-semibold text-white">
                    {formatTokenAmount(row.amount, 6)} USDT
                  </span>
                  {paid && (
                    <span className="ml-2 text-xs text-slate-500">
                      from {truncateAddress(paid.payer)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "badge " +
                      (row.status === 1
                        ? "bg-brand/10 text-brand"
                        : row.status === 2 || expired
                        ? "bg-red-500/10 text-red-400"
                        : "bg-yellow-500/10 text-yellow-400")
                    }
                  >
                    {row.status === 1 ? "Paid" : row.status === 2 ? "Cancelled" : expired ? "Expired" : "Active"}
                  </span>
                  <button
                    className="btn-ghost !px-2.5 !py-1 text-xs"
                    onClick={() => navigator.clipboard.writeText(shareUrl(`/pay/${row.id}`))}
                  >
                    Copy
                  </button>
                  {row.status === 0 && !expired && (
                    <button
                      className="btn-ghost !px-2.5 !py-1 text-xs hover:!border-red-500 hover:text-red-400"
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

      <p className="mt-8 text-center text-xs text-slate-600">
        Payout address:{" "}
        <a href={explorerAddressUrl(activeChain.id, address)} target="_blank" rel="noreferrer" className="font-mono hover:text-slate-400">
          {truncateAddress(address)}
        </a>
      </p>
    </div>
  );
}