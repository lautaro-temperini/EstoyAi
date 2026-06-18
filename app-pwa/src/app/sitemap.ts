import type { MetadataRoute } from "next";
import { ROOT_DOMAIN } from "@/lib/tenants/config";

/**
 * Sitemap. Solo la landing pública: la app operativa es privada (Basic Auth) y
 * no se indexa. Si en el futuro la landing suma páginas públicas, sumarlas acá.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `https://${ROOT_DOMAIN}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
