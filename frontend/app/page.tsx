import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4">
        <div className="absolute inset-0 bg-linear-to-b from-brand/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-8 inline-flex items-center justify-center rounded-full bg-brand/10 border border-brand/20 px-4 py-2">
            <span className="text-sm font-medium text-brand">✨ Built on BOT Chain</span>
          </div>
          <h1 className="text-6xl font-bold text-white tracking-tight mb-6">
            Get paid in stablecoins,
            <br />
            <span className="bg-linear-to-r from-brand to-purple-400 bg-clip-text text-transparent">
              one click.
            </span>
          </h1>
          <p className="mt-4 text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Generate payment links on BOT Chain. Your clients pay in USDT.
            You keep 99%. No middleman, no backend required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/create" className="btn-brand text-lg px-8 py-4">
              Create Payment Link
            </Link>
            <Link href="#" className="btn-ghost text-lg px-8 py-4">
              View Demo →
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Why PAYClick?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "⚡",
                title: "Instant Setup",
                description: "No account registration. Connect your wallet and start accepting payments in seconds.",
              },
              {
                icon: "💰",
                title: "99% Payout",
                description: "Only 1% protocol fee. The rest goes directly to your wallet, no hidden costs.",
              },
              {
                icon: "🔒",
                title: "Secure & Trustless",
                description: "Smart contract powered. Your funds are protected by code, not intermediaries.",
              },
              {
                icon: "🌐",
                title: "Global Access",
                description: "Accept payments from anywhere in the world. No bank account needed.",
              },
              {
                icon: "📱",
                title: "Mobile Friendly",
                description: "Share links via email, chat, or social media. Works on any device.",
              },
              {
                icon: "⏰",
                title: "Optional Expiry",
                description: "Set expiration dates for time-sensitive payments or leave open-ended.",
              },
            ].map((feature) => (
              <div key={feature.title} className="card">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-linear-to-b from-transparent to-brand/5">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Create Link",
                description: "Enter amount in USDT, add a memo, and generate your unique payment link.",
              },
              {
                step: "2",
                title: "Share Link",
                description: "Send the link to your client via email, chat, or any messaging platform.",
              },
              {
                step: "3",
                title: "Get Paid",
                description: "Client pays with their wallet. Funds arrive directly in your wallet.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-brand to-purple-400 font-bold text-white text-2xl">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="card border border-brand/30 bg-linear-to-br from-brand/10 to-transparent">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to get started?
            </h2>
            <p className="text-lg text-slate-400 mb-8">
              Create your first payment link in seconds. No account required.
            </p>
            <Link href="/create" className="btn-brand text-lg px-8 py-4">
              Create Payment Link
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="mx-auto max-w-5xl text-center text-slate-500 text-sm">
          <p className="mb-2">
            Powered by PAYClick smart contract on BOT Chain
          </p>
          <p>
            1% protocol fee applies. All transactions are on-chain and transparent.
          </p>
        </div>
      </footer>
    </div>
  );
}