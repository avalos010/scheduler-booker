import type { MetadataRoute } from "next";

const siteUrl = "https://scheduler-booker.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/login",
        "/signup",
        "/onboarding",
        "/booking/",
        "/book/",
        "/bookings/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
