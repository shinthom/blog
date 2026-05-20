export const siteConfig = {
  title: "Geonwoo Blog",
  description: "A personal blog inspired by Vitalik's website",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com",
  author: "Your Name",
  categories: [
    { slug: "fun", label: "Fun", fontSize: "100%" },
    { slug: "game", label: "Game", fontSize: "100%" },
    { slug: "blockchain", label: "Blockchain", fontSize: "100%" },
    { slug: "ai", label: "AI", fontSize: "100%" },
    { slug: "unreal-engine", label: "UE", fontSize: "100%" },
  ],
} as const;

export type CategorySlug = (typeof siteConfig.categories)[number]["slug"];
