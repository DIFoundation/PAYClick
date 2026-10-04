# PAYClick

> **1-click crypto payments for Nigerian freelancers.**

PAYClick makes it easy for Nigerian freelancers, creators, developers, and independent workers to get paid in stablecoins.

Generate a simple **BOTChain payment URL**, share it with your client, and receive payment directly to your wallet — with **no traditional payment middleman**.

**1% platform fee. Simple. Global. On-chain.**

---

## 🚀 Overview

Getting paid by international clients can be unnecessarily complicated.

Traditional payment platforms can introduce:

* High transaction and conversion fees
* Payment delays
* Account restrictions
* Complex onboarding
* Dependence on centralized intermediaries

PAYClick provides a simpler alternative.

A freelancer creates a payment link containing the amount and payment details. The link can then be shared with a client through WhatsApp, email, social media, a website, or anywhere else.

The client opens the link, connects a compatible wallet, and completes the payment using supported stablecoins on **BOTChain**.

### The idea is simple:

**Create → Share → Pay → Receive**

---

## ✨ Features

* 🔗 **1-click payment links**
* 💵 **Stablecoin payments**
* 🌍 **Designed for Nigerian freelancers**
* ⚡ **Fast on-chain settlement**
* 🔐 **Non-custodial payments**
* ⛓️ **Built on BOTChain**
* 💰 **1% platform fee**
* 📱 **Shareable payment URLs**
* 🦊 **Web3 wallet integration**
* 📊 **Transparent blockchain transactions**

---

## 🧑‍💻 How It Works

### 1. Create a payment link

Enter the amount you want to receive and generate your unique PAYClick payment URL.

```text
https://payclick-beta.vercel.app/pay/...
```

### 2. Share the link

Send the payment link to your client through:

* WhatsApp
* Email
* Telegram
* X
* LinkedIn
* Your portfolio
* Your website
* Invoices

### 3. Client opens the link

The client sees the payment request and connects their supported Web3 wallet.

### 4. Client pays

The client approves the stablecoin transaction on BOTChain.

### 5. You get paid

The payment settles on-chain and the funds are sent to the freelancer's wallet, subject to the platform's **1% fee**.

---

## 💡 Why PAYClick?

### For freelancers

PAYClick gives freelancers a simple way to request crypto payments without requiring clients to navigate complicated DeFi interfaces.

Instead of sending a wallet address and manually explaining:

> "Send X USDT to this address on this network..."

you can simply send a payment link.

### For clients

The payment experience is straightforward:

**Open link → Connect wallet → Pay**

### For the ecosystem

PAYClick provides a lightweight payment layer for freelancers who want to receive stablecoins from local and international clients.

---

## 🏗️ Architecture

PAYClick is split into two primary components:

```text
PAYClick
│
├── frontend/
│   └── Web application
│       ├── Payment-link creation
│       ├── Payment interface
│       ├── Wallet connection
│       └── Transaction interaction
│
└── contract/
    └── Smart contracts
        ├── Payment processing
        ├── Fee handling
        └── On-chain settlement
```

### Frontend

The frontend provides the user-facing payment experience.

It handles:

* Creating payment requests
* Generating payment URLs
* Connecting wallets
* Displaying payment information
* Initiating transactions
* Showing transaction status

### Smart Contract

The smart-contract layer handles the on-chain payment logic.

This provides transparent and verifiable transaction execution without requiring a centralized payment processor to custody user funds.

---

## ⛓️ BOTChain

PAYClick is built for **BOTChain**, enabling stablecoin payments with low-cost and fast blockchain settlement.

The goal is to make blockchain payments feel less like a crypto transaction and more like sending someone a payment request.

---

## 💰 Fee Model

PAYClick uses a simple:

### **1% platform fee**

For a payment of:

```text
$100
```

the platform fee is:

```text
$1
```

and the remaining:

```text
$99
```

is settled to the recipient, according to the payment contract's fee logic.

> **Always verify the exact fee calculation and recipient amounts on-chain before using PAYClick for production payments.**

---

## 🔐 Non-Custodial Design

PAYClick is designed around direct wallet-to-wallet settlement.

The platform does not need to hold a user's funds in a centralized account before they can access their payment.

Blockchain transactions provide a publicly verifiable record of payment activity.

**Your wallet. Your payment. Your funds.**

---

## 🛠️ Tech Stack

The project consists of a Web3 frontend and smart-contract layer.

Typical areas of the stack include:

* **Next.js / React**
* **TypeScript**
* **Tailwind CSS**
* **Solidity**
* **Foundry**
* **BOTChain**
* **Web3 wallet connectivity**
* **ERC-20 compatible stablecoins**

---

## 📁 Project Structure

```text
PAYClick/
│
├── contract/
│   ├── src/
│   ├── test/
│   ├── script/
│   └── foundry.toml
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── ...
│
└── README.md
```

> The exact structure may evolve as PAYClick develops.

---

## 🧪 Local Development

### Prerequisites

Make sure you have:

* Node.js
* pnpm or npm
* Foundry
* A Web3 wallet such as MetaMask
* Access to the appropriate BOTChain network

---

### Clone the repository

```bash
git clone https://github.com/DIFoundation/PAYClick.git

cd PAYClick
```

---

### Frontend

```bash
cd frontend

pnpm install
```

Create your environment file:

```bash
cp .env.example .env.local
```

Configure the required environment variables and start the development server:

```bash
pnpm dev
```

The application should then be available at:

```text
http://localhost:3000
```

---

### Smart Contracts

```bash
cd contract
```

Install/update Foundry dependencies if required:

```bash
forge install
```

Build the contracts:

```bash
forge build
```

Run the test suite:

```bash
forge test
```

Format Solidity code:

```bash
forge fmt
```

---

## 🔑 Environment Variables

The frontend may require environment variables for network configuration, contract addresses, wallet connectivity, and other application settings.

Create:

```text
frontend/.env.local
```

and configure the variables required by the application.

**Never commit private keys, seed phrases, or other sensitive credentials to the repository.**

---

## 🧪 Testing

Smart contracts can be tested with Foundry:

```bash
cd contract

forge test -vvv
```

For frontend development:

```bash
cd frontend

pnpm dev
```

Always test payment flows on the appropriate test environment before using real funds.

---

## 🌐 Demo

**Live application:**

[PAYClick Live Demo](https://payclick-eight.vercel.app)

**Source code:**

[GitHub Repository](https://github.com/DIFoundation/PAYClick)

---

## 🗺️ Roadmap

PAYClick is an evolving project.

Potential future improvements include:

* [ ] Payment history
* [ ] Freelancer payment dashboard
* [ ] Custom payment-link slugs
* [ ] Payment-link expiration
* [ ] Payment notifications
* [ ] Invoice generation
* [ ] QR-code payments
* [ ] Multiple stablecoin support
* [ ] Mobile-first payment experience
* [ ] Recurring payment requests
* [ ] Payment analytics
* [ ] Merchant integrations
* [ ] API / SDK for third-party applications

---

## 🎯 Target Users

PAYClick is primarily designed for:

* Freelancers
* Software developers
* Designers
* Writers
* Creators
* Consultants
* Remote workers
* Web3 contributors
* Nigerian businesses working with international clients

---

## ⚠️ Disclaimer

PAYClick is a blockchain-based payment application.

Cryptocurrency transactions are irreversible. Always verify:

* The recipient
* Payment amount
* Network
* Token
* Transaction details

before confirming a transaction.

Do not send funds to a payment link unless you trust the recipient and understand the transaction you are approving.

---

## 🤝 Contributing

Contributions are welcome.

To contribute:

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/your-feature
```

3. Make your changes.
4. Test your changes.
5. Commit your work.

```bash
git commit -m "feat: add your feature"
```

6. Push your branch.

```bash
git push origin feature/your-feature
```

7. Open a Pull Request.

Please keep contributions focused, tested, and consistent with the project's architecture.

---

## 📄 License

This project is currently under active development.

See the repository for the applicable license and licensing terms.

---

## 🌍 Vision

PAYClick is built around a simple idea:

> **Getting paid internationally shouldn't require a complicated payment stack.**

For Nigerian freelancers, a payment request should be as simple as sending a link.

**Create a link. Share it. Get paid.**

---

### Built with ❤️ for African freelancers and the global Web3 economy.

**PAYClick — Get paid in stablecoins, one click at a time.**
