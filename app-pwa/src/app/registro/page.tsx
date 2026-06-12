"use client";

import { useRouter } from "next/navigation";
import { useFlow } from "../flow-context";
import { Stepper } from "@/components/stepper";
import type { Programa } from "@/lib/reports/schema";
import { PROGRAMA_LABELS } from "@/lib/reports/programa";

const PROGRAMAS: {
  id: Programa;
  titulo: string;
  descripcion: string;
  icon: string;
}[] = [
  {
    id: "primera-infancia",
    titulo: PROGRAMA_LABELS["primera-infancia"],
    descripcion: "Niños y niñas de 0 a 5 años",
    icon: "child_care",
  },
  {
    id: "ninez-adolescencia",
    titulo: PROGRAMA_LABELS["ninez-adolescencia"],
    descripcion: "Chicos y chicas de 6 a 18 años",
    icon: "school",
  },
  {
    id: "oficios",
    titulo: PROGRAMA_LABELS.oficios,
    descripcion: "Adultos en capacitación laboral",
    icon: "construction",
  },
];

export default function ProgramaPage() {
  const router = useRouter();
  const { setPrograma, setTipo } = useFlow();

  const choose = (programa: Programa) => {
    setPrograma(programa);
    setTipo("individual");
    router.push("/registro/beneficiario");
  };

  return (
    <>
      <header className="anim-fade fixed top-0 w-full z-50 flex justify-between items-center px-container-margin h-touch-target-min bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-2" />
        <button
          onClick={() => router.push("/registros")}
          className="font-label-md text-label-md text-primary px-3 py-2 rounded-lg hover:bg-primary/10 flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[20px]">history</span>
          Mis registros
        </button>
      </header>

      <main className="min-h-screen pt-24 pb-12 px-container-margin max-w-lg mx-auto flex flex-col items-center">
        <div className="w-full mb-stack-lg">
          <Stepper current={1} />
        </div>

        <section className="anim-enter w-full mb-stack-lg text-center">
          <h1 className="font-display-lg text-display-lg text-on-surface mb-stack-sm">
            ¿Qué programa vas a registrar?
          </h1>
        </section>

        <div className="stagger w-full grid grid-cols-1 gap-gutter">
          {PROGRAMAS.map((p) => (
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
    </>
  );
}
