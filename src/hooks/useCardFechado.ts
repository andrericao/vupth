import { useCallback, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

const PREFIXO = "vupth_card_fechado_";

/**
 * fechar-cards-avaliacao-e-repetir (André, 22/10): o card de avaliação e o de
 * repetir corte ganham o X. Fechou, não volta para aquele atendimento (a chave
 * leva o id). O card de pagamento não usa isto: dinheiro pendente não se esconde.
 * Sem a chave (card ainda sem dono) o card fica visível.
 */
export function useCardFechado(chave: string | null | undefined): { fechado: boolean; fechar: () => void } {
  const [fechadoEm, setFechadoEm] = useState<string | null>(null);

  useEffect(() => {
    if (!chave) return;
    let vivo = true;
    Promise.resolve()
      .then(() => SecureStore.getItemAsync(PREFIXO + chave))
      .catch(() => null)
      .then((v) => {
        if (vivo && v === "1") setFechadoEm(chave);
      });
    return () => {
      vivo = false;
    };
  }, [chave]);

  const fechar = useCallback(() => {
    if (!chave) return;
    setFechadoEm(chave);
    Promise.resolve()
      .then(() => SecureStore.setItemAsync(PREFIXO + chave, "1"))
      .catch(() => {});
  }, [chave]);

  return { fechado: !!chave && fechadoEm === chave, fechar };
}
