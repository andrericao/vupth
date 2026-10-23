import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { INDICACAO_CAMPANHA_KEY, INDICACAO_KEY, campanhaDoCaminho, codigoDoCaminho, descartarDepoisDaRecusa } from '@domain/indicacao';
import { referralService } from '@services/referralService';
import { useAuthStore } from '@stores/authStore';

/** O endereco aberto no navegador; no aparelho nao ha (o link abre o site). */
function caminhoDaWeb(): string {
  return Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.pathname + (window.location.search ?? '') : '';
}

/**
 * entrada-por-link (CLI-34): guarda o codigo de `/i/<codigo>` ao abrir e, com o
 * cliente logado (agora ou depois do cadastro), manda o POST /referrals/claim.
 * Best-effort: nada aqui aparece para o cliente nem trava a entrada.
 */
export function useIndicacao(lerCaminho: () => string = caminhoDaWeb) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  // So depois de gravar o codigo do link: senao, quem ja esta logado leria o
  // guardado antes de o novo chegar.
  const [lido, setLido] = useState(false);

  useEffect(() => {
    const codigo = codigoDoCaminho(lerCaminho());
    const campanha = campanhaDoCaminho(lerCaminho());
    (codigo
      ? SecureStore.setItemAsync(INDICACAO_KEY, codigo).then(() =>
          campanha
            ? SecureStore.setItemAsync(INDICACAO_CAMPANHA_KEY, campanha)
            : SecureStore.deleteItemAsync(INDICACAO_CAMPANHA_KEY),
        )
      : Promise.resolve())
      .catch(() => {})
      .finally(() => setLido(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!lido || !isAuthenticated || !accessToken) return;
    (async () => {
      const codigo = await SecureStore.getItemAsync(INDICACAO_KEY).catch(() => null);
      if (!codigo) return;
      const campanha = await SecureStore.getItemAsync(INDICACAO_CAMPANHA_KEY).catch(() => null);
      try {
        await referralService.claim(codigo, accessToken, campanha);
      } catch (erro) {
        if (!descartarDepoisDaRecusa(erro)) return; // sem rede: tenta no proximo login
      }
      await SecureStore.deleteItemAsync(INDICACAO_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(INDICACAO_CAMPANHA_KEY).catch(() => {});
    })();
  }, [lido, isAuthenticated, accessToken]);
}
