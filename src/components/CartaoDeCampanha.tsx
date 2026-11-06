import { Campanha, campaignService } from "@services/campaignService";
import { detalhesDaCampanha } from "@domain/campanha/detalhes";
import { ehCampanhaDeLink, mensagemDoParticipar } from "@domain/compartilhe";
import { beneficioEmPortugues, fimDaCampanha, fimDoErro, validadeDoTicket, valorDoTicket } from "@domain/campanhas";
import { CartaoTicket } from "@components/CartaoTicket";
import { avisoDeFimDaCampanha } from "@utils/avisoDeFimDaCampanha";
import { useAuthStore } from "@stores/authStore";
import { alertaTipado } from "@utils/alertaTipado";

type Props = {
  campanha: Campanha;
  largura?: number;
  /** Depois de entrar na campanha de link (para a tela tirar a campanha de "Disponíveis"). */
  aoParticipar?: () => void;
};

// Uma campanha no ar, como ticket: o toque abre os detalhes; a de link oferece "Participar"
// (compartilhe-e-ganhe, DEC-113). E o card do carrossel da Home e o de Perfil > Promocoes > Disponiveis
// (promocoes-em-secoes, 05/11).
export function CartaoDeCampanha({ campanha: c, largura, aoParticipar }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);

  async function participar() {
    if (!accessToken) return;
    try {
      await campaignService.join(c.id, accessToken);
      alertaTipado("Você está dentro", "Seu link para compartilhar está em Configurações > Promoções.", [{ text: "Ok" }], {
        tipo: "informacao",
      });
      aoParticipar?.();
    } catch (erro) {
      const fim = fimDoErro(erro);
      if (fim) return avisoDeFimDaCampanha(fim);
      alertaTipado("Campanha", mensagemDoParticipar(erro), [{ text: "Ok" }], { tipo: "erro" });
    }
  }

  const deLink = ehCampanhaDeLink(c.type);
  return (
    <CartaoTicket
      testID={`campanha-${c.id}`}
      largura={largura}
      rotulo={beneficioEmPortugues(c.benefit)}
      valor={valorDoTicket(c)}
      nome={c.name ?? "Campanha"}
      detalhe={validadeDoTicket(c)}
      acao={deLink && !fimDaCampanha(c) ? { titulo: "Participar", onPress: participar, testID: `participar-${c.id}` } : undefined}
      onPress={() => {
        const fim = fimDaCampanha(c);
        if (fim) return avisoDeFimDaCampanha(fim);
        alertaTipado(
          c.name ?? "Campanha",
          detalhesDaCampanha(c) || undefined,
          deLink ? [{ text: "Participar", onPress: participar }, { text: "Fechar", style: "cancel" }] : [{ text: "Fechar" }],
          { tipo: "informacao" },
        );
      }}
    />
  );
}
