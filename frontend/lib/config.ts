import { defineChain, type Address, type Chain } from "viem";
import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

export const botchainTestnet = defineChain({
  id: 968,
  name: "BOT Chain Testnet",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.bohr.life"] } },
  blockExplorers: { default: { name: "BOTScan", url: "https://scan.bohr.life" } },
});

export const botchainMainnet = defineChain({
  id: 677,
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.botchain.ai"] } },
  blockExplorers: { default: { name: "BOTScan", url: "https://scan.botchain.ai" } },
});

export const SUPPORTED_CHAINS = [botchainTestnet, botchainMainnet] as const;

export const activeChain: Chain =
  process.env.NEXT_PUBLIC_CHAIN === "mainnet" ? botchainMainnet : botchainTestnet;

const PAYCLICK_ADDRESSES: Record<number, Address | undefined> = {
  968: process.env.NEXT_PUBLIC_PAYCLICK_ADDRESS_TESTNET as Address | undefined,
  677: process.env.NEXT_PUBLIC_PAYCLICK_ADDRESS_MAINNET as Address | undefined,
};

export const PAYCLICK_ADDRESS: Address | undefined =
  PAYCLICK_ADDRESSES[activeChain.id];

export const USDT_ADDRESSES: Record<number, Address> = {
  968: "0x75edC9335175Fc0552D51D48439F229c10420fe3",
  677: "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C",
};

export const USDT_ADDRESS: Address = USDT_ADDRESSES[activeChain.id];

const connectors: ReturnType<typeof injected>[] = [injected({ shimDisconnect: true })];
const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (wcProjectId) connectors.push(walletConnect({ projectId: wcProjectId }) as ReturnType<typeof injected>);

export const wagmiConfig = createConfig({
  chains: SUPPORTED_CHAINS as unknown as readonly [Chain, ...Chain[]],
  connectors,
  transports: {
    [botchainTestnet.id]: http(),
    [botchainMainnet.id]: http(),
  },
});

export function explorerTxUrl(chainId: number, hash: string): string {
  const base = chainId === botchainMainnet.id ? "https://scan.botchain.ai" : "https://scan.bohr.life";
  return `${base}/tx/${hash}`;
}

export function explorerAddressUrl(chainId: number, addr: string): string {
  const base = chainId === botchainMainnet.id ? "https://scan.botchain.ai" : "https://scan.bohr.life";
  return `${base}/address/${addr}`;
}