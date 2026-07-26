import type { MetadataRoute } from "next";

/**
 * The gallery and method pages should be findable. Admin and the API should not
 * be crawled — /admin is token-gated anyway, but there's no reason to spend
 * crawl budget on a login form.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
  };
}
