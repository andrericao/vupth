/**
 * Minutos de um servico como o cliente ve: o tempo que o profissional
 * configurou (estimatedMinutes, Backend d1165a2). A media medida na semana
 * so entra quando a resposta nao traz o configurado; 30 e o default do Backend.
 */
export function duracaoDoServico(s: {
  estimatedMinutes?: number | null;
  weeklyAverageDurationInMinutes?: number | null;
}): number {
  return s.estimatedMinutes ?? s.weeklyAverageDurationInMinutes ?? 30;
}
