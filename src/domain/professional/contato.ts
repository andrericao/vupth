// O contato do profissional (CLI-10 · contatos-do-profissional; Backend 02dd5ef).
//
// `contact_phone` vem em professionals-with-queue como o profissional digitou
// no Partner — nao e o telefone da conta. `null` (ou vazio) = ele nao quis
// expor, e a tela nao mostra contato nenhum.

export type ContatoDoProfissional = {
  /** O numero como o profissional escreveu. */
  exibir: string;
  /** Para o Linking: "tel:+5511988887777". */
  ligar: string;
  /** "https://wa.me/5511988887777" — o WhatsApp pede o numero com o pais. */
  whatsapp: string;
};

/** Sem o pais (10 ou 11 digitos: DDD + numero), o numero e do Brasil. */
function comPais(digitos: string, internacional: boolean): string | null {
  if (internacional) return digitos.length >= 8 ? digitos : null;
  if (digitos.length === 10 || digitos.length === 11) return "55" + digitos;
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) return digitos;
  return null;
}

export function contatoDoProfissional(bruto: string | null | undefined): ContatoDoProfissional | null {
  const exibir = (bruto ?? "").trim();
  if (!exibir) return null;
  const numero = comPais(exibir.replace(/\D/g, ""), exibir.startsWith("+"));
  if (!numero) return null;
  return { exibir, ligar: `tel:+${numero}`, whatsapp: `https://wa.me/${numero}` };
}
