# PAYClick - 1-Click Crypto Payment Links (BOT Chain)

Payment links for Nigerian freelancers, settled in stablecoins. No backend, no auth —
every piece of state lives on-chain and is read directly by the frontend via RPC.

## How it works

1. **Freelancer** calls `createPaymentLink(token, amount, memo, expiry)` → gets a `linkId`
→ shares `https://payclick.xyz/pay/<linkId>`.
2. **Client** opens the link, connects wallet, approves USDT, clicks Pay → `pay(linkId)`.
3. Contract atomically splits the transfer: `fee → treasury`, `payout → freelancer`.
Exact amount, one-time, final. No custody.

## Architecture (no backend)

| Frontend need | Source |
| --- | --- |
| Link details (amount, token, status, creator) | `links(linkId)` public getter via viem |
| "My links" dashboard | `getCreatorLinks(address)` + `PaymentLinkCreated` / `PaymentPaid` events via `getLogs` |
| Payer history | `PaymentPaid` events filtered by `payer` |
| Token metadata (symbol, decimals) | ERC-20 `symbol()` / `decimals()` calls |
| USD amounts | USDT is 6-decimals fixed; format client-side |

Recommended: [viem](https://viem.sh) + [wagmi](https://wagmi.sh). BOT Chain is Geth-compatible,
so all standard Ethereum tooling works.

## Contract

- `src/PAYClick.sol` — main contract (OpenZeppelin Ownable + ReentrancyGuard + SafeERC20)
- Fee: 100 bps (1%), deducted from creator payout, sent to `treasury`
- `MAX_FEE_BPS = 500` hard cap enforced on-chain
- Token allowlist (`supportedTokens`) — owner can add/remove stablecoins
- Links: exact amount, one-time, optional expiry, creator-cancellable while unpaid

## BOT Chain config

|  | Testnet | Mainnet |
| --- | --- | --- |
| Chain ID | 968 | 677 |
| RPC | https://rpc.bohr.life | https://rpc.botchain.ai |
| Explorer | https://scan.bohr.life | https://scan.botchain.ai |
| USDT | 0x75edC9335175Fc0552D51D48439F229c10420fe3 | 0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C |

Testnet BOT faucet: see https://dev-docs.botchain.ai/docs/Developers/quick-guide/

## Setup & deploy

```bash
# 1. Install dependencies
forge install OpenZeppelin/openzeppelin-contracts

# 2. Run tests
forge test -vvv

# 3. Deploy to testnet
cp .env.example .env   # fill in PRIVATE_KEY, TREASURY_ADDRESS, USDT_ADDRESS (testnet)
source .env
forge script script/DeployPAYClick.s.sol:DeployPAYClick \
  --rpc-url botchain_testnet \
  --broadcast \
  --verify
```

## Notes / future upgrades

- **Permit2**: BOT Chain has Permit2 deployed (`0xaE85b2bc7578F8Ca9217900a2D548151F96447de`
on testnet) — later we can accept signature-based approvals so the payer signs once
instead of sending a separate `approve` tx. That makes it a true 1-click flow.
- **Multi-use links** (e.g. monthly retainer): add a `maxUses` counter — small extension.
- USDT is assumed to be a standard ERC-20 (no fee-on-transfer). Verified via test flow;
if BOT's USDT behaves differently, add a balance-check around `pay()`.