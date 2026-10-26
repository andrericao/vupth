import type { CampanhaDeLink, MinhasIndicacoes } from "@services/referralService";
import { formatarReais } from "@utils/formatarReais";

// compartilhe-e-ganhe (CLI-30, DEC-113): o texto curto da tela "Indique e ganhe".

/** Campanha de link (tipo REFERRAL_BONUS), a unica que o cliente ativa com "Participar". */
export function ehCampanhaDeLink(tipo?: string | null): boolean {
  return tipo === "REFERRAL_BONUS";
}

/**
 * "2 indicados · 1 com ganho". Os campos do Backend são referred_clients e credited_clients;
 * faltando um, vale 0 (nunca "undefined indicados", promocoes-do-profissional-com-link).
 */
export function contadorDoLink(c: Pick<CampanhaDeLink, "referred_clients" | "credited_clients">): string {
  const indicados = Number(c.referred_clients) || 0;
  const ganhos = Number(c.credited_clients) || 0;
  const ind = indicados === 1 ? "1 indicado" : `${indicados} indicados`;
  return `${ind} · ${ganhos} com ganho`;
}

/**
 * O link para abrir e compartilhar, sempre com https://: sem o esquema o navegador o trata
 * como busca em vez de abrir a página (promocoes-do-profissional-com-link, André 24/10).
 */
export function linkCompleto(link: string | null | undefined): string {
  const l = (link ?? "").trim();
  if (!l) return "";
  return /^https?:\/\//i.test(l) ? l : `https://${l.replace(/^\/+/, "")}`;
}

/** O ganho que espera o Andre liberar; vazio quando nao ha. */
export function ganhoAguardando(m: Pick<MinhasIndicacoes, "pending_release"> | null): string {
  const v = m?.pending_release;
  return typeof v === "number" && v > 0 ? `${formatarReais(v)} a liberar` : "";
}

/** A mensagem do compartilhar do sistema. */
export function mensagemDoLink(c: Pick<CampanhaDeLink, "name" | "link">): string {
  return `${c.name ? `${c.name}: ` : ""}entre no Vupth por este link ${linkCompleto(c.link)}`;
}

/** Recusas do participar, em uma frase (403/409 como o cupom). */
export function mensagemDoParticipar(erro: unknown): string {
  const status = (erro as { response?: { status?: number } } | null)?.response?.status;
  if (status === 404) return "Esta campanha não está mais disponível.";
  if (status === 409) return "Você já participa desta campanha.";
  if (status === 403) return "Esta campanha não é para você.";
  return "Não deu para participar agora. Tente de novo.";
}
