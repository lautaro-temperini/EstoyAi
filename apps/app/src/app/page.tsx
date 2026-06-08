"use client";

import { useRouter } from "next/navigation";
import { useFlow } from "./flow-context";
import { LlmConfig } from "@/components/llm-config";

const IS_DEV = process.env.NODE_ENV === "development";

export default function RecordTypePage() {
  const router = useRouter();
  const { setTipo } = useFlow();

  const choose = (tipo: "individual" | "grupal") => {
    setTipo(tipo);
    router.push(tipo === "individual" ? "/registro" : "/grabar");
  };

  return (
    <>
      <header className="anim-fade fixed top-0 w-full z-50 flex justify-between items-center px-container-margin h-touch-target-min bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-2" />
        {IS_DEV && <LlmConfig />}
      </header>

      <main className="min-h-screen pt-24 pb-12 px-container-margin max-w-lg mx-auto flex flex-col items-center">
        <section className="anim-enter w-full mb-stack-lg text-center">
          <h1 className="font-display-lg text-display-lg text-on-surface mb-stack-sm">
            ¿Qué vas a registrar hoy?
          </h1>
        </section>

        <div className="stagger w-full grid grid-cols-1 gap-gutter">
          <button
            onClick={() => choose("individual")}
            className="group relative overflow-hidden bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg flex flex-col items-start text-left hover:border-primary transition-[border-color,box-shadow,transform] duration-200 ease-out min-h-[180px] active:scale-[0.97]"
          >
            <div className="w-14 h-14 rounded-full bg-primary-container/10 flex items-center justify-center mb-stack-md group-hover:bg-primary-container transition-colors">
              <span className="material-symbols-outlined text-primary group-hover:text-on-primary text-[32px]">
                person
              </span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                Beneficiario Individual
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Registro, actualización de datos y evolución de la persona
              </p>
            </div>
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-primary">
                arrow_forward
              </span>
            </div>
          </button>

          <button
            onClick={() => choose("grupal")}
            className="group relative overflow-hidden bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg flex flex-col items-start text-left hover:border-secondary transition-[border-color,box-shadow,transform] duration-200 ease-out min-h-[180px] active:scale-[0.97]"
          >
            <div className="w-14 h-14 rounded-full bg-secondary-container/20 flex items-center justify-center mb-stack-md group-hover:bg-secondary transition-colors">
              <span className="material-symbols-outlined text-secondary group-hover:text-on-secondary text-[32px]">
                groups
              </span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                Actividad Grupal
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Regristro de talleres, entregas comunitarias o capacitaciones.
              </p>
            </div>
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-secondary">
                groups
              </span>
            </div>
          </button>
        </div>
      </main>
    </>
  );
}
