import React from "react";

type BrandBannerProps = {
  className?: string;
  alt?: string;
};

export default function BrandBanner({
  className = "",
  alt = "Rasphia brand banner",
}: BrandBannerProps) {
  return (
    <img
      src="/brand/rasphia-banner.svg"
      alt={alt}
      className={`w-full rounded-3xl border border-brand-sand/40 shadow-soft-md ${className}`.trim()}
    />
  );
}
