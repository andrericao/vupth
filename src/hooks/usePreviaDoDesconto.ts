import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { INDICACAO_CAMPANHA_KEY, INDICACAO_KEY } from '@domain/indicacao';
import { campaignService } from '@services/campaignService';

// O cofre pode falhar (ou, no jest, nao responder): sem valor, sem previa.
async function lerGuardado(chave: string): Promise<string | null> {
  try {
    return (await SecureStore.getItemAsync(chave)) ?? null;
  } catch {
    return null;
  }
}

/**
 * desconto-para-novo-cliente-no-link (André, 24/10): quem chega por um link de campanha e ainda
 * nao tem conta ve o "Valor com cupom" na escolha dos servicos, sem cadastrar. O link guardou a
 * campanha e o codigo (useIndicacao); a previa publica (GET /campaigns/{id}/preview) devolve o
 * desconto de cada servico. Sem link, sem rede ou campanha fora do ar (404): 0, a tela segue sem desconto.
 */
export function usePreviaDoDesconto(serviceItemIds: string[], ativo: boolean): number {
  const chave = serviceItemIds.join(',');
  const [previa, setPrevia] = useState<{ chave: string; desconto: number } | null>(null);
  useEffect(() => {
    if (!ativo || !chave) return;
    let vivo = true;
    (async () => {
      const campanha = await lerGuardado(INDICACAO_CAMPANHA_KEY);
      if (!campanha) return;
      const ref = await lerGuardado(INDICACAO_KEY);
      const partes = await Promise.all(
        chave.split(',').map((id) =>
          campaignService
            .preview(campanha, id, ref)
            .then((r) => Number(r.data?.discount) || 0)
            .catch(() => 0),
        ),
      );
      if (vivo) setPrevia({ chave, desconto: Math.round(partes.reduce((a, b) => a + b, 0) * 100) / 100 });
    })();
    return () => {
      vivo = false;
    };
  }, [ativo, chave]);
  return ativo && previa?.chave === chave ? previa.desconto : 0;
}
