"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !password) return;
    try {
      sessionStorage.setItem("autenticado", "true");
    } catch {
      /* ignore */
    }
    router.replace("/registro");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-container-margin">
      <div className="anim-enter w-full max-w-sm flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-stack-lg">
          <span className="material-symbols-outlined text-on-primary text-[32px]">
            volunteer_activism
          </span>
        </div>
        <h1 className="font-display-lg text-display-lg text-on-surface mb-1 text-center">
          Pequeños Pasos
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-stack-lg text-center">
          Ingresá para registrar
        </p>

        <form className="w-full space-y-stack-md" onSubmit={onSubmit}>
          <div className="group">
            <label
              htmlFor="usuario"
              className="block font-label-md text-label-md text-on-surface-variant mb-2 transition-colors group-focus-within:text-primary"
            >
              Usuario
            </label>
            <input
              id="usuario"
              type="text"
              autoComplete="username"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full h-14 px-4 bg-white border-2 border-outline-variant rounded-lg font-body-lg text-body-lg text-on-surface focus:border-primary focus:ring-0 transition-all outline-none"
            />
          </div>

          <div className="group">
            <label
              htmlFor="password"
              className="block font-label-md text-label-md text-on-surface-variant mb-2 transition-colors group-focus-within:text-primary"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 px-4 bg-white border-2 border-outline-variant rounded-lg font-body-lg text-body-lg text-on-surface focus:border-primary focus:ring-0 transition-all outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!usuario.trim() || !password}
            className="w-full h-14 bg-primary text-on-primary font-label-md text-label-md rounded-lg shadow-sm hover:opacity-90 active:scale-[0.97] transition-[transform,opacity] duration-150 ease-out flex items-center justify-center gap-2 disabled:opacity-50"
          >
            Ingresar
            <span className="material-symbols-outlined">login</span>
          </button>
        </form>
      </div>
    </main>
  );
}
