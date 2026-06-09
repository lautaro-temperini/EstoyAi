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
}

interface FlowContextValue extends FlowState {
  setTipo: (tipo: TipoRegistro) => void;
  setPrograma: (programa: Programa) => void;
  setBeneficiario: (b: Beneficiario) => void;
  reset: () => void;
}

const STORAGE_KEY = "ngo-flow";
const FlowContext = createContext<FlowContextValue | null>(null);

const EMPTY: FlowState = { tipo: null, programa: null, beneficiario: null };

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FlowState>(EMPTY);

  // Hydrate from sessionStorage so back/refresh within the flow keeps context.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as FlowState);
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
    reset: () => {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setState(EMPTY);
    },
  };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow(): FlowContextValue {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used within FlowProvider");
  return ctx;
}
