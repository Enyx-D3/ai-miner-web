import type { MetadataRoute } from "next";

const routes = ["/", "/features", "/how-it-works", "/docs", "/privacy", "/terms", "/security", "/support"];

export default function sitemap(): MetadataRoute.Sitemap {
  const host = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return routes.map((route) => ({
    url: `${host}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
