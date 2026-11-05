import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import {
  INDICACAO_CAMPANHA_KEY,
  INDICACAO_CUPOM_KEY,
  INDICACAO_KEY,
  caminhoDoLink,
  campanhaDoCaminho,
  codigoDoCaminho,
  descartarDepoisDaRecusa,
} from '@domain/indicacao';
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
    // 1o o code que a previa publica devolveu com o ref do link (resolve a campanha privada); senao, as ativas
    let codigo = await SecureStore.getItemAsync(INDICACAO_CUPOM_KEY).catch(() => null);
    if (!codigo) {
      const { data } = await campaignService.listActive(accessToken);
      codigo = (data ?? []).find((c) => c.id === campanhaId)?.code ?? null;
    }
    if (codigo) await campaignService.redeem(codigo, accessToken);
  } catch {
    // o desconto e um extra: o claim ja valeu
  }
}

/** De onde vem o link no aparelho: o que abriu o app e os que chegam com ele aberto. */
export interface FonteDeLinks {
  inicial: () => Promise<string | null | undefined>;
  ouvir: (aoChegar: (url: string) => void) => { remove: () => void } | null | undefined;
}

/**
 * teste-link-de-participacao (CLI-3): no aparelho o link de indicacao chega pelo Android (o esquema vupth://
 * em todo build; https://app.vupth.com na producao). Na web nao: la o caminho do navegador ja basta.
 */
const linksDoAparelho: FonteDeLinks = {
  inicial: () => (Platform.OS === 'web' ? Promise.resolve(null) : Linking.getInitialURL()),
  ouvir: (aoChegar) => (Platform.OS === 'web' ? null : Linking.addEventListener('url', ({ url }) => aoChegar(url))),
};

/** Guarda o codigo (e a campanha) do caminho. Devolve se havia link de indicacao nele. */
async function guardarDoCaminho(caminho: string): Promise<boolean> {
  const codigo = codigoDoCaminho(caminho);
  if (!codigo) return false;
  const campanha = campanhaDoCaminho(caminho);
  await SecureStore.setItemAsync(INDICACAO_KEY, codigo);
  await SecureStore.deleteItemAsync(INDICACAO_CUPOM_KEY);
  await (campanha ? SecureStore.setItemAsync(INDICACAO_CAMPANHA_KEY, campanha) : SecureStore.deleteItemAsync(INDICACAO_CAMPANHA_KEY));
  return true;
}

/**
 * entrada-por-link (CLI-34): guarda o codigo de `/i/<codigo>` ao abrir e, com o
 * cliente logado (agora ou depois do cadastro), manda o POST /referrals/claim.
 * Best-effort: nada aqui aparece para o cliente nem trava a entrada.
 */
export function useIndicacao(lerCaminho: () => string = caminhoDaWeb, links: FonteDeLinks = linksDoAparelho) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  // So depois de gravar o codigo do link: senao, quem ja esta logado leria o
  // guardado antes de o novo chegar.
  const [lido, setLido] = useState(false);
  // Um link que chega com o app aberto (e a pessoa ja logada) refaz o claim.
  const [chegou, setChegou] = useState(0);

  useEffect(() => {
    let vivo = true;
    const daWeb = lerCaminho();
    const primeiro = daWeb
      ? Promise.resolve(daWeb)
      : Promise.resolve()
          .then(() => links.inicial())
          .then((url) => caminhoDoLink(url))
          .catch(() => '');
    primeiro
      .then((caminho) => guardarDoCaminho(caminho))
      .catch(() => {})
      .finally(() => {
        if (vivo) setLido(true);
      });
    let inscricao: ReturnType<FonteDeLinks['ouvir']> = null;
    try {
      inscricao = links.ouvir((url) => {
        guardarDoCaminho(caminhoDoLink(url))
          .then((guardou) => {
            if (guardou && vivo) setChegou((n) => n + 1);
          })
          .catch(() => {});
      });
    } catch {
      // sem o ouvinte, vale o link que abriu o app
    }
    return () => {
      vivo = false;
      inscricao?.remove();
    };
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
      await SecureStore.deleteItemAsync(INDICACAO_CUPOM_KEY).catch(() => {});
    })();
  }, [lido, isAuthenticated, accessToken, chegou]);
}
