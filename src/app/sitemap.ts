import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url:
        process.env.NEXT_PUBLIC_SITE_URL || "https://projectflow-ai-workspace.vercel.app",
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
