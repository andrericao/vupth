import { useEffect, useRef } from "react";

import { usePagamentosPendentes } from "@hooks/usePagamentosPendentes";
import { usePendenciaStore } from "@stores/pendenciaStore";

/**
 * lembrete-de-pendencia (CLI-35, DEC-78): a cada abertura do app, com
 * pagamento pendente, o modal "Pagar / Agora não" aparece uma vez. O cliente
 * fecha e navega normalmente; so marcar fica barrado ate quitar.
 */
export function useLembreteDePendencia() {
  const { data } = usePagamentosPendentes();
  const lembrou = useRef(false);
  useEffect(() => {
    if (lembrou.current || !data || data.length === 0) return;
    lembrou.current = true;
    usePendenciaStore.getState().avisar(data);
  }, [data]);
}
