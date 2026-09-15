import { ERC20_ABI } from "@/lib/abi";
import { useReadContract, useWriteContract } from "wagmi";
import { Address } from "viem";
import { activeChain, PAYCLICK_ADDRESS } from "@/lib/config";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

const CONTRACT: Address = PAYCLICK_ADDRESS ?? ZERO_ADDRESS;

export function useERC20Symbol() {
  return useReadContract({
    address: CONTRACT,
    abi: ERC20_ABI,
    functionName: "symbol",
    chainId: activeChain.id,
  });
}

export function useERC20Decimals() {
  return useReadContract({
    address: CONTRACT,
    abi: ERC20_ABI,
    functionName: "decimals",
    chainId: activeChain.id,
  });
}

export function useERC20Allowance(owner: Address, spender: Address) {
  return useReadContract({
    address: CONTRACT,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, spender],
    chainId: activeChain.id,
  });
}

export function useApprove(spender: Address, amount: bigint) {
  const { writeContract } = useWriteContract();
  return writeContract({
    address: CONTRACT,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spender, amount],
    chainId: activeChain.id,
  });
}


