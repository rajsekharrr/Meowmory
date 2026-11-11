"use client";

interface CatLoaderProps {
  text?: string;
}

function PawPrint() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" style={{ color: "var(--text-muted)" }}>
      <ellipse cx="12" cy="18" rx="5" ry="3.5" fill="currentColor" opacity="0.6" />
      <ellipse cx="6" cy="12" rx="2.5" ry="3" fill="currentColor" opacity="0.5" />
      <ellipse cx="18" cy="12" rx="2.5" ry="3" fill="currentColor" opacity="0.5" />
      <ellipse cx="8.5" cy="7" rx="2" ry="2.5" fill="currentColor" opacity="0.4" />
      <ellipse cx="15.5" cy="7" rx="2" ry="2.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function CatLoader({ text }: CatLoaderProps) {
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-1.5">
        <span className="paw-1"><PawPrint /></span>
        <span className="paw-2"><PawPrint /></span>
        <span className="paw-3"><PawPrint /></span>
      </div>
      {text && (
        <p className="text-sm text-[var(--text-muted)] font-normal">{text}</p>
      )}
    </div>
  );
}
