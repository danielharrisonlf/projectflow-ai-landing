import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL || "https://projectflow-ai.vercel.app";
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/demo/" },
    sitemap: `${site}/sitemap.xml`,
  };
}
