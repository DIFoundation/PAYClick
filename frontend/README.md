# PAYClick Web — Frontend

Next.js 16 (App Router) + TypeScript + Tailwind + wagmi/viem. No backend, no auth —
wallet address is the identity, all state is read from the PAYClick contract on BOT Chain.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing + create payment link (token, amount, memo, optional expiry) |
| `/pay/[linkId]` | Client checkout — reads the link on-chain, approve + pay in USDT |
| `/links` | Freelancer dashboard — all links for the connected wallet, earnings from `PaymentPaid` events, cancel active links |

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in your deployed contract address
pnpm run dev
```

Deploy the contract first (see ../payclick-contract), then paste its address into
`.env.local` for the matching `NEXT_PUBLIC_CHAIN`.

## Notes

- Reads use the chain's public RPC directly (viem `useReadContract` / `getLogs`), so no
API keys are needed for anything except optional WalletConnect.
- Amounts use each token's on-chain `decimals()` — USDT on BOT Chain has 6.
- Payment flow is 2 transactions today (approve, then pay). v2: integrate Permit2
(deployed on BOT Chain) for true 1-click signature-based payment.
- `getLogs(fromBlock: 0)` is fine on BOT Chain today; if it ever gets slow, switch the
earnings view to an indexer (TheGraph/Covalent are listed in the BOT Chain docs).