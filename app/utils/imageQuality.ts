export function toHighQualityImageUrl(url?: string | null): string {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;

    // Picsum URLs in this project are often 400x400. Request bigger sources.
    if (host.includes("picsum.photos")) {
      const upgradedPath = path.replace(/\/(\d{2,4})\/(\d{2,4})$/, "/1600/1600");
      parsed.pathname = upgradedPath;
      return parsed.toString();
    }

    // Unsplash/imgix-style quality params.
    if (host.includes("unsplash.com") || host.includes("images.unsplash.com")) {
      parsed.searchParams.set("q", "90");
      parsed.searchParams.set("w", "1600");
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("fit", "max");
      return parsed.toString();
    }

    // Preserve all other provider URLs exactly as-is to avoid unintended quality regressions.
    return url;
  } catch {
    return url;
  }
}
