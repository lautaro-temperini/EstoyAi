/**
 * Stepper visual del flujo de captura: Programa → Beneficiario → Grabación.
 * Sin números ni texto — solo segmentos que se completan a medida que se avanza.
 */
interface StepperProps {
  /** Paso actual, 1 a 3. Los segmentos hasta `current` se muestran completos. */
  current: 1 | 2 | 3;
}

export function Stepper({ current }: StepperProps) {
  return (
    <div
      className="flex items-center gap-2 w-full"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={3}
      aria-valuenow={current}
      aria-label={`Paso ${current} de 3`}
    >
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
            step <= current ? "bg-primary" : "bg-surface-container-highest"
          }`}
        />
      ))}
    </div>
  );
}
