import { useEffect, useState } from "react";

import { campaignService, Campanha } from "@services/campaignService";
import { useAuthStore } from "@stores/authStore";

/**
 * As campanhas em andamento para quem esta logado (o bloco da Home). Uma
 * leitura ao abrir; sem conta ou com falha de rede, lista vazia — o bloco some.
 */
export function useCampanhasAtivas(): Campanha[] {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  useEffect(() => {
    if (!accessToken) return;
    let vivo = true;
    campaignService
      .listActive(accessToken)
      .then((r) => {
        if (vivo && Array.isArray(r.data)) setCampanhas(r.data.filter((c) => !!c.name));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [accessToken]);
  return accessToken ? campanhas : [];
}
