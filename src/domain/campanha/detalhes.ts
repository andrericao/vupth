import type { Campanha } from "@services/campaignService";
import { beneficioEmPortugues } from "@domain/campanhas";

function dia(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** O texto do toque numa campanha: o que e, o codigo (se houver), ate quando e as vagas. */
export function detalhesDaCampanha(c: Campanha): string {
  const linhas: string[] = [];
  if (c.description) linhas.push(c.description);
  else if (beneficioEmPortugues(c.benefit)) linhas.push(beneficioEmPortugues(c.benefit));
  if (c.code) linhas.push(`Código: ${c.code}`);
  if (c.ends_at && !Number.isNaN(new Date(c.ends_at).getTime())) linhas.push(`Vale até ${dia(c.ends_at)}.`);
  if (typeof c.remaining_slots === "number") {
    linhas.push(c.remaining_slots === 1 ? "Resta 1 vaga." : `Restam ${c.remaining_slots} vagas.`);
  }
  return linhas.join("\n");
}
