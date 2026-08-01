// Broadcast da fila do estabelecimento (`/topic/establishment/{id}/queue`).
//
// Diagnóstico 2026-07-29 (página `src/docs/ws-test.html`): o servidor STOMP
// funciona e publica este tópico a cada mudança da fila. O app assinava só o
// canal PESSOAL, então via apenas os eventos dirigidos a ele — posição e espera
// continuavam vindo do polling (até 2min de atraso). Assinando o tópico, a
// posição do cliente acompanha a fila em tempo real.
//
// O payload é o mesmo `EstablishmentWithProfessionalsResponse` do
// `professionals-with-queue`, então nada de novo no backend.

export interface BroadcastAttendance {
  id: string;
  status: string;
  estimatedMinutes?: number | null;
  scheduledTime?: string | null;
}

export interface BroadcastProfessional {
  id: string;
  waiting_list?: BroadcastAttendance[] | null;
  current_attendance?: BroadcastAttendance | null;
}

export interface QueueBroadcast {
  id: string;
  professionals?: BroadcastProfessional[] | null;
}

export interface MyQueuePosition {
  /** Status do MEU atendimento como o servidor acabou de publicar. */
  status: string;
  /** Quantas pessoas estão à minha frente naquele profissional. */
  peopleAhead: number;
  /** Minutos estimados até a minha vez (soma das durações à frente). */
  minutesAhead: number;
}

const DEFAULT_SERVICE_MINUTES = 30;

const minutesOf = (a: BroadcastAttendance): number =>
  typeof a.estimatedMinutes === 'number' && a.estimatedMinutes > 0
    ? a.estimatedMinutes
    : DEFAULT_SERVICE_MINUTES;

/**
 * Acha o MEU atendimento no broadcast e deriva posição + espera.
 *
 * Retorna `null` quando o payload não é da minha fila ou quando eu não estou
 * mais nela — de propósito NÃO concluímos "fui removido" daqui: o broadcast
 * pode chegar durante uma transição, e quem detecta cancelamento com segurança
 * é o poll do `/attendances/client/me` (que lê o status real).
 */
export function findMyPosition(
  payload: QueueBroadcast | null | undefined,
  attendanceId: string | undefined,
): MyQueuePosition | null {
  if (!payload || !attendanceId) return null;

  for (const prof of payload.professionals ?? []) {
    const list = prof.waiting_list ?? [];
    const index = list.findIndex((a) => a.id === attendanceId);
    if (index === -1) continue;

    // Espera = quem está na minha frente + o que já está em atendimento.
    const ahead = list.slice(0, index).reduce((sum, a) => sum + minutesOf(a), 0);
    const inProgress = prof.current_attendance ? minutesOf(prof.current_attendance) : 0;

    return {
      status: list[index].status,
      peopleAhead: index,
      minutesAhead: ahead + inProgress,
    };
  }

  return null;
}
