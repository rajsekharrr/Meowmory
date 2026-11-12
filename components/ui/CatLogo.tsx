"use client";

interface CatLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export function CatLogo({ width = 32, height = 32, className }: CatLogoProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* ears */}
      <path d="M7 14L4 4l7 5" fill="currentColor" />
      <path d="M25 14L28 4l-7 5" fill="currentColor" />
      {/* head */}
      <ellipse cx="16" cy="19" rx="11" ry="10" fill="currentColor" />
      {/* eyes (cut-out) */}
      <ellipse cx="12" cy="18" rx="1.6" ry="1.8" fill="var(--bg, #F7F7F5)" />
      <ellipse cx="20" cy="18" rx="1.6" ry="1.8" fill="var(--bg, #F7F7F5)" />
      {/* nose */}
      <path d="M15 22l1-1.2 1 1.2" fill="var(--bg, #F7F7F5)" />
    </svg>
  );
}
