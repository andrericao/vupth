import type { AvisoDeAbertura, TipoDeAviso } from '@services/openWatchService';

// avisar-quando-abrir, fatia 1 (DEC-160): o que a tela precisa saber dos avisos de hoje.

/** O aviso de hoje desta loja e deste tipo (sem profissional = o da loja; com = o daquele profissional). */
export function avisoDe(
  avisos: AvisoDeAbertura[] | undefined,
  establishmentId: string,
  kind: TipoDeAviso,
  professionalId: string | null = null,
): AvisoDeAbertura | null {
  return (
    (avisos ?? []).find(
      (a) => a.establishment_id === establishmentId && a.kind === kind && (a.professional_id ?? null) === professionalId,
    ) ?? null
  );
}

/** Os que ainda vao avisar (sem fired_at): sao os que a lista "Avisos de hoje" mostra com o Cancelar. */
export function avisosPendentes(avisos: AvisoDeAbertura[] | undefined): AvisoDeAbertura[] {
  return (avisos ?? []).filter((a) => !a.fired_at);
}

/** O rotulo de cada aviso na lista de hoje. */
export function rotuloDoAviso(kind: TipoDeAviso): string {
  return kind === 'NOTIFY_OPEN' ? 'Avisar quando abrir' : 'Avisar quando a fila andar';
}
