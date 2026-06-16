"use client";

/**
 * Modal de confirmación para "Enviar a coordinación". Aclara que, una vez
 * enviado, el informe solo lo puede editar el administrador. Cancelar / Aceptar.
 */
export function ConfirmEnviarModal({
  open,
  enviando,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  enviando: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 anim-fade">
      <div className="anim-enter w-full max-w-sm m-4 bg-surface-container-lowest rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-stack-sm">
          <div className="w-11 h-11 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-secondary-container">send</span>
          </div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Enviar a coordinación</h2>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant mb-stack-lg">
          Una vez enviado, el informe queda en coordinación y{" "}
          <span className="text-on-surface font-semibold">solo el administrador podrá editarlo</span>.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={enviando}
            className="flex-1 h-12 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={enviando}
            className="flex-1 h-12 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-60"
          >
            {enviando ? (
              <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
            ) : (
              "Aceptar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
