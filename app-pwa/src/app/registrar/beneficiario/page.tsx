"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFlow } from "../../flow-context";
import { Stepper } from "@/components/stepper";

export default function BeneficiaryPage() {
  const router = useRouter();
  const { beneficiario, setBeneficiario, profesional, setProfesional } = useFlow();
  const [prof, setProf] = useState(profesional ?? "");
  const [nombre, setNombre] = useState(beneficiario?.nombre ?? "");
  const [apellido, setApellido] = useState(beneficiario?.apellido ?? "");
  const [dni, setDni] = useState(beneficiario?.dni ?? "");

  // El profesional se recuerda entre registros (localStorage); prellenar al hidratar.
  useEffect(() => {
    // Hidratación única desde localStorage; setState acá es intencional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profesional && !prof) setProf(profesional);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profesional]);

  const valid =
    prof.trim().length > 0 &&
    nombre.trim().length > 0 &&
    apellido.trim().length > 0 &&
    dni.trim().length > 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setProfesional(prof.trim());
    setBeneficiario({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni: dni.trim(),
    });
    router.push("/grabar");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="anim-fade fixed top-0 w-full z-50 flex justify-between items-center px-container-margin h-touch-target-min bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            aria-label="Volver"
            className="p-2 -ml-2 hover:bg-surface-container-low transition-opacity active:opacity-80 rounded-full"
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
        </div>
      </header>

      <main className="flex-grow pt-20 px-container-margin pb-32 max-w-xl mx-auto w-full">
        <div className="mb-stack-lg">
          <Stepper current={2} />
        </div>

        <section className="anim-enter mb-stack-lg">
          <h1 className="font-headline-md text-headline-md text-on-surface mb-2">
            Datos del beneficiario
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Ingresá los datos de la persona que vas a registrar
          </p>
        </section>

        <form className="stagger space-y-stack-lg" id="beneficiary-form" onSubmit={onSubmit}>
          {/* Profesional que registra */}
          <div className="group">
            <label
              className="block font-label-md text-label-md text-on-surface-variant mb-2 transition-colors group-focus-within:text-primary"
              htmlFor="profesional"
            >
              Profesional que registra <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                id="profesional"
                name="profesional"
                type="text"
                placeholder="Tu nombre y apellido"
                value={prof}
                onChange={(e) => setProf(e.target.value)}
                required
                className="w-full h-14 px-4 bg-white border-2 border-outline-variant rounded-lg font-body-lg text-body-lg text-on-surface focus:border-primary focus:ring-0 transition-all outline-none"
              />
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                assignment_ind
              </span>
            </div>
          </div>

          {/* Nombre */}
          <div className="group">
            <label
              className="block font-label-md text-label-md text-on-surface-variant mb-2 transition-colors group-focus-within:text-primary"
              htmlFor="nombre"
            >
              Nombre del beneficiario <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                id="nombre"
                name="nombre"
                type="text"
                placeholder="Ej: María"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="w-full h-14 px-4 bg-white border-2 border-outline-variant rounded-lg font-body-lg text-body-lg text-on-surface focus:border-primary focus:ring-0 transition-all outline-none"
              />
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                person
              </span>
            </div>
          </div>

          {/* Apellido */}
          <div className="group">
            <label
              className="block font-label-md text-label-md text-on-surface-variant mb-2 transition-colors group-focus-within:text-primary"
              htmlFor="apellido"
            >
              Apellido del beneficiario <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                id="apellido"
                name="apellido"
                type="text"
                placeholder="Ej: García"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
                className="w-full h-14 px-4 bg-white border-2 border-outline-variant rounded-lg font-body-lg text-body-lg text-on-surface focus:border-primary focus:ring-0 transition-all outline-none"
              />
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                badge
              </span>
            </div>
          </div>

          {/* DNI */}
          <div className="group">
            <label
              className="block font-label-md text-label-md text-on-surface-variant mb-2 transition-colors group-focus-within:text-primary"
              htmlFor="dni"
            >
              DNI del beneficiario <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                id="dni"
                name="dni"
                type="number"
                inputMode="numeric"
                placeholder="Ej: 12345678"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                required
                className="w-full h-14 px-4 bg-white border-2 border-outline-variant rounded-lg font-body-lg text-body-lg text-on-surface focus:border-primary focus:ring-0 transition-all outline-none appearance-none"
              />
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                fingerprint
              </span>
            </div>
          </div>
        </form>
      </main>

      <footer className="fixed bottom-0 w-full bg-surface border-t border-outline-variant p-container-margin pb-8 z-50">
        <div className="max-w-xl mx-auto">
          <button
            form="beneficiary-form"
            type="submit"
            disabled={!valid}
            className="w-full h-14 bg-primary text-on-primary font-label-md text-label-md rounded-lg shadow-sm hover:opacity-90 active:scale-[0.97] transition-[transform,opacity] duration-150 ease-out flex items-center justify-center gap-2 disabled:opacity-50"
          >
            Continuar a Grabación
            <span className="material-symbols-outlined">mic</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
