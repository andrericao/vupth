import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { campaignService, Campanha } from "@services/campaignService";
import { useAuthStore } from "@stores/authStore";
import { separarCupons } from "@domain/campanhas";

/**
 * Os cupons ativos de quem esta logado (cupom-em-configuracoes): lidos a cada
 * vez que a tela ganha foco, para o cupom gasto ou vencido sair da escolha.
 * Sem conta ou com falha de rede, lista vazia — a escolha some.
 */
export function useMeusCupons(): Campanha[] {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [cupons, setCupons] = useState<Campanha[]>([]);
  useFocusEffect(
    useCallback(() => {
      if (!accessToken) return;
      let vivo = true;
      campaignService
        .listMine(accessToken)
        .then((r) => {
          if (vivo) setCupons(Array.isArray(r.data) ? separarCupons(r.data).ativos : []);
        })
        .catch(() => {});
      return () => {
        vivo = false;
      };
    }, [accessToken]),
  );
  return accessToken ? cupons : [];
}
