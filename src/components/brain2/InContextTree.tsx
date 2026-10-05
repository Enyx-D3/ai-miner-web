"use client";

import type { ImgHTMLAttributes } from "react";

type TreeProps = ImgHTMLAttributes<HTMLImageElement> & {
  decorative?: boolean;
  variant?: "hero" | "mark";
};

function InContextTreeMark({
  decorative,
  className,
}: {
  decorative: boolean;
  className: string;
}) {
  return (
    <svg
      viewBox="0 0 240 240"
      className={className}
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : "img"}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M120 214c-3-30 2-53 18-74 14-18 28-35 31-63" strokeWidth="8" opacity=".9" />
        <path d="M120 214c2-28-3-54-18-76-14-20-24-38-27-65" strokeWidth="7" opacity=".78" />
        <path d="M123 179c-22-14-39-28-49-48M130 161c25-14 42-31 51-55M108 155c-12-20-29-32-49-40M143 139c11-20 28-34 48-42" strokeWidth="5" opacity=".7" />
        <path d="M82 130c-21-1-37-8-50-20M73 108c-17-8-27-20-32-36M163 113c21-3 37-12 49-27M174 91c14-9 22-22 24-38M100 116c-12-19-15-38-10-56M145 106c7-19 8-36 2-53" strokeWidth="4" opacity=".58" />
        <path d="M116 137c-2-24 2-47 14-68M96 95c-10-12-23-20-38-23M150 78c12-10 26-15 42-14" strokeWidth="3.5" opacity=".5" />
      </g>
      <g fill="currentColor">
        {[
          [31, 109, 5], [41, 72, 4], [58, 72, 5], [74, 107, 4], [90, 59, 5], [99, 94, 4],
          [130, 68, 5], [147, 53, 4], [164, 112, 4], [175, 91, 5], [192, 64, 4], [211, 85, 5],
          [181, 106, 3], [59, 116, 3], [82, 130, 3], [49, 96, 3], [117, 122, 4], [139, 104, 3],
          [156, 77, 3], [107, 76, 3], [72, 82, 3], [201, 102, 3],
        ].map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} opacity={0.42 + (i % 4) * 0.12} />)}
      </g>
      <path d="M86 215c18-7 31-9 38-9 10 0 24 3 43 10" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4" opacity=".25" />
    </svg>
  );
}

export function InContextTree({
  decorative = true,
  variant = "hero",
  className = "",
  alt = "",
  ...props
}: TreeProps) {
  if (variant === "mark") {
    return <InContextTreeMark decorative={decorative} className={className} />;
  }

  return (
    <img
      src="/brain2-incontext/memory-tree.png"
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      className={className}
      draggable={false}
      {...props}
    />
  );
}
