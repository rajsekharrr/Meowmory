import Link from "next/link";
import { CatLogo } from "@/components/ui/CatLogo";

const EXAMPLES = [
  "Has Linear changed pricing since I asked last week?",
  "What did I research on Monday?",
  "Which of those 5 CRMs I shortlisted shipped something new?",
];

export default function Home() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4 py-16"
      style={{ background: "var(--bg)" }}
    >
      <div className="flex flex-col items-center text-center gap-4 w-full max-w-md">
        {/* Logo */}
        <CatLogo width={48} height={48} className="text-[var(--accent)]" />

        {/* Headline */}
        <h1
          className="text-4xl font-semibold tracking-[-0.03em]"
          style={{ color: "var(--text)" }}
        >
          Meowmory
        </h1>

        {/* Tagline */}
        <p
          className="text-xl font-normal"
          style={{ color: "var(--text-muted)" }}
        >
          AI that hunts down what changed.
        </p>

        {/* Spacer */}
        <div className="mt-4" />

        {/* Example queries */}
        <div className="flex flex-col gap-2 w-full">
          {EXAMPLES.map((q) => (
            <div
              key={q}
              className="rounded-lg border px-3 py-2 text-sm text-left"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--text)",
              }}
            >
              {q}
            </div>
          ))}
        </div>

        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Try asking something like these →
        </p>

        {/* CTA */}
        <div className="mt-2 flex flex-col items-center gap-2">
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[6px] text-base font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Start chatting →
          </Link>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Bring your own Anthropic or OpenAI key. Free to use.
          </p>
        </div>
      </div>
    </main>
  );
}
