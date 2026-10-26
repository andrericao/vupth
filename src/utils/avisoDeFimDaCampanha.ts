import { FimDaCampanha, textoDoFim } from "@domain/campanhas";
import { alertaTipado } from "@utils/alertaTipado";

/** O modal Promoção encerrada ou Promoção esgotada (cupom e link), no formato dos alertas do app. */
export function avisoDeFimDaCampanha(fim: FimDaCampanha): void {
  const { titulo, mensagem } = textoDoFim(fim);
  alertaTipado(titulo, mensagem, [{ text: "Ok" }], { tipo: "atencao", selo: fim === "ENCERRADA" ? "Encerrada" : "Esgotada" });
}
