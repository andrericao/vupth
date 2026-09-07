// Sair da fila: o que fazer quando o cancelamento falha.
//
// Ate 2026-09-07 o erro era engolido por um `catch {}` vazio e o cliente saia
// da tela de qualquer jeito — achando que tinha saido, com a vez e a multa
// ainda de pe. Engolir o erro nao e "nao atrapalhar"; e mentir sobre o que
// aconteceu.
//
// Mas nem toda falha e igual: se o atendimento JA nao esta na fila, o objetivo
// do usuario esta cumprido e prende-lo numa tela de fila que nao existe mais
// seria pior do que a falha original.

export interface ErroDeApi {
  response?: { status?: number; data?: { code?: string; message?: string } };
}

/**
 * O atendimento ja nao esta na fila? (o profissional removeu, o atendimento
 * expirou, ou um toque duplo cancelou antes). Nestes casos a saida deve
 * seguir: limpar o estado local e navegar.
 */
export function jaSaiuDaFila(error: unknown): boolean {
  const err = error as ErroDeApi | null | undefined;
  const status = err?.response?.status;
  const code = err?.response?.data?.code;
  return status === 404 || code === "CLIENT_NOT_IN_QUEUE";
}

/**
 * O que dizer ao cliente quando a saida REALMENTE falhou. A frase precisa
 * dizer o estado em que ele ficou — "erro ao cancelar" nao informa se ele
 * saiu ou nao, que e a unica coisa que importa aqui.
 */
export function mensagemDeFalhaAoSair(error: unknown): string {
  const err = error as ErroDeApi | null | undefined;
  return (
    err?.response?.data?.message ??
    "Voce continua na fila. Verifique a conexao e tente de novo."
  );
}
