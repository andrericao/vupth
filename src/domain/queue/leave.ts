import { mensagemDoErro } from '@domain/erros/mensagemDoErro';
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
  response?: {
    status?: number;
    data?: { code?: string; message?: string; exitPenaltyValue?: number | string | null };
  };
}

/**
 * O servidor recusou a saida porque a multa nao foi confirmada (ou foi
 * confirmada com valor menor — a multa subiu no meio). Devolve o valor que ele
 * cobra, para o app mostrar o aviso e repetir no "Sim". `null` = nao e esse erro.
 * Ciencia da multa: Backend 0caf229, em producao desde 26/09.
 */
export function multaSemCiencia(error: unknown): number | null {
  const err = error as ErroDeApi | null | undefined;
  if (err?.response?.status !== 409) return null;
  const data = err.response.data;
  if (data?.code !== "EXIT_PENALTY_NOT_ACKNOWLEDGED") return null;
  const valor = Number(data.exitPenaltyValue);
  return Number.isFinite(valor) && valor > 0 ? valor : null;
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
  return mensagemDoErro({ response: err?.response }, "Voce continua na fila. Verifique a conexao e tente de novo.");
}
