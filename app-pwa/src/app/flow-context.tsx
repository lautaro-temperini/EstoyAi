"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Programa, TipoRegistro } from "@/lib/reports/schema";

export interface Beneficiario {
  nombre: string;
  apellido: string;
  dni: string;
}

interface FlowState {
  tipo: TipoRegistro | null;
  programa: Programa | null;
  beneficiario: Beneficiario | null;
  /** Profesional que registra; persiste entre flujos para prellenarse (ver localStorage). */
  profesional: string | null;
}

interface FlowContextValue extends FlowState {
  setTipo: (tipo: TipoRegistro) => void;
  setPrograma: (programa: Programa) => void;
  setBeneficiario: (b: Beneficiario) => void;
  setProfesional: (p: string) => void;
  reset: () => void;
}

const STORAGE_KEY = "ngo-flow";
/** El profesional sobrevive al reset del flujo: se recuerda para el próximo registro. */
const PROFESIONAL_KEY = "ngo-profesional";
const FlowContext = createContext<FlowContextValue | null>(null);

const EMPTY: FlowState = { tipo: null, programa: null, beneficiario: null, profesional: null };

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FlowState>(EMPTY);

  // Hydrate from sessionStorage so back/refresh within the flow keeps context.
  // El profesional se recuerda aparte (localStorage) para prellenar el próximo registro.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const base = raw ? (JSON.parse(raw) as FlowState) : EMPTY;
      const profesional = base.profesional ?? localStorage.getItem(PROFESIONAL_KEY);
      setState({ ...base, profesional });
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: FlowState) => {
    setState(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const value: FlowContextValue = {
    ...state,
    setTipo: (tipo) => persist({ ...state, tipo }),
    setPrograma: (programa) => persist({ ...state, programa }),
    setBeneficiario: (beneficiario) => persist({ ...state, beneficiario }),
    setProfesional: (profesional) => {
      persist({ ...state, profesional });
      try {
        localStorage.setItem(PROFESIONAL_KEY, profesional);
      } catch {
        /* ignore */
      }
    },
    reset: () => {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      // Conserva el profesional recordado para el siguiente registro.
      setState({ ...EMPTY, profesional: state.profesional });
    },
  };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow(): FlowContextValue {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used within FlowProvider");
  return ctx;
}
