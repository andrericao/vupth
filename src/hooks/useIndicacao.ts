import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { INDICACAO_CAMPANHA_KEY, INDICACAO_KEY, campanhaDoCaminho, codigoDoCaminho, descartarDepoisDaRecusa } from '@domain/indicacao';
import { fimDoErro } from '@domain/campanhas';
import { avisoDeFimDaCampanha } from '@utils/avisoDeFimDaCampanha';
import { campaignService } from '@services/campaignService';
import { referralService } from '@services/referralService';
import { useAuthStore } from '@stores/authStore';

/** O endereco aberto no navegador; no aparelho nao ha (o link abre o site). */
function caminhoDaWeb(): string {
  return Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.pathname + (window.location.search ?? '') : '';
}

/**
 * desconto-no-link-cliente (DEC-131, Backend 5a74f65): o claim so liga o convidado ao indicador e nao
 * ativa cupom. Para o desconto do 1o corte, o app resgata a campanha do link (POST /campaigns/redeem)
 * com o CODIGO DA CAMPANHA (nunca o de indicacao: da 404), achado na lista das ativas pelo id do `?c=`.
 * Best-effort: campanha fora da lista (privada), ja resgatada ou fora do ar nao travam nada.
 */
async function resgatarCupomDoLink(campanhaId: string, accessToken: string) {
  try {
    const { data } = await campaignService.listActive(accessToken);
    const codigo = (data ?? []).find((c) => c.id === campanhaId)?.code;
    if (codigo) await campaignService.redeem(codigo, accessToken);
  } catch {
    // o desconto e um extra: o claim ja valeu
  }
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
        if (campanha) await resgatarCupomDoLink(campanha, accessToken);
      } catch (erro) {
        if (!descartarDepoisDaRecusa(erro)) return; // sem rede: tenta no proximo login
        // DEC-124: o link de campanha encerrada ou esgotada abre o app e avisa.
        const fim = fimDoErro(erro);
        if (fim) avisoDeFimDaCampanha(fim);
      }
      await SecureStore.deleteItemAsync(INDICACAO_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(INDICACAO_CAMPANHA_KEY).catch(() => {});
    })();
  }, [lido, isAuthenticated, accessToken]);
}
