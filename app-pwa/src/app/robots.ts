import type { MetadataRoute } from "next";
import { ROOT_DOMAIN } from "@/lib/tenants/config";

/**
 * robots.txt. La landing pública (apex) es indexable; los subdominios de ONG
 * van detrás de Basic Auth (los crawlers reciben 401) y además marcan noindex
 * en su metadata (ver root layout). Acá solo apuntamos al sitemap del apex.
 */
export default function robots(): MetadataRoute.Robots {
  const base = `https://${ROOT_DOMAIN}`;
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
