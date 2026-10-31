import { ScrollView, useWindowDimensions } from "react-native";

import { Campanha, campaignService } from "@services/campaignService";
import { detalhesDaCampanha } from "@domain/campanha/detalhes";
import { ehCampanhaDeLink, mensagemDoParticipar } from "@domain/compartilhe";
import { beneficioEmPortugues, fimDaCampanha, fimDoErro, validadeDoTicket, valorDoTicket } from "@domain/campanhas";
import { CartaoTicket } from "@components/CartaoTicket";
import { avisoDeFimDaCampanha } from "@utils/avisoDeFimDaCampanha";
import { useAuthStore } from "@stores/authStore";
import { alertaTipado } from "@utils/alertaTipado";

/** Um slide que não é campanha: um aviso no mesmo card (ex.: "Opções · clique em Opções caso não consiga chegar"). */
export type SlideDeAviso = { id: string; valor: string; nome: string; detalhe?: string };

type Props = { campanhas: Campanha[]; avisos?: SlideDeAviso[] };

// Bloco da Home que so existe quando ha campanha criada no Painel; com mais de
// uma, rola de lado. O titulo e o nome que o Andre da a campanha. O toque abre
// os detalhes (cupom e compartilhar ganham destino proprio depois).
// ticket-picote-so-na-esquerda (André, 24/10): vão de 12 px entre os cards; o picote (só à esquerda) não bate no vizinho.
const ESPACO_ENTRE_CARDS = 12;

export function CarrosselDeCampanhas({ campanhas, avisos = [] }: Props) {
  const { width } = useWindowDimensions();
  const accessToken = useAuthStore((s) => s.accessToken);

  // compartilhe-e-ganhe (DEC-113): na campanha de link o toque oferece "Participar";
  // o link pessoal fica em Configuracoes > Promocoes.
  async function participar(c: Campanha) {
    if (!accessToken) return;
    try {
      await campaignService.join(c.id, accessToken);
      alertaTipado("Você está dentro", "Seu link para compartilhar está em Configurações > Promoções.", [{ text: "Ok" }], {
        tipo: "informacao",
      });
    } catch (erro) {
      const fim = fimDoErro(erro);
      if (fim) return avisoDeFimDaCampanha(fim);
      alertaTipado("Campanha", mensagemDoParticipar(erro), [{ text: "Ok" }], { tipo: "erro" });
    }
  }

  const total = campanhas.length + avisos.length;
  if (total === 0) return null;
  const unica = total === 1;
  const largura = unica ? width - 32 : Math.max(width - 64, 220);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={unica ? undefined : largura + ESPACO_ENTRE_CARDS}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, gap: ESPACO_ENTRE_CARDS }}
      testID="campanhas-da-home"
    >
      {campanhas.map((c) => (
        <CartaoTicket
          key={c.id}
          testID={`campanha-${c.id}`}
          largura={largura}
          rotulo={beneficioEmPortugues(c.benefit)}
          valor={valorDoTicket(c)}
          nome={c.name ?? "Campanha"}
          detalhe={validadeDoTicket(c)}
          acao={ehCampanhaDeLink(c.type) && !fimDaCampanha(c) ? { titulo: "Participar", onPress: () => participar(c), testID: `participar-${c.id}` } : undefined}
          onPress={() => {
            const fim = fimDaCampanha(c);
            if (fim) return avisoDeFimDaCampanha(fim);
            alertaTipado(
              c.name ?? "Campanha",
              detalhesDaCampanha(c) || undefined,
              ehCampanhaDeLink(c.type)
                ? [{ text: "Participar", onPress: () => participar(c) }, { text: "Fechar", style: "cancel" }]
                : [{ text: "Fechar" }],
              { tipo: "informacao" },
            );
          }}
        />
      ))}
      {avisos.map((a) => (
        <CartaoTicket key={a.id} testID={`aviso-${a.id}`} largura={largura} valor={a.valor} nome={a.nome} detalhe={a.detalhe} />
      ))}
    </ScrollView>
  );
}
