"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useChainId, useConnect, useDisconnect } from "wagmi";
import { truncateAddress } from "@/lib/utils";
import { activeChain } from "@/lib/config";

export default function Header() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const pathname = usePathname();

  const wrongNetwork = isConnected && chainId !== activeChain.id;
  const nav = (href: string, label: string) => (
    <Link
      href={href}
      className={pathname === href ? "text-brand" : "text-slate-400 hover:text-white"}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold text-white">
          PAY<span className="text-brand">Click</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {nav("/", "Create")}
          {nav("/links", "My Links")}
          {isConnected ? (
            <button onClick={() => disconnect()} className="btn-ghost px-3! py-2! text-xs">
              {wrongNetwork ? "⚠ " : ""}
              {truncateAddress(address!)}
            </button>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              disabled={isPending}
              className="btn-brand px-4! py-2! text-xs"
            >
              Connect Wallet
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}