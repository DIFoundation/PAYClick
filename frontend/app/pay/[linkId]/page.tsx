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
import { PAYCLICK_ABI, ERC20_ABI, LINK_STATUS } from "@/lib/abi";
import { PAYCLICK_ADDRESS, activeChain, explorerTxUrl } from "@/lib/config";
import { formatTokenAmount, shortError, truncateAddress, isValidLinkId } from "@/lib/utils";

type Step = "idle" | "approving" | "paying" | "done";

export default function PayPage({ params }: { params: { linkId: string } }) {
  const { linkId } = params;
  const valid = isValidLinkId(linkId);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: activeChain.id });
  const { writeContractAsync, isPending } = useWriteContract();

  const [step, setStep] = useState<Step>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState("");

  const {
    data: link,
    isLoading,
    refetch,
  } = useReadContract({
    address: PAYCLICK_ADDRESS,
    abi: PAYCLICK_ABI,
    functionName: "links",
    args: valid ? [BigInt(linkId)] : undefined,
    chainId: activeChain.id,
    query: { enabled: valid && !!PAYCLICK_ADDRESS },
  });

  const { data: decimals } = useReadContract({
    address: link?.token,
    abi: ERC20_ABI,
    functionName: "decimals",
    chainId: activeChain.id,
    query: { enabled: !!link && link.creator !== "0x0000000000000000000000000000000000000000" },
  });

  const { data: symbol } = useReadContract({
    address: link?.token,
    abi: ERC20_ABI,
    functionName: "symbol",
    chainId: activeChain.id,
    query: { enabled: !!link && link.creator !== "0x0000000000000000000000000000000000000000" },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: link?.token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && link ? [address, PAYCLICK_ADDRESS!] : undefined,
    chainId: activeChain.id,
    query: { enabled: !!address && !!link && !!PAYCLICK_ADDRESS },
  });

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
        <p className="mt-2 text-sm text-slate-400">
          Link #{linkId} doesn&rsquo;t exist on {activeChain.name}.
        </p>
        <Link href="/" className="btn-brand mt-6">Create your own link</Link>
      </div>
    );
  }

  const status = Number(link.status);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const expired = link.expiry !== 0n && now > link.expiry;
  const paidOut = status === 1;
  const cancelled = status === 2;
  const payable = status === 0 && !expired;
  const needsApproval = payable && !!allowance && allowance < link.amount;
  const amountStr = decimals !== undefined ? formatTokenAmount(link.amount, decimals) : "…";

  async function handlePay() {
    setError("");
    if (!publicClient || !PAYCLICK_ADDRESS || !link) return;
    if (!isConnected || !address) return setError("Connect your wallet to pay.");
    if (chainId !== activeChain.id) {
      try {
        await switchChainAsync({ chainId: activeChain.id });
      } catch (e) {
        return setError(shortError(e));
      }
    }
    setStep("approving");
    try {
      if ((allowance ?? 0n) < link.amount) {
        const tx = await writeContractAsync({
          address: link.token,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [PAYCLICK_ADDRESS, link.amount],
          chainId: activeChain.id,
        });
        await publicClient.waitForTransactionReceipt({ hash: tx });
        await refetchAllowance();
      }
      setStep("paying");
      const tx = await writeContractAsync({
        address: PAYCLICK_ADDRESS,
        abi: PAYCLICK_ABI,
        functionName: "pay",
        args: [BigInt(linkId)],
        chainId: activeChain.id,
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      setTxHash(tx);
      setStep("done");
      await refetch();
    } catch (e) {
      setError(shortError(e));
      setStep("idle");
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

        {step === "done" ? (
          <div className="mt-6 rounded-xl bg-brand/10 p-4 text-center">
            <p className="font-semibold text-brand">Payment sent 🎉</p>
            <p className="mt-1 text-sm text-slate-400">
              {amountStr} {symbol} delivered to {truncateAddress(link.creator)}.
            </p>
            {txHash && (
              <a href={explorerTxUrl(activeChain.id, txHash)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-brand hover:underline">
                View on BOTScan ↗
              </a>
            )}
          </div>
        ) : payable ? (
          <>
            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            <button
              onClick={handlePay}
              disabled={isPending || step === "approving" || step === "paying"}
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