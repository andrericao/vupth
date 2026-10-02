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

/**
 * Atualiza o tempo dos servicos com o snapshot da loja (WS/refetch do
 * professionals-with-queue): o profissional editou e o cliente com a tela
 * aberta ve o tempo novo na hora. Servico fora do snapshot fica como estava.
 */
export function comTempoAtual<T extends { id: string; estimatedMinutes?: number | null }>(
  servicos: T[],
  doSnapshot: { id: string; estimatedMinutes?: number | null }[] | undefined,
): T[] {
  if (!doSnapshot?.length) return servicos;
  const tempo = new Map(doSnapshot.map((s) => [s.id, s.estimatedMinutes]));
  return servicos.map((s) => {
    const novo = tempo.get(s.id);
    return novo == null || novo === s.estimatedMinutes ? s : { ...s, estimatedMinutes: novo };
  });
}
