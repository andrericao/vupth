// O contato do profissional (CLI-10 · contatos-do-profissional; Backend 02dd5ef).
//
// `contact_phone` vem em professionals-with-queue como o profissional digitou
// no Partner — nao e o telefone da conta. `null` (ou vazio) = ele nao quis
// expor, e a tela nao mostra contato nenhum.
//
// So TEXTO (Andre, 05/10): sem Ligar e sem WhatsApp. O numero aparece na tela
// "Informacoes do profissional" como o profissional escreveu.

export type ContatoDoProfissional = {
  /** O numero como o profissional escreveu. */
  exibir: string;
};

/** Sem o pais (10 ou 11 digitos: DDD + numero), o numero e do Brasil. */
function ehNumeroCompleto(digitos: string, internacional: boolean): boolean {
  if (internacional) return digitos.length >= 8;
  if (digitos.length === 10 || digitos.length === 11) return true;
  return (digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55");
}

/** Texto que nao e um telefone completo (ex.: "ligue na loja") nao vira contato. */
export function contatoDoProfissional(bruto: string | null | undefined): ContatoDoProfissional | null {
  const exibir = (bruto ?? "").trim();
  if (!exibir) return null;
  if (!ehNumeroCompleto(exibir.replace(/\D/g, ""), exibir.startsWith("+"))) return null;
  return { exibir };
}
