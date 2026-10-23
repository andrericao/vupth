import type { CampanhaDeLink, MinhasIndicacoes } from "@services/referralService";
import { formatarReais } from "@utils/formatarReais";

// compartilhe-e-ganhe (CLI-30, DEC-113): o texto curto da tela "Indique e ganhe".

/** Campanha de link (tipo REFERRAL_BONUS), a unica que o cliente ativa com "Participar". */
export function ehCampanhaDeLink(tipo?: string | null): boolean {
  return tipo === "REFERRAL_BONUS";
}

/** "2 indicados · 1 com ganho" */
export function contadorDoLink(c: Pick<CampanhaDeLink, "referred" | "credited">): string {
  const ind = c.referred === 1 ? "1 indicado" : `${c.referred} indicados`;
  return `${ind} · ${c.credited} com ganho`;
}

/** O ganho que espera o Andre liberar; vazio quando nao ha. */
export function ganhoAguardando(m: Pick<MinhasIndicacoes, "pending_release"> | null): string {
  const v = m?.pending_release;
  return typeof v === "number" && v > 0 ? `${formatarReais(v)} a liberar` : "";
}

/** A mensagem do compartilhar do sistema. */
export function mensagemDoLink(c: Pick<CampanhaDeLink, "name" | "link">): string {
  return `${c.name ? `${c.name}: ` : ""}entre no Vupth por este link ${c.link}`;
}

/** Recusas do participar, em uma frase (403/409 como o cupom). */
export function mensagemDoParticipar(erro: unknown): string {
  const status = (erro as { response?: { status?: number } } | null)?.response?.status;
  if (status === 404) return "Esta campanha não está mais disponível.";
  if (status === 409) return "Você já participa desta campanha.";
  if (status === 403) return "Esta campanha não é para você.";
  return "Não deu para participar agora. Tente de novo.";
}
