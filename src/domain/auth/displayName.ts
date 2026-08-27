/**
 * Como o app CHAMA a pessoa na tela.
 *
 * O cadastro do cliente pede so e-mail e senha (ver a tela "Completar
 * perfil"), entao `first_name` vazio e o caso NORMAL, nao a excecao. Duas
 * telas precisavam lidar com isso e cada uma lidava de um jeito:
 *
 *  · Configuracoes caia no apelido do e-mail;
 *  · a Home caia em "Estabelecimentos" — que e EXATAMENTE o que um visitante
 *    ve. Resultado: quem estava logado sem nome via a mesma tela de quem nao
 *    tinha entrado, e concluia que o login nao funcionou. Aconteceu de
 *    verdade, no teste visual de 2026-08-26.
 *
 * A sessao precisa APARECER. Sem nome, o apelido do e-mail ja e alguma coisa
 * dela — e diferente do que o visitante ve, que e o que importa aqui.
 */
export type ComNome = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

/** Primeiro nome, ou o apelido do e-mail. Vazio se nao houver nem e-mail. */
export function primeiroNome(user?: ComNome | null): string {
  const cadastrado = user?.first_name?.trim().split(/\s+/)[0];
  if (cadastrado) return cadastrado;
  return user?.email?.split("@")[0]?.trim() ?? "";
}

/** Nome completo pra cabecalho de identidade; nunca devolve vazio. */
export function nomeDeExibicao(user?: ComNome | null): string {
  const cadastrado = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  return cadastrado || primeiroNome(user) || "Sua conta";
}
