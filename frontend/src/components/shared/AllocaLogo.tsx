import * as React from "react";

export type AllocaLogoProps = {
  className?: string;
  wordmarkClassName?: string;
  iconOnly?: boolean;
  title?: string;
};

export function AllocaLogo({
  className,
  wordmarkClassName,
  iconOnly = false,
  title = "Alloca",
}: AllocaLogoProps) {
  const titleId = React.useId();

  return (
    <svg
      viewBox={iconOnly ? "0 0 96 96" : "0 0 320 96"}
      role="img"
      aria-labelledby={titleId}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <title id={titleId}>{title}</title>

      <defs>
        <linearGradient
          id="allocaGradient"
          x1="24"
          y1="72"
          x2="96"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#7CB5F0" />
          <stop offset="1" stopColor="#9B74E8" />
        </linearGradient>
      </defs>

      <g transform="translate(8,8)">
        <rect x="8" y="42" width="20" height="30" rx="5" fill="url(#allocaGradient)" />
        <rect x="36" y="22" width="20" height="50" rx="5" fill="url(#allocaGradient)" />
        <rect x="36" y="58" width="20" height="14" rx="4" fill="url(#allocaGradient)" />
        <rect x="64" y="8" width="20" height="36" rx="5" fill="url(#allocaGradient)" />
        <rect x="64" y="46" width="20" height="26" rx="5" fill="url(#allocaGradient)" />
      </g>

      {!iconOnly && (
        <text
          x="112"
          y="63"
          fill="currentColor"
          className={wordmarkClassName}
          fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          fontSize="54"
          fontWeight="600"
          letterSpacing="-0.03em"
        >
          Alloca
        </text>
      )}
    </svg>
  );
}

export default AllocaLogo;
