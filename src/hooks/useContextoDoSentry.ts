import { useEffect } from "react";

import { navigationRef } from "@routes/navigationRef";
import { useAuthStore } from "@stores/authStore";
import { marcarContexto } from "@utils/sentry";

// sentry (Andre, 24/10), como o do Partner: cada evento leva o papel (cliente ou visitante) e a tela.
// Nunca nome, e-mail nem telefone. Sem DSN o marcarContexto nao faz nada.
export function useContextoDoSentry(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    marcarContexto({ papel: isAuthenticated ? "cliente" : "visitante" });
  }, [isAuthenticated]);

  useEffect(() => {
    const marcar = () => marcarContexto({ tela: (navigationRef.getCurrentRoute() as { name?: string } | undefined)?.name ?? null });
    marcar();
    return navigationRef.addListener("state", marcar);
  }, []);
}
