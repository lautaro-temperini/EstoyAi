"use client";

import { useRouter } from "next/navigation";
import { useFlow } from "../flow-context";
import { Stepper } from "@/components/stepper";
import type { Programa } from "@/lib/reports/schema";
import type { ProgramaDef } from "@/lib/reports/verticals";

/** Selector de programa. El catálogo lo decide la vertical del tenant (server). */
export function ProgramaPicker({ programas }: { programas: ProgramaDef[] }) {
  const router = useRouter();
  const { setPrograma, setTipo } = useFlow();

  const choose = (programa: string) => {
    setPrograma(programa as Programa);
    setTipo("individual");
    router.push("/registrar/beneficiario");
  };

  return (
    <main className="min-h-screen pt-12 md:pt-24 pb-28 md:pb-12 px-container-margin max-w-lg mx-auto flex flex-col items-center">
      <div className="w-full mb-stack-lg">
        <Stepper current={1} />
      </div>

      <section className="anim-enter w-full mb-stack-lg text-center">
        <h1 className="font-display-lg text-display-lg text-on-surface mb-stack-sm">
          ¿Qué vas a registrar?
        </h1>
      </section>

      <div className="stagger w-full grid grid-cols-1 gap-gutter">
        {programas.map((p) => (
          <button
            key={p.id}
            onClick={() => choose(p.id)}
            className="group relative overflow-hidden bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg flex flex-col items-start text-left hover:border-primary transition-[border-color,box-shadow,transform] duration-200 ease-out min-h-[140px] active:scale-[0.97]"
          >
            <div className="w-14 h-14 rounded-full bg-primary-container/10 flex items-center justify-center mb-stack-md group-hover:bg-primary-container transition-colors">
              <span className="material-symbols-outlined text-primary group-hover:text-on-primary text-[32px]">
                {p.icon}
              </span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                {p.titulo}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {p.descripcion}
              </p>
            </div>
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-primary">
                arrow_forward
              </span>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
