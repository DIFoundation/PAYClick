"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useAccount, useSwitchChain } from "wagmi";
import { activeChain, wagmiConfig } from "@/lib/config";

function ChainManager({ children }: { children: React.ReactNode }) {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (isConnected && chainId !== activeChain.id) {
      switchChain({ chainId: activeChain.id })
    }
  }, [isConnected, chainId, switchChain]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ChainManager>{children}</ChainManager>
      </QueryClientProvider>
    </WagmiProvider>
  );
}