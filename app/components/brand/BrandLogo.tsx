import React from "react";

type BrandLogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
};

export default function BrandLogo({
  size = 40,
  showWordmark = false,
  className = "",
  wordmarkClassName = "",
}: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`.trim()}>
      <img
        src="/brand/rasphia-mark.svg"
        alt="Rasphia logo"
        width={size}
        height={size}
        className="rounded-xl"
      />
      {showWordmark && (
        <span
          className={`font-heading tracking-wide text-brand-charcoal ${wordmarkClassName}`.trim()}
        >
          Rasphia
        </span>
      )}
    </div>
  );
}
