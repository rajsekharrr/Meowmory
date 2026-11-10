import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8" style={{ background: "var(--bg)" }}>
      <div className="max-w-lg text-center space-y-6">
        <div className="text-4xl">🐾</div>
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
          Meowmory
        </h1>
        <p className="text-lg" style={{ color: "var(--text-muted)" }}>
          AI that hunts down what changed.
        </p>
        <Link
          href="/chat"
          className="inline-block px-6 py-3 rounded-md text-white font-medium"
          style={{ background: "var(--accent)" }}
        >
          Start chatting
        </Link>
      </div>
    </main>
  );
}
