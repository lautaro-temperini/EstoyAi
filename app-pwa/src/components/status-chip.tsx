/**
 * Chip de estado estandarizado: un solo lugar para label + color de todos
 * los estados de severidad/procesamiento que aparecen en la app. Ver
 * DESIGN.md → "Chips de estado" antes de agregar o recolorear un estado.
 */
export type EstadoChip =
  | "alta"
  | "media"
  | "baja"
  | "en-cola"
  | "procesando"
  | "por-revisar"
  | "enviado"
  | "error";

export const ESTADO_CHIP: Record<EstadoChip, { label: string; cls: string }> = {
  alta: { label: "ALTA", cls: "bg-pink-100 text-pink-700" },
  media: { label: "MEDIA", cls: "bg-orange-100 text-orange-700" },
  baja: { label: "BAJA", cls: "bg-yellow-100 text-yellow-800" },
  "en-cola": { label: "En cola", cls: "bg-gray-100 text-gray-600" },
  procesando: { label: "Procesando", cls: "bg-cyan-100 text-cyan-700" },
  "por-revisar": { label: "Listo para revisar", cls: "bg-green-100 text-green-700" },
  enviado: { label: "Enviado a coordinación", cls: "bg-emerald-100 text-emerald-700" },
  error: { label: "Error", cls: "bg-red-100 text-red-700" },
};

export function StatusChip({
  estado,
  className = "",
}: {
  estado: EstadoChip;
  className?: string;
}) {
  const e = ESTADO_CHIP[estado];
  return (
    <span className={`shrink-0 px-2 py-1 rounded text-[11px] font-bold ${e.cls} ${className}`}>
      {e.label}
    </span>
  );
}
