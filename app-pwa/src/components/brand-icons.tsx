/**
 * Iconos de marca para integraciones externas. SVG inline (Material Symbols no
 * incluye logos de marcas). Colores oficiales aproximados.
 */

/** Cloudflare — nube en naranja de marca (#F6821F). */
export function CloudflareIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      width="20"
      height="20"
      aria-hidden="true"
      fill="#F6821F"
    >
      <path d="M16.78 16.5l.28-.95c.33-1.14.2-2.19-.36-2.96-.52-.71-1.38-1.13-2.42-1.18l-7.6-.1a.15.15 0 0 1-.12-.06.16.16 0 0 1-.02-.14.2.2 0 0 1 .18-.13l7.67-.1c.91-.04 1.9-.78 2.24-1.68l.44-1.15a.27.27 0 0 0 .01-.16A5 5 0 0 0 7.7 6.42a2.26 2.26 0 0 0-3.54 2.36A3.2 3.2 0 0 0 1 11.98c0 .16.01.32.03.48a.15.15 0 0 0 .15.13h14.04c.07 0 .14-.05.16-.12l.05-.16z" />
      <path
        d="M19.2 9.5c-.07 0-.14 0-.2.01a.12.12 0 0 0-.1.08l-.3 1.04c-.33 1.14-.2 2.19.36 2.96.52.71 1.38 1.13 2.42 1.18l1.62.1a.2.2 0 0 1 .15.09.16.16 0 0 1 .01.15.2.2 0 0 1-.18.13l-1.68.1c-.92.04-1.9.78-2.24 1.68l-.12.31a.1.1 0 0 0 .09.13h5.78a.15.15 0 0 0 .15-.11 4.1 4.1 0 0 0 .15-1.1A4.18 4.18 0 0 0 19.2 9.5z"
        fill="#FBAD41"
      />
    </svg>
  );
}

/** Podio — círculo en verde de marca con segmentos. */
export function PodioIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      width="20"
      height="20"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="11" fill="#4E8B1E" />
      <circle cx="12" cy="7.5" r="2" fill="#ffffff" />
      <circle cx="8.3" cy="14.5" r="2" fill="#ffffff" />
      <circle cx="15.7" cy="14.5" r="2" fill="#ffffff" />
    </svg>
  );
}
