"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useChainId, useConnect, useDisconnect } from "wagmi";
import { truncateAddress } from "@/lib/utils";
import { activeChain } from "@/lib/config";
import { Button } from "@/components/ui/button";

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
    <header className="border-b border-line backdrop-blur-xl bg-background/50 sticky top-0 z-50">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold text-white hover:opacity-80 transition-opacity">
          PAY<span className="bg-linear-to-r from-brand to-purple-400 bg-clip-text text-transparent">Click</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {nav("/", "Create")}
          {nav("/links", "My Links")}
          {isConnected ? (
            <Button onClick={() => disconnect()} className="btn-ghost px-3! py-2! text-xs border border-white/10">
              {wrongNetwork ? "⚠ " : ""}
              {truncateAddress(address!)}
            </Button>
          ) : (
            <Button
              onClick={() => connect({ connector: connectors[0] })}
              disabled={isPending}
              className="btn-brand px-4! py-2! text-xs"
            >
              Connect Wallet
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}