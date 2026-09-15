"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { parseEventLogs, type Address, type Hash } from "viem";
import {
  PAYCLICK_ABI,
  ERC20_ABI,
  PAYMENT_PAID_EVENT,
  type PaymentLink,
} from "@/lib/abi";
import { PAYCLICK_ADDRESS, activeChain } from "@/lib/config";
import { shortError } from "@/lib/utils";

/**
 * All hooks read/write against the active chain (see NEXT_PUBLIC_CHAIN).
 * If the contract address is not configured, reads are disabled rather than failing.
 */

const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

/** Contract address, or zero address if env is missing (queries are gated by `enabled`). */
const CONTRACT: Address = PAYCLICK_ADDRESS ?? ZERO_ADDRESS;
const configured = !!PAYCLICK_ADDRESS;

type LinkId = bigint | number | string;

function toBigInt(id: LinkId | undefined): bigint | undefined {
  if (id === undefined) return undefined;
  try {
    return BigInt(id);
  } catch {
    return undefined;
  }
}

/*//////////////////////////////////////////////////////////////
                            READ HOOKS
//////////////////////////////////////////////////////////////*/

/** Fetch a single payment link by id. `data` is undefined while loading / not found. */
export function usePaymentLink(linkId: LinkId | undefined) {
  const id = toBigInt(linkId);
  return useReadContract({
    address: CONTRACT,
    abi: PAYCLICK_ABI,
    functionName: "getLink",
    args: id !== undefined ? [id] : undefined,
    chainId: activeChain.id,
    query: { enabled: configured && id !== undefined },
  });
}

/** All link ids created by `creator` (empty array if none). */
export function useCreatorLinks(creator: Address | undefined) {
  return useReadContract({
    address: CONTRACT,
    abi: PAYCLICK_ABI,
    functionName: "getCreatorLinks",
    args: creator ? [creator] : undefined,
    chainId: activeChain.id,
    query: { enabled: configured && !!creator },
  });
}

/** True/false whether the contract allowlists `token`. */
export function useSupportedToken(token: Address | undefined) {
  return useReadContract({
    address: CONTRACT,
    abi: PAYCLICK_ABI,
    functionName: "supportedTokens",
    args: token ? [token] : undefined,
    chainId: activeChain.id,
    query: { enabled: configured && !!token },
  });
}

/** Current protocol fee in basis points (100 = 1%). */
export function useProtocolFee() {
  const { data } = useReadContract({
    address: CONTRACT,
    abi: PAYCLICK_ABI,
    functionName: "feeBps",
    chainId: activeChain.id,
    query: { enabled: configured },
  });
  return data !== undefined ? Number(data) : undefined;
}

/** ERC-20 symbol + decimals for any token address (USDT = 6). */
export function useTokenMeta(token: Address | undefined) {
  const enabled = !!token;
  const symbol = useReadContract({
    address: token ?? ZERO_ADDRESS,
    abi: ERC20_ABI,
    functionName: "symbol",
    chainId: activeChain.id,
    query: { enabled },
  });
  const decimals = useReadContract({
    address: token ?? ZERO_ADDRESS,
    abi: ERC20_ABI,
    functionName: "decimals",
    chainId: activeChain.id,
    query: { enabled },
  });
  return {
    symbol: symbol.data,
    decimals: decimals.data !== undefined ? Number(decimals.data) : undefined,
    isLoading: symbol.isLoading || decimals.isLoading,
  };
}

/** Spender (PAYClick) allowance for `owner` on `token`. */
export function useTokenAllowance(token: Address | undefined, owner: Address | undefined) {
  return useReadContract({
    address: token ?? ZERO_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: token && owner ? [owner, CONTRACT] : undefined,
    chainId: activeChain.id,
    query: { enabled: configured && !!token && !!owner },
  });
}

/*//////////////////////////////////////////////////////////////
                           EVENT HOOKS
//////////////////////////////////////////////////////////////*/

export type PaymentRecord = {
  linkId: bigint;
  payer: Address;
  token: Address;
  amount: bigint;
  fee: bigint;
  payout: bigint;
  tx: Hash;
};

/** All PaymentPaid events where `creator` received a payout. */
export function useCreatorPayments(creator: Address | undefined) {
  const publicClient = usePublicClient({ chainId: activeChain.id });
  return useQuery({
    queryKey: ["creator-payments", activeChain.id, PAYCLICK_ADDRESS, creator],
    enabled: !!publicClient && configured && !!creator,
    queryFn: async () => {
      const logs = await publicClient!.getLogs({
        address: CONTRACT,
        event: PAYMENT_PAID_EVENT,
        args: { creator },
        fromBlock: 0n,
        toBlock: "latest",
      });
      return logs.map((l): PaymentRecord => {
        const a = l.args as unknown as {
          linkId: bigint; payer: Address; token: Address;
          amount: bigint; fee: bigint; payout: bigint;
        };
        return {
          linkId: a.linkId,
          payer: a.payer,
          token: a.token,
          amount: a.amount,
          fee: a.fee,
          payout: a.payout,
          tx: l.transactionHash,
        };
      });
    },
  });
}

/** Full link structs for every link `creator` created (one multicall). */
export function useCreatorPaymentLinks(creator: Address | undefined) {
  const publicClient = usePublicClient({ chainId: activeChain.id });
  const { data: ids } = useCreatorLinks(creator);
  return useQuery({
    queryKey: ["creator-payment-links", activeChain.id, PAYCLICK_ADDRESS, creator, ids?.length],
    enabled: !!publicClient && configured && !!ids && ids.length > 0,
    queryFn: async () => {
      const results = await publicClient!.multicall({
        contracts: ids!.map((id) => ({
          address: CONTRACT,
          abi: PAYCLICK_ABI,
          functionName: "getLink" as const,
          args: [id] as const,
        })),
        allowFailure: false,
      });
      return results.map((r, i) => {
        const link = r as unknown as PaymentLink;
        return { id: ids![i], ...link };
      });
    },
  });
}

/*//////////////////////////////////////////////////////////////
                          WRITE HOOKS
//////////////////////////////////////////////////////////////*/

export type CreateLinkInput = {
  token: Address;
  amount: bigint; // in token's smallest unit
  memo?: string;
  expiry?: bigint; // unix seconds; omit / 0n = never expires
};

/** Create a payment link. Resolves with { hash, linkId } once confirmed on-chain. */
export function useCreatePaymentLink() {
  const publicClient = usePublicClient({ chainId: activeChain.id });
  const { writeContractAsync, isPending } = useWriteContract();

  async function create(input: CreateLinkInput): Promise<{ hash: Hash; linkId: bigint }> {
    if (!publicClient || !configured) throw new Error("PAYClick contract address not configured");
    if (input.amount <= 0n || input.amount > (1n << 128n) - 1n)
      throw new Error("Amount must fit in uint128 and be > 0");

    const hash = await writeContractAsync({
      address: CONTRACT,
      abi: PAYCLICK_ABI,
      functionName: "createPaymentLink",
      args: [input.token, input.amount, input.memo ?? "", input.expiry ?? 0n],
      chainId: activeChain.id,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const logs = parseEventLogs({
      abi: PAYCLICK_ABI,
      logs: receipt.logs,
      eventName: "PaymentLinkCreated",
    });
    if (logs.length === 0) throw new Error("PaymentLinkCreated event not found in receipt");
    const linkId = (logs[0].args as unknown as { linkId: bigint }).linkId;
    return { hash, linkId };
  }

  return { create, isPending };
}

/** Cancel an active link. Only callable by the link creator; resolves when confirmed. */
export function useCancelPaymentLink() {
  const publicClient = usePublicClient({ chainId: activeChain.id });
  const { writeContractAsync, isPending } = useWriteContract();

  async function cancel(linkId: bigint): Promise<Hash> {
    if (!publicClient || !configured) throw new Error("PAYClick contract address not configured");
    const hash = await writeContractAsync({
      address: CONTRACT,
      abi: PAYCLICK_ABI,
      functionName: "cancelPaymentLink",
      args: [linkId],
      chainId: activeChain.id,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  return { cancel, isPending };
}

export type PayStep = "idle" | "approving" | "paying" | "confirmed";

/**
 * Full payment flow for one link:
 *   1. reads current allowance on-chain
 *   2. approves the exact amount if needed (skipped when allowance is sufficient)
 *   3. calls pay(linkId) and waits for confirmation
 * Tracks step / tx hash / error so the UI can render a 2-step progress state.
 */
export function usePayPaymentLink() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: activeChain.id });
  const { writeContractAsync, isPending } = useWriteContract();

  const [step, setStep] = useState<PayStep>("idle");
  const [hash, setHash] = useState<Hash | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay(linkId: bigint, link: PaymentLink): Promise<Hash> {
    setError(null);
    setHash(null);
    setStep("idle");
    if (!publicClient || !configured) throw new Error("PAYClick contract address not configured");
    if (!address) throw new Error("Connect your wallet first.");
    try {
      const allowance = await publicClient.readContract({
        address: link.token,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, CONTRACT],
      });
      if (allowance < link.amount) {
        setStep("approving");
        const approveHash = await writeContractAsync({
          address: link.token,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CONTRACT, link.amount], // exact amount, not unlimited
          chainId: activeChain.id,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }
      setStep("paying");
      const payHash = await writeContractAsync({
        address: CONTRACT,
        abi: PAYCLICK_ABI,
        functionName: "pay",
        args: [linkId],
        chainId: activeChain.id,
      });
      await publicClient.waitForTransactionReceipt({ hash: payHash });
      setHash(payHash);
      setStep("confirmed");
      return payHash;
    } catch (e) {
      const msg = shortError(e instanceof Error ? e : new Error(String(e)));
      setError(msg);
      setStep("idle");
      throw e instanceof Error ? e : new Error(msg);
    }
  }

  function reset() {
    setStep("idle");
    setHash(null);
    setError(null);
  }

  return {
    pay,
    step,
    hash,
    error,
    isBusy: isPending || step === "approving" || step === "paying",
    reset,
  };
}