import { useCallback, useEffect, useState } from "react";

import { campaignService, Campanha } from "@services/campaignService";
import { referralService } from "@services/referralService";
import { fimDaCampanha, semAsQueParticipa } from "@domain/campanhas";
import { useAuthStore } from "@stores/authStore";

/** As campanhas de link em que a pessoa participa (ids). Falha = nenhuma. */
async function idsDosMeusLinks(accessToken: string): Promise<string[]> {
  try {
    const { data } = await referralService.me(accessToken);
    return Array.isArray(data?.campaigns) ? data.campaigns.map((c) => c.campaign_id) : [];
  } catch {
    return [];
  }
}

/** Os meus cupons (ativos, usados e vencidos). Falha = nenhum. */
async function meusCupons(accessToken: string): Promise<Campanha[]> {
  try {
    const { data } = await campaignService.listMine(accessToken);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * As campanhas no ar em que a pessoa ainda nao esta (promocoes-em-secoes, 05/11): o carrossel da Home e o
 * "Disponiveis" de Promocoes. Sem conta ou com falha de rede, lista vazia: o bloco some. Sem as listas da
 * pessoa, mostra todas as no ar (melhor oferecer de novo do que esconder).
 */
export function useCampanhasDisponiveis(): { campanhas: Campanha[]; recarregar: () => void } {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [vez, setVez] = useState(0);
  const recarregar = useCallback(() => setVez((n) => n + 1), []);

  useEffect(() => {
    if (!accessToken) return;
    let vivo = true;
    Promise.all([Promise.resolve().then(() => campaignService.listActive(accessToken)), meusCupons(accessToken), idsDosMeusLinks(accessToken)])
      .then(([r, meus, links]) => {
        if (!vivo || !Array.isArray(r.data)) return;
        const noAr = r.data.filter((c) => !!c.name && !fimDaCampanha(c));
        setCampanhas(semAsQueParticipa(noAr, meus, links));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [accessToken, vez]);

  return { campanhas: accessToken ? campanhas : [], recarregar };
}

/** O carrossel da Home e da fila: as campanhas no ar em que a pessoa ainda nao esta. */
export function useCampanhasAtivas(): Campanha[] {
  return useCampanhasDisponiveis().campanhas;
}
