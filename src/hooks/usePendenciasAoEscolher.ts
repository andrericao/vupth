import { useEffect, useState } from "react";

import { PagamentoPendente } from "@domain/pagamento/pendencia";
import { paymentService } from "@services/paymentService";
import { useAuthStore } from "@stores/authStore";

/**
 * lembrete-de-pendencia (CLI-35, DEC-78): na escolha de servicos, o que o
 * cliente ainda deve — para avisar ja no toque em "Entrar na fila", "Agendar"
 * ou "Pedir corte", e nao so depois do 409. Uma leitura ao abrir, como a das
 * multas; falha de rede nao trava (o 409 do servidor segue valendo).
 */
export function usePendenciasAoEscolher(): PagamentoPendente[] {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [itens, setItens] = useState<PagamentoPendente[]>([]);
  useEffect(() => {
    if (!accessToken) return;
    let vivo = true;
    paymentService
      .pendentes(accessToken)
      .then((r) => {
        if (vivo) setItens(r.data.items ?? []);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [accessToken]);
  return itens;
}
