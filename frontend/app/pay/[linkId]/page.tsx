"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  useAccount,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { LINK_STATUS } from "@/lib/abi";
import { PAYCLICK_ADDRESS, activeChain, explorerTxUrl } from "@/lib/config";
import { formatTokenAmount, shortError, truncateAddress, isValidLinkId } from "@/lib/utils";
import {
  usePaymentLink,
  useTokenMeta,
  useTokenAllowance,
  usePayPaymentLink,
} from "@/hooks/usePayClick";

export default function PayPage({ params }: { params: Promise<{ linkId: string }> }) {
  const { linkId } = use(params);
  const valid = isValidLinkId(linkId);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const [now, setNow] = useState(() => BigInt(Math.floor(Date.now() / 1000)));

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(BigInt(Math.floor(Date.now() / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: link, isLoading, refetch } = usePaymentLink(valid ? linkId : undefined);
  const { symbol, decimals } = useTokenMeta(link?.token);
  const { data: allowance } = useTokenAllowance(link?.token, address);
  const { pay, step, hash, error: payError, isBusy, reset } = usePayPaymentLink();

  if (!valid) {
    return <div className="card mt-10 text-center">Invalid payment link.</div>;
  }
  if (isLoading) {
    return <div className="card mt-10 text-center">Loading payment link…</div>;
  }
  const notFound = !link || link.creator === "0x0000000000000000000000000000000000000000";
  if (notFound) {
    return (
      <div className="card mt-10 text-center">
        <p className="text-lg font-semibold text-white">Payment link not found</p>
        <p className="mt-2 mb-6 text-sm text-slate-400">
          Link #{linkId} doesn&rsquo;t exist on {activeChain.name}.
        </p>
        <Link href="/" className="btn-brand mt-6">Create your own link</Link>
      </div>
    );
  }

  const status = Number(link.status);
  const expired = link.expiry !== 0n && now > link.expiry;
  const paidOut = status === 1;
  const cancelled = status === 2;
  const payable = status === 0 && !expired;
  const needsApproval = payable && !!allowance && allowance < link.amount;
  const amountStr = decimals !== undefined ? formatTokenAmount(link.amount, decimals) : "…";

  async function handlePay() {
    reset();
    if (!PAYCLICK_ADDRESS || !link) return;
    if (!isConnected || !address) return alert("Connect your wallet to pay.");
    if (chainId !== activeChain.id) {
      try {
        await switchChainAsync({ chainId: activeChain.id });
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        alert(shortError(err));
        return;
      }
    }
    try {
      await pay(BigInt(linkId), link);
      await refetch();
    } catch {
      // Error is handled by the hook
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-md">
      <div className="card">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-400">Payment request</p>
            <p className="mt-1 text-3xl font-bold text-white">
              {amountStr} <span className="text-lg text-slate-400">{symbol ?? ""}</span>
            </p>
          </div>
          <span
            className={
              "badge " +
              (paidOut
                ? "bg-brand/10 text-brand"
                : cancelled || expired
                ? "bg-red-500/10 text-red-400"
                : "bg-yellow-500/10 text-yellow-400")
            }
          >
            {paidOut ? "Paid" : cancelled ? LINK_STATUS[2] : expired ? "Expired" : LINK_STATUS[0]}
          </span>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Paying to</dt>
            <dd className="font-mono text-slate-300">{truncateAddress(link.creator)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Network</dt>
            <dd className="text-slate-300">{activeChain.name}</dd>
          </div>
          {link.expiry !== 0n && (
            <div className="flex justify-between">
              <dt className="text-slate-500">Expires</dt>
              <dd className="text-slate-300">{new Date(Number(link.expiry) * 1000).toLocaleString()}</dd>
            </div>
          )}
        </dl>

        {step === "confirmed" ? (
          <div className="mt-6 rounded-xl bg-brand/10 p-4 text-center">
            <p className="font-semibold text-brand">Payment sent 🎉</p>
            <p className="mt-1 text-sm text-slate-400">
              {amountStr} {symbol} delivered to {truncateAddress(link.creator)}.
            </p>
            {hash && (
              <a href={explorerTxUrl(activeChain.id, hash)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-brand hover:underline">
                View on BOTScan ↗
              </a>
            )}
          </div>
        ) : payable ? (
          <>
            {payError && <p className="mt-4 text-sm text-red-400">{payError}</p>}
            <button
              onClick={handlePay}
              disabled={isBusy}
              className="btn-brand mt-6 w-full"
            >
              {step === "approving"
                ? "1/2 — Approving USDT…"
                : step === "paying"
                ? "2/2 — Sending payment…"
                : needsApproval
                ? `Pay ${amountStr} ${symbol ?? ""} (2 transactions)`
                : `Pay ${amountStr} ${symbol ?? ""}`}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">
              {needsApproval
                ? "First approve USDT spending, then confirm the payment."
                : "Final payment — no refunds."}
            </p>
          </>
        ) : (
          <div className="mt-6 rounded-xl bg-line p-4 text-center text-sm text-slate-400">
            {paidOut
              ? "This link has already been paid."
              : cancelled
              ? "This payment link was cancelled by the recipient."
              : "This payment link has expired."}
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-600">
        Secured by PAYClick smart contract on {activeChain.name}. 1% protocol fee applies.
      </p>
    </div>
  );
}